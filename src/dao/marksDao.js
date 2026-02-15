const Marks = require('../models/Marks');

const marksDao = {
    createMarks: async (data) => {
        const newMarks = new Marks(data);
        return await newMarks.save();
    },

    getMarksByFilter: async (query) => {
        return await Marks.find(query)
            .populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } })
            .sort({ date: -1 });
    },

    updateMarks: async (marksId, data) => {
        return await Marks.findByIdAndUpdate(marksId, data, { new: true });
    },

    deleteMarks: async (marksId) => {
        return await Marks.findByIdAndDelete(marksId);
    }
};

module.exports = marksDao;
