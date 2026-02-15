const Parent = require('../models/Parent');
const Student = require('../models/Student');
const Fee = require('../models/Fee');
const Announcement = require('../models/Announcement');
const studentViewService = require('./studentViewService');

const parentViewService = {

    getParentDashboard: async (parentId) => {
        const parent = await Parent.findById(parentId).populate('userId', 'name email');
        if (!parent) throw new Error('Parent not found');

        const children = await Student.find({ parentId: parent._id })
            .populate('userId', 'name')
            .populate('batchId', 'name');

        const childrenSummary = [];
        let totalPendingFees = 0;

        for (const child of children) {
            // Get quick stats for each child (attendance, pending fees)
            // leveraging studentViewService or simple queries
            const feeStatus = await Fee.find({ studentId: child._id, status: 'unpaid' });
            const childPending = feeStatus.reduce((acc, curr) => acc + curr.amount, 0);
            totalPendingFees += childPending;

            childrenSummary.push({
                _id: child._id,
                name: child.name || child.userId.name, // assuming name might be populated or in student model
                class: child.class,
                batch: child.batchId?.name,
                school: child.school,
                pendingFees: childPending
            });
        }

        return {
            parent: {
                name: parent.userId.name,
                email: parent.userId.email,
                phone: parent.phone
            },
            children: childrenSummary,
            overview: {
                totalChildren: children.length,
                totalPendingFees
            }
        };
    },

    getChildren: async (parentId) => {
        // Updated to use parentId directly
        const children = await Student.find({ parentId })
            .populate('userId', 'name email')
            .populate('batchId', 'name'); // useful to have

        return children.map(child => ({
            _id: child._id,
            name: child.userId?.name || child.name, // fallback
            email: child.userId?.email,
            registrationNumber: child.registrationNumber,
            class: child.class,
            section: child.section, // if exists
            batchName: child.batchId?.name,
            school: child.school,
            avatar: child.avatar // if exists
        }));
    },

    validateParentChildRelationship: async (parentId, studentId) => {
        const student = await Student.findOne({ _id: studentId, parentId });
        return !!student;
    },

    getFeePaymentHistory: async (parentId) => {
        const children = await Student.find({ parentId }, '_id userId');
        const studentIds = children.map(c => c._id);

        const fees = await Fee.find({ studentId: { $in: studentIds } })
            .populate({
                path: 'studentId',
                select: 'name registrationNumber',
                populate: { path: 'userId', select: 'name' }
            })
            .sort({ paidAt: -1, year: -1, month: -1 });

        return fees.map(f => ({
            _id: f._id,
            studentName: f.studentId?.userId?.name || f.studentId?.name,
            month: f.month,
            year: f.year,
            amount: f.amount,
            status: f.status,
            paidAt: f.paidAt,
            paymentMethod: f.paymentMethod,
            transactionId: f.transactionId
        }));
    },

    getParentMessages: async (parentId, page = 1, limit = 10) => {
        // Logic: Announcements targeting 'parent' or 'both'
        // AND (global OR belonging to one of the children's batches)

        const children = await Student.find({ parentId }, 'batchId');
        const batchIds = children.map(c => c.batchId).filter(id => id); // filter nulls

        const query = {
            $or: [
                { targetRole: 'parent' },
                { targetRole: 'both' }
            ],
            $and: [
                {
                    $or: [
                        { batchId: { $in: batchIds } },
                        { batchId: null }, // Global/All batches
                        { targetAudience: 'All' } // if targetAudience field exists
                    ]
                }
            ]
        };

        const skip = (page - 1) * limit;
        const messages = await Announcement.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        return {
            messages,
            pagination: {
                page: Number(page),
                limit: Number(limit)
            }
        };
    }

};

module.exports = parentViewService;
