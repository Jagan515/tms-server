const Batch = require('../models/Batch');

const batchDao = {
    create: async (data) => {
        const batch = new Batch(data);
        return await batch.save();
    },

    update: async (id, data) => {
        return await Batch.findByIdAndUpdate(id, data, { new: true });
    },

    delete: async (id) => {
        return await Batch.findByIdAndDelete(id);
    },

    findById: async (id) => {
        return await Batch.findById(id);
    },

    findByTeacher: async (teacherId, page, limit) => {
        const skip = (page - 1) * limit;
        return await Batch.find({ teacherId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
    },

    countByTeacher: async (teacherId) => {
        return await Batch.countDocuments({ teacherId });
    }
};

module.exports = batchDao;
