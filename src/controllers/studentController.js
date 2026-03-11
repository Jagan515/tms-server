const studentService = require('../services/studentService');
const asyncHandler = require('../utility/asyncHandler');
const ApiError = require('../utility/apiError');

const studentController = {
    getAll: asyncHandler(async (request, response) => {
        const { page, limit, search, batchId } = request.query;
        const teacherId = request.user._id;

        const data = await studentService.getAllStudents(
            teacherId,
            Number(page) || 1,
            Number(limit) || 10,
            search || '',
            batchId
        );

        return response.status(200).json(data);
    }),

    create: asyncHandler(async (request, response) => {
        const teacherId = request.user._id;
        const result = await studentService.createStudent(request.body, teacherId);

        return response.status(201).json({
            message: 'Student enrolled successfully',
            data: result
        });
    }),

    update: asyncHandler(async (request, response) => {
        const teacherId = request.user._id;
        const updated = await studentService.updateStudent(
            request.params.id,
            request.body,
            teacherId,
            request.user
        );
        return response.status(200).json({
            message: 'Student updated successfully',
            student: updated
        });
    }),

    getDetail: asyncHandler(async (request, response) => {
        const teacherId = request.user._id;
        const data = await studentService.getStudentDetails(request.params.id, teacherId);
        return response.status(200).json(data);
    }),

    delete: asyncHandler(async (request, response) => {
        const { id } = request.params;
        const { confirmation } = request.body; // Expecting "DELETE" string
        const teacherId = request.user._id;

        if (confirmation !== 'DELETE') {
            throw new ApiError(400, 'Verification failed. Please type DELETE to confirm.');
        }

        const result = await studentService.deleteStudent(id, true, teacherId);
        return response.status(200).json(result);
    }),

    transfer: asyncHandler(async (request, response) => {
        const { id } = request.params;
        const { targetTeacherEmail, confirmation } = request.body; // Expecting "TRANSFER"
        const currentTeacherId = request.user._id;

        if (confirmation !== 'TRANSFER') {
            throw new ApiError(400, 'Verification failed. Please type TRANSFER to confirm.');
        }

        const result = await studentService.transferStudent(id, targetTeacherEmail, currentTeacherId);
        return response.status(200).json(result);
    }),

    checkParent: asyncHandler(async (request, response) => {
        const { email } = request.query;
        const User = require('../models/User');
        const user = await User.findOne({ email, role: 'parent' });

        if (user) {
            return response.status(200).json({
                exists: true,
                name: user.name,
                userId: user._id
            });
        }
        return response.status(200).json({ exists: false });
    })
};

module.exports = studentController;
