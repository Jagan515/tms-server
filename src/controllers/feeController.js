const feeService = require('../services/feeService');
const asyncHandler = require('../utility/asyncHandler');
const ApiError = require('../utility/apiError');
const Student = require('../models/Student');

const feeController = {
    getRegistry: asyncHandler(async (request, response) => {
        const { month, year, batchId } = request.query;
        const teacherId = request.user._id;

        const fees = await feeService.getRegistry(teacherId, { month, year, batchId });
        return response.status(200).json({
            fees: fees
        });
    }),

    getDefaulters: asyncHandler(async (request, response) => {
        const { minMonths, batchId } = request.query;
        const teacherId = request.user._id;

        const defaulters = await feeService.getDefaulters(teacherId, minMonths || 1, batchId);
        return response.status(200).json({
            defaulters: defaulters
        });
    }),

    getPaymentHistory: asyncHandler(async (request, response) => {
        const { batchId } = request.query;
        const teacherId = request.user._id;

        const history = await feeService.getAllPaymentHistory(teacherId, batchId);
        return response.status(200).json({
            history: history
        });
    }),

    recordPayment: asyncHandler(async (request, response) => {
        const teacherId = request.user._id;
        const history = await feeService.processPayment(request.body, teacherId);

        return response.status(200).json({
            message: 'Payment recorded successfully',
            history: history
        });
    }),

    runAutoGeneration: asyncHandler(async (request, response) => {
        const result = await feeService.autoGenerateMonthlyFees();
        return response.status(200).json({
            message: 'Auto-generation process completed',
            ...result
        });
    }),

    getStudentFees: asyncHandler(async (request, response) => {
        const { studentId } = request.params;
        const fees = await feeService.getFeesByStudent(studentId);
        const summary = await feeService.getPendingSummary(studentId);

        return response.status(200).json({
            fees: fees,
            summary: summary
        });
    }),

    getMyFees: asyncHandler(async (request, response) => {
        const userId = request.user._id;
        const studentProfile = await Student.findOne({ userId });
        if (!studentProfile) {
            throw new ApiError(404, 'Profile not identified in registry.');
        }

        const fees = await feeService.getFeesByStudent(studentProfile._id);
        const summary = await feeService.getPendingSummary(studentProfile._id);

        return response.status(200).json({
            fees,
            summary,
            monthlyFee: studentProfile.monthlyFee,
            dueDay: studentProfile.feePaymentDay,
            joiningDate: studentProfile.joiningDate
        });
    })
};

module.exports = feeController;
