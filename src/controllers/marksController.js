const marksService = require('../services/marksService');

const marksController = {
    getMarks: async (request, response) => {
        try {
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
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    submitSchoolMarks: async (request, response) => {
        try {
            const studentUserId = request.user._id;
            const mark = await marksService.submitSchoolMarks(request.body, studentUserId);

            return response.status(201).json({
                message: 'Marks submitted for verification',
                mark: mark
            });
        } catch (error) {
            console.log(error);
            return response.status(400).json({ message: error.message || 'Submission failed' });
        }
    },

    addTuitionMarks: async (request, response) => {
        try {
            const teacherId = request.user._id;
            const mark = await marksService.addTuitionMarks(request.body, teacherId);

            return response.status(201).json({
                message: 'Tuition marks recorded',
                mark: mark
            });
        } catch (error) {
            console.log(error);
            return response.status(400).json({ message: error.message || 'Addition failed' });
        }
    },

    approveMark: async (request, response) => {
        try {
            const { id } = request.params;
            const teacherId = request.user._id;
            const mark = await marksService.approveMark(id, teacherId);

            return response.status(200).json({
                message: 'Evaluation approved',
                mark: mark
            });
        } catch (error) {
            console.log(error);
            return response.status(400).json({ message: error.message || 'Approval failed' });
        }
    },

    rejectMark: async (request, response) => {
        try {
            const { id } = request.params;
            const { reason } = request.body;
            const teacherId = request.user._id;
            const mark = await marksService.rejectMark(id, reason, teacherId);

            return response.status(200).json({
                message: 'Evaluation rejected',
                mark: mark
            });
        } catch (error) {
            console.log(error);
            return response.status(400).json({ message: error.message || 'Rejection failed' });
        }
    },

    editAndApprove: async (request, response) => {
        try {
            const { id } = request.params;
            const teacherId = request.user._id;
            const mark = await marksService.editAndApprove(id, request.body, teacherId);

            return response.status(200).json({
                message: 'Evaluation corrected and approved',
                mark: mark
            });
        } catch (error) {
            console.log(error);
            return response.status(400).json({ message: error.message || 'Process failed' });
        }
    },

    getReport: async (request, response) => {
        try {
            const { studentId } = request.params;
            const { category, subject } = request.query;

            // Security Check: Students/Parents can only see their own/child's data
            if (request.user.role === 'student') {
                const Student = require('../models/Student');
                const studentProfile = await Student.findOne({ userId: request.user._id });
                if (studentProfile._id.toString() !== studentId) return response.status(403).json({ message: 'Forbidden' });
            }

            const report = await marksService.getStudentMarksReport(studentId, category, subject);

            return response.status(200).json(report);
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    getMyReport: async (request, response) => {
        try {
            const Student = require('../models/Student');
            const studentProfile = await Student.findOne({ userId: request.user._id });
            if (!studentProfile) return response.status(404).json({ message: 'Profile not found' });

            const { category, subject } = request.query;
            const report = await marksService.getStudentMarksReport(studentProfile._id, category, subject);
            const pending = await marksService.getPendingMarks(studentProfile._id);

            return response.status(200).json({ ...report, ...pending });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    }
};

module.exports = marksController;
