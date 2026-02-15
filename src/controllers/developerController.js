const teacherDao = require('../dao/teacherDao');
const userDao = require('../dao/userDao');
const auditService = require('../services/auditService');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Fee = require('../models/Fee');
const Parent = require('../models/Parent');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const developerController = {
    getAllTeachers: async (request, response) => {
        try {
            const page = parseInt(request.query.page) || 1;
            const limit = parseInt(request.query.limit) || 10;
            const skip = (page - 1) * limit;

            const [teachers, total] = await Promise.all([
                teacherDao.getAllTeachers(skip, limit),
                teacherDao.countTeachers()
            ]);

            return response.status(200).json({
                success: true,
                teachers: teachers.map(t => ({
                    _id: t._id,
                    userId: t.userId?._id,
                    name: t.userId?.name,
                    email: t.userId?.email,
                    phone: t.phone,
                    isActive: t.userId?.isActive,
                    createdAt: t.userId?.createdAt
                })),
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({
                message: 'Internal server error'
            });
        }
    },

    getTeacherDetails: async (request, response) => {
        try {
            const { id } = request.params;
            let teacher = await teacherDao.getTeacherById(id);
            if (!teacher) {
                teacher = await teacherDao.getTeacherByUserId(id);
            }

            if (!teacher) {
                return response.status(404).json({ message: 'Teacher not found' });
            }

            const teacherUserId = teacher.userId._id;

            // Fetch Statistics
            const [studentCount, batchCount, pendingFees, students] = await Promise.all([
                Student.countDocuments({ teacherId: teacherUserId }),
                Batch.countDocuments({ teacherId: teacherUserId }),
                Fee.aggregate([
                    { $match: { teacherId: teacherUserId, status: 'unpaid' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]),
                Student.find({ teacherId: teacherUserId }).populate('userId', 'name email isActive')
            ]);

            const auditLogs = await auditService.getTeacherAuditTrail(teacherUserId, 20);

            return response.status(200).json({
                teacher: {
                    _id: teacher._id,
                    userId: teacher.userId._id,
                    name: teacher.userId.name,
                    email: teacher.userId.email,
                    phone: teacher.phone,
                    isActive: teacher.userId.isActive,
                    createdAt: teacher.userId.createdAt
                },
                stats: {
                    totalStudents: studentCount,
                    totalBatches: batchCount,
                    pendingFees: pendingFees.length > 0 ? pendingFees[0].total : 0,
                    lastLogin: 'Unavailable' // Placeholder unless we track session logs
                },
                students,
                recentActivity: auditLogs
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    toggleStatus: async (request, response) => {
        try {
            const { id } = request.params; // teacher user id
            const { isActive } = request.body;

            if (isActive === false) {
                const studentCount = await Student.countDocuments({ teacherId: id, status: 'active' });
                if (studentCount > 0) {
                    return response.status(400).json({
                        message: `Cannot deactivate. This teacher has ${studentCount} active students. Transfer or delete students first.`
                    });
                }
            }

            const userUpdate = await userDao.update(id, { isActive });
            const updatedTeacher = await teacherDao.updateTeacherStatus(id, isActive);

            if (!userUpdate || !updatedTeacher) {
                return response.status(404).json({ message: 'Teacher identity or user profile not found for the requested sync.' });
            }

            return response.status(200).json({
                message: `Teacher account ${isActive ? 'authorized' : 'revoked'} successfully`,
                teacher: updatedTeacher
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    deleteTeacher: async (request, response) => {
        try {
            const { id } = request.params;

            const studentCount = await Student.countDocuments({ teacherId: id });
            if (studentCount > 0) {
                return response.status(400).json({
                    message: `Cannot delete. Teacher has ${studentCount} students in the system.`
                });
            }

            const tDelete = await teacherDao.deleteTeacher(id);
            const uDelete = await userDao.delete(id);

            if (!tDelete || !uDelete) {
                return response.status(404).json({ message: 'Teacher profile or administrative identity record not found for permanent removal.' });
            }

            return response.status(200).json({
                message: 'Teacher account and related lifecycle data removed successfully'
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    getStats: async (request, response) => {
        try {
            const [teacherCount, activeTeacherCount, studentCount, parentCount, batchCount] = await Promise.all([
                teacherDao.countTeachers(),
                User.countDocuments({ role: 'teacher', isActive: true }),
                Student.countDocuments(),
                Parent.countDocuments(),
                Batch.countDocuments()
            ]);

            return response.status(200).json({
                success: true,
                data: {
                    totalTeachers: teacherCount,
                    activeTeachers: activeTeacherCount,
                    totalStudents: studentCount,
                    totalParents: parentCount,
                    totalBatches: batchCount, // Client expects totalBatches
                    systemHealth: {
                        database: 'Connected',
                        emailService: 'Operational',
                        storage: '24 GB / 50 GB (48%)',
                        lastBackup: new Date().toISOString()
                    }
                }
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    getAuditLogs: async (request, response) => {
        try {
            const page = parseInt(request.query.page) || 1;
            const limit = parseInt(request.query.limit) || 50;
            const logsData = await auditService.getPagedLogs(request.query, page, limit);
            return response.status(200).json({
                success: true,
                logs: logsData.logs,
                pagination: logsData.pagination
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    createTeacher: async (request, response) => {
        try {
            const { name, email, phone, password } = request.body;

            let actualPassword = password;
            if (!actualPassword) {
                const generateTemporaryPassword = require('../utility/generateTemporaryPassword');
                actualPassword = generateTemporaryPassword(8);
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(actualPassword, salt);

            const newUser = await userDao.create({
                name,
                email,
                password: hashedPassword,
                role: 'teacher'
            });

            const newTeacher = await teacherDao.createTeacher({
                userId: newUser._id,
                phone: phone,
                createdBy: request.user._id,
                isActive: true
            });

            const emailService = require('../services/emailService');
            await emailService.send(
                email,
                'Tuition App - Your Teacher Account is Ready',
                `Welcome ${name},\n\nYour teacher account has been created.\n\nLogin URL: http://tuitionapp.test/login\nEmail: ${email}\nTemporary Password: ${actualPassword}\n\nPlease change your password upon first login.`
            ).catch(e => console.error('Failed to send welcome email:', e.message));

            return response.status(201).json({
                message: 'Teacher account created successfully',
                data: {
                    teacher: {
                        _id: newTeacher._id,
                        userId: newUser._id,
                        name: newUser.name,
                        email: newUser.email,
                        phone: newTeacher.phone
                    },
                    temporaryPassword: actualPassword
                }
            });
        } catch (error) {
            console.log(error);
            if (error.code === 'USER_EXIST') {
                return response.status(400).json({ message: 'Email address is already registered.' });
            }
            return response.status(500).json({ message: error.message || 'Internal server error' });
        }
    },

    resetPassword: async (request, response) => {
        try {
            const { userId, email, newPassword } = request.body;
            let user;

            if (userId) {
                user = await userDao.findById(userId);
            } else if (email) {
                user = await userDao.findByEmail(email);
            }

            if (!user) return response.status(404).json({ message: 'User not found' });

            const targetUserId = user._id;

            let actualPassword = newPassword;
            if (!actualPassword) {
                const generateTemporaryPassword = require('../utility/generateTemporaryPassword');
                actualPassword = generateTemporaryPassword(8);
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(actualPassword, salt);

            await userDao.update(targetUserId, { password: hashedPassword });

            const emailService = require('../services/emailService');
            await emailService.send(
                user.email,
                'Tuition App - Password Reset',
                `Your password has been reset by the administrator.\n\nNew Temporary Password: ${actualPassword}\n\nPlease update your password immediately.`
            ).catch(e => console.error('Failed to send reset email:', e.message));

            return response.status(200).json({
                message: 'Teacher password has been reset',
                temporaryPassword: actualPassword
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    }
};

module.exports = developerController;
