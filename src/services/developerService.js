const bcrypt = require('bcryptjs');

const userDao = require('../dao/userDao');
const teacherDao = require('../dao/teacherDao');
const emailService = require('./emailService');
const generateTemporaryPassword = require('../utility/generateTemporaryPassword');

const { TEACHER_ROLE } = require('../utility/userRoles');

const mongoose = require('mongoose');

// Import Models for Cascade Delete
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Marks = require('../models/Marks');
const Attendance = require('../models/Attendance');
const Fee = require('../models/Fee');
const Announcement = require('../models/Announcement');
const Parent = require('../models/Parent');
const User = require('../models/User');

const developerService = {

    // ... existing methods ...

    deleteTeacher: async (teacherId) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const teacher = await teacherDao.findById(teacherId);
            if (!teacher) {
                throw new Error('Teacher not found');
            }

            const teacherUserId = teacher.userId._id;

            // 1. Delete Resources liked to Teacher
            await Marks.deleteMany({ teacherId: teacherUserId }).session(session);
            await Attendance.deleteMany({ teacherId: teacherUserId }).session(session);
            await Fee.deleteMany({ teacherId: teacherUserId }).session(session);
            await Announcement.deleteMany({ teacherId: teacherUserId }).session(session);
            await Batch.deleteMany({ teacherId: teacherUserId }).session(session);

            // 2. Find Students linked to Teacher
            const students = await Student.find({ teacherId: teacherUserId }).session(session);
            const studentUserIds = students.map(s => s.userId);
            const studentIds = students.map(s => s._id);

            // 3. Unlink Students from Parents (or manage Parent deletion if business logic requires)
            // Strategy: Keep Parents, just remove student reference. 
            // If parent has no other students, they might be orphaned users, but better safe.
            await Parent.updateMany(
                { studentIds: { $in: studentIds } },
                { $pull: { studentIds: { $in: studentIds } } }
            ).session(session);

            // 4. Delete Students and their User accounts
            await Student.deleteMany({ teacherId: teacherUserId }).session(session);
            await User.deleteMany({ _id: { $in: studentUserIds } }).session(session);

            // 5. Delete Teacher and Teacher User
            // Direct model delete since teacherDao might not have transactional support yet
            const Teacher = require('../models/Teacher');
            await Teacher.findByIdAndDelete(teacherId).session(session);

            await User.findByIdAndDelete(teacherUserId).session(session);

            await session.commitTransaction();
            session.endSession();
            return { success: true };

        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    },

    getDashboardStats: async () => {

        const totalTeachers = await userDao.countByRole(TEACHER_ROLE);
        const activeTeachers = await userDao.countActiveByRole(TEACHER_ROLE);
        const totalStudents = await userDao.countByRole('student');
        const activeStudents = await userDao.countActiveByRole('student');
        const totalParents = await userDao.countByRole('parent');

        return {
            teachers: { total: totalTeachers, active: activeTeachers },
            students: { total: totalStudents, active: activeStudents },
            parents: { total: totalParents }
        };
    },

    createTeacher: async (data, developerId) => {

        const tempPassword = generateTemporaryPassword(8);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        const user = await userDao.create({
            name: data.name,
            email: data.email,
            password: hashedPassword,
            role: TEACHER_ROLE,
            adminId: developerId
        });

        const teacher = await teacherDao.create({
            userId: user._id,
            createdBy: developerId
        });

        await emailService.send(
            data.email,
            'Teacher Account Created',
            `Your login password is: ${tempPassword}`
        );

        return teacher;
    },

    resetUserPassword: async (email) => {

        const user = await userDao.findByEmail(email);

        if (!user) {
            throw new Error('User not found');
        }

        const tempPassword = generateTemporaryPassword(8);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        user.password = hashedPassword;
        await user.save();

        await emailService.send(
            email,
            'Password Reset',
            `Your new password is: ${tempPassword}`
        );

        return true;
    },

    getAllTeachers: async () => {
        const teachers = await teacherDao.findAll();
        // Flatten the structure for easier frontend consumption
        return teachers.map(t => ({
            _id: t._id,
            userId: t.userId._id,
            name: t.userId.name,
            email: t.userId.email,
            isActive: t.userId.isActive,
            createdAt: t.userId.createdAt,
            joinedAt: t.userId.createdAt
        }));
    },

    toggleTeacherStatus: async (teacherId) => {
        const teacher = await teacherDao.findById(teacherId);
        if (!teacher) return null;

        return await userDao.toggleStatus(teacher.userId._id);
    }

};

module.exports = developerService;
