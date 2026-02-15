const batchDao = require('../dao/batchDao');

const batchService = {

    createBatch: async (data, teacherId) => {
        // Check for duplicate
        const Batch = require('../models/Batch');
        const duplicate = await Batch.findOne({ teacherId, name: data.name, year: data.year });

        if (duplicate) {
            throw new Error('Batch with this name already exists for the year');
        }

        return await batchDao.create({
            teacherId,
            name: data.name,
            class: data.class,
            year: data.year,
            subject: data.subject || '',
            time: data.time || '',
            description: data.description || '',
            days: data.days || []
        });
    },

    updateBatch: async (id, data) => {
        const updateData = {
            name: data.name,
            class: data.class,
            year: data.year,
            subject: data.subject || '',
            time: data.time || '',
            description: data.description || '',
            days: data.days || []
        };

        return await batchDao.update(id, updateData);
    },

    getAllBatches: async (teacherId, page = 1, limit = 10, search = '') => {
        const batches = await batchDao.findByTeacher(teacherId, page, limit);
        const totalBatches = await batchDao.countByTeacher(teacherId);
        const totalPages = Math.ceil(totalBatches / limit);

        // Add student count to each batch
        const Student = require('../models/Student');
        const batchesWithCount = await Promise.all(
            batches.map(async (batch) => {
                const studentCount = await Student.countDocuments({ batchId: batch._id });
                return {
                    ...batch.toObject(),
                    studentCount
                };
            })
        );

        return { batches: batchesWithCount, totalPages };
    },

    getBatchDetails: async (batchId) => {
        const batch = await batchDao.findById(batchId);
        if (!batch) throw new Error('Batch not found');

        // Fetch students in this batch
        const Student = require('../models/Student');
        const students = await Student.find({ batchId }).populate('userId', 'name email');

        return {
            batch,
            students: students.map(s => ({
                _id: s._id,
                name: s.userId.name,
                email: s.userId.email,
                registrationNumber: s.registrationNumber,
                photo: s.photo // if exists
            }))
        };
    },

    addStudentToBatch: async (batchId, studentId) => {
        const Student = require('../models/Student');
        const student = await Student.findById(studentId);
        if (!student) throw new Error('Student not found');

        student.batchId = batchId;
        await student.save();
        return student;
    },

    removeStudentFromBatch: async (batchId, studentId) => {
        const Student = require('../models/Student');
        const student = await Student.findOne({ _id: studentId, batchId });
        if (!student) throw new Error('Student not found in this batch');

        student.batchId = null;
        await student.save();
        return student;
    },

    deleteBatch: async (pageId) => {
        return await batchDao.delete(pageId);
    }

};

module.exports = batchService;
