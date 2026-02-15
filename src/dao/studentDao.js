const Student = require('../models/Student');

const studentDao = {
    create: async (data, session = null) => {
        const student = new Student(data);
        return await student.save({ session });
    },

    update: async (id, data, session = null) => {
        return await Student.findByIdAndUpdate(id, data, { new: true, session });
    },

    delete: async (id, session = null) => {
        return await Student.findByIdAndDelete(id, { session });
    },

    findById: async (id) => {
        return await Student.findById(id).populate('userId').populate('parentId');
    },

    findByTeacher: async (teacherId, page, limit, search, batchId) => {
        const skip = (page - 1) * limit;
        const query = { teacherId };

        if (batchId && batchId !== 'all') {
            query.batchId = batchId;
        }

        if (search) {
            // Check if search term is a number (likely phone or part of regNo)
            query.$or = [
                { registrationNumber: { $regex: search, $options: 'i' } },
                { "contacts.phone": { $regex: search, $options: 'i' } }
            ];

            // To search by User.name, we would ideally use an aggregation pipeline
            // For simple implementation, we'll search on student fields first.
            // Advanced implementation:
            return await Student.aggregate([
                { $match: query },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                {
                    $match: {
                        $or: [
                            { registrationNumber: { $regex: search, $options: 'i' } },
                            { "contacts.phone": { $regex: search, $options: 'i' } },
                            { "user.name": { $regex: search, $options: 'i' } }
                        ]
                    }
                },
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'batches',
                        localField: 'batchId',
                        foreignField: '_id',
                        as: 'batch'
                    }
                },
                { $addFields: { userId: '$user', batchId: { $arrayElemAt: ['$batch', 0] } } }
            ]);
        }

        return await Student.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId')
            .populate('batchId');
    },

    countByTeacher: async (teacherId, search, batchId) => {
        const query = { teacherId };
        if (batchId && batchId !== 'all') query.batchId = batchId;

        if (search) {
            const results = await Student.aggregate([
                { $match: query },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                {
                    $match: {
                        $or: [
                            { registrationNumber: { $regex: search, $options: 'i' } },
                            { "contacts.phone": { $regex: search, $options: 'i' } },
                            { "user.name": { $regex: search, $options: 'i' } }
                        ]
                    }
                },
                { $count: "count" }
            ]);
            return results.length > 0 ? results[0].count : 0;
        }

        return await Student.countDocuments(query);
    },

    findByRegistrationNumber: async (regNo) => {
        return await Student.findOne({ registrationNumber: regNo }).populate('userId');
    }
};

module.exports = studentDao;
