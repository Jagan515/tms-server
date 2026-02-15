const mongoose = require('mongoose');
const Parent = require('../models/Parent');
const Student = require('../models/Student');
const Announcement = require('../models/Announcement');
const attendanceService = require('../services/attendanceService');
const feeService = require('../services/feeService');
const marksService = require('../services/marksService');
const User = require('../models/User');

function toObjectId(id) {
    if (!id) return null;
    if (id instanceof mongoose.Types.ObjectId) return id;
    try {
        return new mongoose.Types.ObjectId(id);
    } catch {
        return null;
    }
}

const parentController = {
    getChildren: async (request, response) => {
        try {
            const userId = toObjectId(request.user._id);
            if (!userId) return response.status(401).json({ message: 'Invalid session' });

            const parent = await Parent.findOne({ userId }).populate({
                path: 'studentIds',
                populate: { path: 'userId', select: 'name' }
            });

            if (!parent) return response.status(404).json({ message: 'Parent profile not set up. Please contact administration.' });

            const childrenData = await Promise.all(parent.studentIds.map(async (student) => {
                const [attendance, marks, fees] = await Promise.all([
                    attendanceService.getStudentStats(student._id),
                    marksService.getStudentMarksReport(student._id),
                    feeService.getPendingSummary(student._id)
                ]);

                return {
                    _id: student._id,
                    name: student.userId?.name || 'Student',
                    registrationNumber: student.registrationNumber,
                    class: student.class,
                    quickStats: {
                        attendance: attendance?.percentage ?? 0,
                        schoolAverage: marks?.summary?.schoolAverage ?? 0,
                        tuitionAverage: marks?.summary?.tuitionAverage ?? 0,
                        pendingFees: fees?.totalPending ?? 0
                    }
                };
            }));

            return response.status(200).json(childrenData);
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

        getChildDashboard: async (request, response) => {
            try {
                const userId = toObjectId(request.user._id);
                if (!userId) return response.status(401).json({ message: 'Invalid session' });

                const { studentId } = request.params;
                const parent = await Parent.findOne({ userId });
                if (!parent) return response.status(404).json({ message: 'Parent profile not set up. Please contact administration.' });

                const hasAccess = parent.studentIds.some(
                    (id) => (id && id.toString ? id.toString() : String(id)) === String(studentId)
                );
                if (!hasAccess) {
                    return response.status(403).json({ message: 'Unauthorized access to this child data' });
                }

            const student = await Student.findById(studentId).populate('userId', 'name').populate('batchId');

            const now = new Date();
            const [attendanceStats, marksReport, feesSummary, paymentHistory, attendanceHistory, announcements, teacher] = await Promise.all([
                attendanceService.getStudentStats(studentId),
                marksService.getStudentMarksReport(studentId),
                feeService.getPendingSummary(studentId),
                feeService.getPaymentHistory(studentId),
                attendanceService.getStudentCalendarView(studentId, now.getMonth() + 1, now.getFullYear()),
                Announcement.find({ $or: [{ targetAudience: 'all' }, { targetAudience: 'parents' }] }).sort({ createdAt: -1 }).limit(10).lean(),
                User.findById(student.teacherId).select('name email')
            ]);

            const attendanceHistoryForClient = (attendanceHistory || []).map((s) => ({
                _id: s.id,
                date: s.date,
                day: s.date ? new Date(s.date).toLocaleDateString('en-US', { weekday: 'short' }) : '',
                status: (s.status === 'present' ? 'Present' : 'Absent')
            }));

            const recentGrade = marksReport.summary && (marksReport.summary.schoolAverage || marksReport.summary.tuitionAverage)
                ? (parseFloat(marksReport.summary.schoolAverage) || parseFloat(marksReport.summary.tuitionAverage) || 0).toFixed(0) + '%'
                : 'N/A';

            return response.status(200).json({
                child: {
                    name: student.userId.name,
                    regNo: student.registrationNumber,
                    class: student.class,
                    batch: student.batchId ? student.batchId.name : 'No batch assigned'
                },
                stats: {
                    attendance: parseFloat(attendanceStats.percentage) || 0,
                    pendingFees: feesSummary.totalPending || 0,
                    recentGrade,
                    nextExam: 'TBD',
                    performance: {
                        schoolAverage: marksReport.summary?.schoolAverage,
                        tuitionAverage: marksReport.summary?.tuitionAverage
                    }
                },
                attendance: {
                    history: attendanceHistoryForClient,
                    stats: {
                        percentage: attendanceStats.percentage,
                        presentDays: attendanceStats.presentDays,
                        totalSessions: attendanceStats.totalSessions,
                        thisMonthPct: attendanceStats.percentage
                    }
                },
                marks: {
                    school: marksReport.schoolMarks || [],
                    tuition: marksReport.tuitionMarks || []
                },
                fees: {
                    history: paymentHistory || []
                },
                announcements: announcements || [],
                teacher: teacher ? {
                    name: teacher.name,
                    email: teacher.email,
                    phone: '+91-XXXXXXXXXX'
                } : { name: '', email: '', phone: '' }
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    getCombinedFees: async (request, response) => {
        try {
            const userId = toObjectId(request.user._id);
            if (!userId) return response.status(401).json({ message: 'Invalid session' });

            const parent = await Parent.findOne({ userId }).populate({
                path: 'studentIds',
                populate: { path: 'userId', select: 'name' }
            });

            if (!parent) return response.status(404).json({ message: 'Parent profile not set up. Please contact administration.' });

            const feeData = await Promise.all(parent.studentIds.map(async (student) => {
                const summary = await feeService.getPendingSummary(student._id);
                const history = await feeService.getPaymentHistory(student._id);

                return {
                    studentId: student._id,
                    name: student.userId.name,
                    regNo: student.registrationNumber,
                    pendingAmount: summary.totalPending,
                    lastPayment: history.length > 0 ? history[0] : null
                };
            }));

            const totalPending = feeData.reduce((acc, curr) => acc + curr.pendingAmount, 0);

            return response.status(200).json({
                childrenFees: feeData,
                totalPendingAcrossAll: totalPending
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    getProfile: async (request, response) => {
        try {
            const userId = toObjectId(request.user._id);
            if (!userId) return response.status(401).json({ message: 'Invalid session' });

            const user = await User.findById(userId).select('name email');
            const parent = await Parent.findOne({ userId }).populate({
                path: 'studentIds',
                populate: [
                    { path: 'userId', select: 'name' },
                    { path: 'teacherId', select: 'name' }
                ]
            });

            return response.status(200).json({
                profile: {
                    name: user.name,
                    email: user.email,
                    phone: parent.phone
                },
                children: parent.studentIds.map(s => ({
                    _id: s._id,
                    name: s.userId.name,
                    regNo: s.registrationNumber,
                    class: s.class,
                    teacher: s.teacherId.name
                }))
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    }
};

module.exports = parentController;
