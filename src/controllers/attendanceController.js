const attendanceService = require('../services/attendanceService');
const Student = require('../models/Student');

const attendanceController = {
    // Session-based Attendance
    getSession: async (request, response) => {
        try {
            const { batchId, date } = request.query;
            const teacherId = request.user._id;

            if (!batchId || !date) {
                return response.status(400).json({ message: 'Batch ID and Date are required' });
            }

            const data = await attendanceService.getOrCreateSession(batchId, date, teacherId);
            return response.status(200).json(data);
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    // Marks a single student for a session (Auto-save support)
    patchRecord: async (request, response) => {
        try {
            const teacherId = request.user._id;
            const record = await attendanceService.updateRecord(request.body, teacherId);

            return response.status(200).json({
                message: 'Record updated successfully',
                record: record
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: error.message || 'Internal server error' });
        }
    },

    // Bulk marks entire batch present/absent
    bulkPatch: async (request, response) => {
        try {
            const teacherId = request.user._id;
            const attendance = await attendanceService.bulkUpdateRecords(request.body, teacherId);

            return response.status(200).json({
                message: `Whole batch marked ${request.body.status}`,
                attendance: attendance
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: error.message || 'Internal server error' });
        }
    },

    // Get Attendance History (Batch-specific or Global)
    getHistory: async (request, response) => {
        try {
            const { batchId } = request.params;
            const page = parseInt(request.query.page) || 1;
            const limit = parseInt(request.query.limit) || 10;
            const teacherId = request.user._id;

            let historyData;
            if (batchId === 'all') {
                historyData = await attendanceService.getGlobalHistory(teacherId, page, limit);
            } else {
                historyData = await attendanceService.getBatchHistory(batchId, page, limit);
            }

            return response.status(200).json(historyData);
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    // Custom session attendance
    recordCustom: async (request, response) => {
        try {
            const teacherId = request.user._id;
            const data = await attendanceService.createCustomSession(request.body, teacherId);

            return response.status(200).json({
                message: 'Custom attendance recorded',
                data: data
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    getStudentStats: async (request, response) => {
        try {
            const { studentId } = request.params;
            const stats = await attendanceService.getStudentStats(studentId);
            return response.status(200).json(stats);
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    getMyCalendar: async (request, response) => {
        try {
            const userId = request.user._id;
            const student = await Student.findOne({ userId });
            if (!student) return response.status(404).json({ message: 'Student not found' });

            const { month, year } = request.query;
            const calendar = await attendanceService.getStudentCalendarView(student._id, month, year);
            const stats = await attendanceService.getStudentStats(student._id);

            return response.status(200).json({
                calendar,
                summary: stats
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    getDailyOverview: async (request, response) => {
        try {
            const { date } = request.query;
            const teacherId = request.user._id;

            if (!date) return response.status(400).json({ message: 'Date is required' });

            const overview = await attendanceService.getTeacherDailyOverview(teacherId, date);
            return response.status(200).json(overview);
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    }
};

module.exports = attendanceController;
