const feeService = require('../services/feeService');

const feeController = {
    getRegistry: async (request, response) => {
        try {
            const { month, year, batchId } = request.query;
            const teacherId = request.user._id;

            const fees = await feeService.getRegistry(teacherId, { month, year, batchId });
            return response.status(200).json({
                fees: fees
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    getDefaulters: async (request, response) => {
        try {
            const { minMonths, batchId } = request.query;
            const teacherId = request.user._id;

            const defaulters = await feeService.getDefaulters(teacherId, minMonths || 1, batchId);
            return response.status(200).json({
                defaulters: defaulters
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    getPaymentHistory: async (request, response) => {
        try {
            const { batchId } = request.query;
            const teacherId = request.user._id;

            const history = await feeService.getAllPaymentHistory(teacherId, batchId);
            return response.status(200).json({
                history: history
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    recordPayment: async (request, response) => {
        try {
            const teacherId = request.user._id;
            const history = await feeService.processPayment(request.body, teacherId);

            return response.status(200).json({
                message: 'Payment recorded successfully',
                history: history
            });
        } catch (error) {
            console.log(error);
            return response.status(400).json({ message: error.message || 'Payment recording failed' });
        }
    },

    runAutoGeneration: async (request, response) => {
        try {
            const result = await feeService.autoGenerateMonthlyFees();
            return response.status(200).json({
                message: 'Auto-generation process completed',
                ...result
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    getStudentFees: async (request, response) => {
        try {
            const { studentId } = request.params;
            const fees = await feeService.getFeesByStudent(studentId);
            const summary = await feeService.getPendingSummary(studentId);

            return response.status(200).json({
                fees: fees,
                summary: summary
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    getMyFees: async (request, response) => {
        try {
            const userId = request.user._id;
            const Student = require('../models/Student');
            const studentProfile = await Student.findOne({ userId });
            if (!studentProfile) return response.status(404).json({ message: 'Profile not found' });

            const fees = await feeService.getFeesByStudent(studentProfile._id);
            const summary = await feeService.getPendingSummary(studentProfile._id);

            return response.status(200).json({
                fees,
                summary,
                monthlyFee: studentProfile.monthlyFee,
                dueDay: studentProfile.feePaymentDay,
                joiningDate: studentProfile.joiningDate
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    }
};

module.exports = feeController;
