const Fee = require('../models/Fee');

const feeDao = {
    createFee: async (data) => {
        const newFee = new Fee(data);
        return await newFee.save();
    },

    getFeeRegistry: async (teacherId, month, year) => {
        return await Fee.find({ teacherId, month, year })
            .populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } })
            .sort({ status: 1 });
    },

    getDefaulters: async (teacherId, today = new Date()) => {
        return await Fee.find({
            teacherId,
            status: 'unpaid',
            dueDate: { $lt: today }
        }).populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } });
    },

    updateFeeStatus: async (feeId, status, paymentMethod, markedBy) => {
        return await Fee.findByIdAndUpdate(feeId, {
            status, paymentMethod, markedBy, paidAt: new Date()
        }, { new: true });
    }
};

module.exports = feeDao;
