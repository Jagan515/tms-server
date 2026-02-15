const studentDao = require('../dao/studentDao');
const batchDao = require('../dao/batchDao');
const teacherDao = require('../dao/teacherDao');
const announcementDao = require('../dao/announcementDao');
const feeService = require('../services/feeService');
const attendanceService = require('../services/attendanceService');
const Student = require('../models/Student');
const User = require('../models/User');
const Fee = require('../models/Fee');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const Parent = require('../models/Parent');
const Batch = require('../models/Batch');

const dashboardController = {
    teacherDashboard: async (request, response) => {
        try {
            const teacherId = request.user._id;

            const [
                studentsCount,
                batchesCount,
                announcements,
                defaulters,
                recentMarks
            ] = await Promise.all([
                studentDao.countByTeacher(teacherId),
                batchDao.countByTeacher(teacherId),
                announcementDao.getAnnouncementsByTeacher(teacherId, 5),
                feeService.getDefaulters(teacherId, 1),
                Marks.find({ teacherId }).sort({ createdAt: -1 }).limit(5).populate({
                    path: 'studentId',
                    populate: { path: 'userId', select: 'name' }
                })
            ]);

            const attendanceStats = await Attendance.aggregate([
                { $match: { teacherId: new (require('mongoose').Types.ObjectId)(teacherId) } },
                { $unwind: '$records' },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } }
                    }
                }
            ]);

            const attendancePercent = attendanceStats.length > 0
                ? ((attendanceStats[0].present / attendanceStats[0].total) * 100).toFixed(1)
                : 0;

            const totalPendingFees = defaulters.reduce((acc, d) => acc + (d.totalPending || 0), 0);

            // Calculate low attendance count (students < 75%)
            const batches = await require('../models/Batch').find({ teacherId });
            const studentIds = await require('../models/Student').find({ teacherId }).distinct('_id');
            let lowAttendanceCount = 0;
            for (const sId of studentIds) {
                const stats = await attendanceService.getStudentStats(sId);
                if (stats.totalSessions > 0 && parseFloat(stats.percentage) < 75) {
                    lowAttendanceCount++;
                }
            }

            return response.status(200).json({
                totalStudents: studentsCount,
                totalBatches: batchesCount,
                attendanceRate: `${attendancePercent}%`,
                lowAttendanceCount,
                pendingFees: { amount: totalPendingFees },
                recentAnnouncements: announcements,
                recentMarks: recentMarks,
                topPerformers: [] // Add placeholder to prevent front-end maps from crashing if missing
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({
                message: 'Internal server error'
            });
        }
    },

    systemDashboard: async (request, response) => {
        try {
            const [
                teacherCount,
                studentCount,
                parentCount,
                batchCount,
                totalRevenue
            ] = await Promise.all([
                teacherDao.countTeachers(),
                Student.countDocuments(),
                Parent.countDocuments(),
                Batch.countDocuments(),
                Fee.aggregate([
                    { $match: { status: 'paid' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ])
            ]);

            return response.status(200).json({
                stats: {
                    totalTeachers: teacherCount,
                    totalStudents: studentCount,
                    totalParents: parentCount,
                    activeBatches: batchCount,
                    totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0
                },
                systemHealth: {
                    database: 'Connected',
                    emailService: 'Operational',
                    storage: '24 GB / 50 GB (48%)',
                    lastBackup: '2 hours ago'
                }
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({
                message: 'Internal server error'
            });
        }
    },

    studentDashboard: async (request, response) => {
        try {
            const userId = request.user._id;
            const student = await Student.findOne({ userId }).populate('batchId');
            if (!student) return response.status(404).json({ message: 'Student profile not found' });

            const studentId = student._id;

            const [
                attendanceStats,
                marksReport,
                feeSummary,
                teacherInfo,
                recentActivity,
                nextUnpaidFee
            ] = await Promise.all([
                attendanceService.getStudentStats(studentId),
                require('../services/marksService').getStudentMarksReport(studentId),
                feeService.getPendingSummary(studentId),
                User.findById(student.teacherId).select('name email'),
                Attendance.find({ 'records.studentId': studentId }).sort({ date: -1 }).limit(5),
                Fee.findOne({ studentId, status: 'unpaid' }).sort({ year: 1, month: 1 })
            ]);

            // Transform attendance for recent activity
            const activities = recentActivity.map(a => {
                const record = a.records.find(r => r.studentId.toString() === studentId.toString());
                return {
                    type: 'attendance',
                    date: a.date,
                    status: record.status,
                    label: `Marked ${record.status}`
                };
            });

            return response.status(200).json({
                stats: {
                    attendance: {
                        percentage: attendanceStats.percentage,
                        presentCount: attendanceStats.presentDays,
                        totalSessions: attendanceStats.totalSessions
                    },
                    performance: {
                        schoolAverage: marksReport.summary.schoolAverage,
                        tuitionAverage: marksReport.summary.tuitionAverage
                    },
                    fees: {
                        pendingAmount: feeSummary.totalPending,
                        nextDueDate: nextUnpaidFee ? nextUnpaidFee.dueDate : null
                    }
                },
                teacher: {
                    name: teacherInfo.name,
                    email: teacherInfo.email,
                    phone: '+91-XXXXXXXXXX' // Placeholder or fetch from Teacher model
                },
                recentActivity: activities
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    }
};

module.exports = dashboardController;
