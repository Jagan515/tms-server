const attendanceService = require('../services/attendanceService');
const Student = require('../models/Student');
const asyncHandler = require('../utility/asyncHandler');
const ApiError = require('../utility/apiError');

const attendanceController = {
    // Session-based Attendance
    getSession: asyncHandler(async (request, response) => {
        const { batchId, date } = request.query;
        const teacherId = request.user._id;

        if (!batchId || !date) {
            throw new ApiError(400, 'Batch ID and Date are required');
        }

        const data = await attendanceService.getOrCreateSession(batchId, date, teacherId);
        return response.status(200).json(data);
    }),

    // Marks a single student for a session (Auto-save support)
    patchRecord: asyncHandler(async (request, response) => {
        const teacherId = request.user._id;
        const record = await attendanceService.updateRecord(request.body, teacherId);

        return response.status(200).json({
            message: 'Record updated successfully',
            record: record
        });
    }),

    // Bulk marks entire batch present/absent
    bulkPatch: asyncHandler(async (request, response) => {
        const teacherId = request.user._id;
        const attendance = await attendanceService.bulkUpdateRecords(request.body, teacherId);

        return response.status(200).json({
            message: `Whole batch marked ${request.body.status}`,
            attendance: attendance
        });
    }),

    // Get Attendance History (Batch-specific or Global)
    getHistory: asyncHandler(async (request, response) => {
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
    }),

    // Custom session attendance
    recordCustom: asyncHandler(async (request, response) => {
        const teacherId = request.user._id;
        const data = await attendanceService.createCustomSession(request.body, teacherId);

        return response.status(200).json({
            message: 'Custom attendance recorded',
            data: data
        });
    }),

    getStudentStats: asyncHandler(async (request, response) => {
        const { studentId } = request.params;
        const stats = await attendanceService.getStudentStats(studentId);
        return response.status(200).json(stats);
    }),

    getMyCalendar: asyncHandler(async (request, response) => {
        const userId = request.user._id;
        const student = await Student.findOne({ userId });
        if (!student) {
            throw new ApiError(404, 'Student profile not identified in registry.');
        }

        const { month, year } = request.query;
        const calendar = await attendanceService.getStudentCalendarView(student._id, month, year);
        const stats = await attendanceService.getStudentStats(student._id);

        return response.status(200).json({
            calendar,
            summary: stats
        });
    }),

    getDailyOverview: asyncHandler(async (request, response) => {
        const { date } = request.query;
        const teacherId = request.user._id;

        if (!date) {
            throw new ApiError(400, 'Temporal context (date) is mandatory.');
        }

        const overview = await attendanceService.getTeacherDailyOverview(teacherId, date);
        return response.status(200).json(overview);
    })
};

module.exports = attendanceController;
