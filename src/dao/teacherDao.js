const Teacher = require('../models/Teacher');

const teacherDao = {
    createTeacher: async (data) => {
        const newTeacher = new Teacher(data);
        return await newTeacher.save();
    },

    getTeacherById: async (teacherId) => {
        // Find by teacher profile ID
        return await Teacher.findById(teacherId).populate('userId');
    },

    getTeacherByUserId: async (userId) => {
        return await Teacher.findOne({ userId }).populate('userId');
    },

    getAllTeachers: async (skip = 0, limit = 10) => {
        return await Teacher.find()
            .populate({
                path: 'userId',
                select: 'name email isActive createdAt'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
    },

    updateTeacherStatus: async (userId, isActive) => {
        // We usually pass the USER ID from the developer controller for teacher management
        return await Teacher.findOneAndUpdate({ userId }, { isActive }, { new: true });
    },

    deleteTeacher: async (userId) => {
        return await Teacher.findOneAndDelete({ userId });
    },

    countTeachers: async () => {
        return await Teacher.countDocuments();
    }
};

module.exports = teacherDao;
