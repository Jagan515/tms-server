const marksService = require('../services/marksService');
const asyncHandler = require('../utility/asyncHandler');
const ApiError = require('../utility/apiError');

const marksController = {
    getMarks: asyncHandler(async (request, response) => {
        const { category, batchId, studentId, status } = request.query;
        const query = { teacherId: request.user._id };

        if (category && category !== 'all') query.category = category;
        if (batchId) query.batchId = batchId;
        if (studentId) query.studentId = studentId;
        if (status) query.status = status;

        const page = parseInt(request.query.page) || 1;
        const limit = parseInt(request.query.limit) || 10;

        const data = await marksService.getMarks(query, page, limit);
        return response.status(200).json(data);
    }),

    submitSchoolMarks: asyncHandler(async (request, response) => {
        const studentUserId = request.user._id;
        const mark = await marksService.submitSchoolMarks(request.body, studentUserId);

        return response.status(201).json({
            message: 'Marks submitted for verification',
            mark: mark
        });
    }),

    addTuitionMarks: asyncHandler(async (request, response) => {
        const teacherId = request.user._id;
        let mark;

        if (request.body.records) {
            mark = await marksService.addBulkTuitionMarks(request.body, teacherId);
        } else {
            mark = await marksService.addTuitionMarks(request.body, teacherId);
        }

        return response.status(201).json({
            message: 'Tuition marks recorded',
            mark: mark
        });
    }),

    approveMark: asyncHandler(async (request, response) => {
        const { id } = request.params;
        const teacherId = request.user._id;
        const mark = await marksService.approveMark(id, teacherId);

        return response.status(200).json({
            message: 'Evaluation approved',
            mark: mark
        });
    }),

    rejectMark: asyncHandler(async (request, response) => {
        const { id } = request.params;
        const { reason } = request.body;
        const teacherId = request.user._id;
        const mark = await marksService.rejectMark(id, reason, teacherId);

        return response.status(200).json({
            message: 'Evaluation rejected',
            mark: mark
        });
    }),

    rejectBulk: asyncHandler(async (request, response) => {
        const { ids, reason } = request.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            throw new ApiError(400, 'Assessment record IDs are required');
        }
        const teacherId = request.user._id;
        const result = await marksService.rejectBulk(ids, reason, teacherId);

        return response.status(200).json({
            message: `${result.modifiedCount} records rejected`,
            result
        });
    }),

    editAndApprove: asyncHandler(async (request, response) => {
        const { id } = request.params;
        const teacherId = request.user._id;
        const mark = await marksService.editAndApprove(id, request.body, teacherId);

        return response.status(200).json({
            message: 'Evaluation corrected and approved',
            mark: mark
        });
    }),

    getReport: asyncHandler(async (request, response) => {
        const { studentId } = request.params;
        const { category, subject } = request.query;

        // Security Check: Students/Parents can only see their own/child's data
        if (request.user.role === 'student') {
            const Student = require('../models/Student');
            const studentProfile = await Student.findOne({ userId: request.user._id });
            if (!studentProfile || studentProfile._id.toString() !== studentId) {
                throw new ApiError(403, 'Unauthorized access to academic records');
            }
        }

        const report = await marksService.getStudentMarksReport(studentId, category, subject);
        return response.status(200).json(report);
    }),

    getMyReport: asyncHandler(async (request, response) => {
        const Student = require('../models/Student');
        const studentProfile = await Student.findOne({ userId: request.user._id });
        if (!studentProfile) throw new ApiError(404, 'Academic profile not found');

        const { category, subject } = request.query;
        const report = await marksService.getStudentMarksReport(studentProfile._id, category, subject);
        const pending = await marksService.getPendingMarks(studentProfile._id);

        return response.status(200).json({ ...report, ...pending });
    })
};

module.exports = marksController;
