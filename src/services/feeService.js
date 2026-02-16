const Fee = require('../models/Fee');
const PaymentHistory = require('../models/PaymentHistory');
const Student = require('../models/Student');
const User = require('../models/User');
const Parent = require('../models/Parent');
const mongoose = require('mongoose');

const feeService = {

    /**
     * Logic: For each ACTIVE student, check if fee for current month exists.
     * If not, and month is after joining month, create unpaid row.
     */
    autoGenerateMonthlyFees: async () => {
        const today = new Date();
        const currentMonth = today.getMonth() + 1; // 1-12
        const currentYear = today.getFullYear();

        const students = await Student.find({ status: 'active' });
        let created = 0;

        for (const student of students) {
            const joinDate = new Date(student.joiningDate);
            const joinMonth = joinDate.getMonth() + 1;
            const joinYear = joinDate.getFullYear();

            // Check if exists (Prevents duplicates)
            const exists = await Fee.findOne({
                studentId: student._id,
                month: currentMonth,
                year: currentYear
            });

            if (exists) continue;

            const isJoiningMonth = (currentYear === joinYear && currentMonth === joinMonth);
            const isAfterJoiningMonth = (currentYear > joinYear) || (currentYear === joinYear && currentMonth > joinMonth);

            if (isJoiningMonth) {
                // Rule: Joining month is SKIPPED (₹0)
                await Fee.create({
                    teacherId: student.teacherId,
                    studentId: student._id,
                    month: currentMonth,
                    year: currentYear,
                    amount: 0,
                    status: 'skipped',
                    skippedReason: 'Joining month'
                });
                created++;
            } else if (isAfterJoiningMonth) {
                const dueDate = new Date(currentYear, currentMonth - 1, student.feePaymentDay || 15);
                await Fee.create({
                    teacherId: student.teacherId,
                    studentId: student._id,
                    month: currentMonth,
                    year: currentYear,
                    amount: student.monthlyFee,
                    status: 'unpaid',
                    dueDate
                });
                created++;
            }
        }
        return { created, totalChecked: students.length };
    },

    /**
     * Update future unpaid fees when monthly fee changes
     */
    updateFutureUnpaidFees: async (studentId, newAmount, session, currentDate = new Date()) => {
        const today = currentDate;
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();

        const query = {
            studentId: new mongoose.Types.ObjectId(studentId),
            status: 'unpaid',
            $or: [
                { year: { $gt: currentYear } },
                { year: currentYear, month: { $gte: currentMonth } }
            ]
        };

        const result = await Fee.updateMany(
            query,
            { $set: { amount: newAmount } },
            { session }
        );

        return result.modifiedCount;
    },

    /**
     * Atomic process to mark multiple months paid
     */
    processPayment: async (data, teacherId) => {
        const { studentId, feeIds, paymentMethod, notes } = data;
        const session = await mongoose.startSession();
        let transactionStarted = false;
        let history;

        try {
            const sId = new mongoose.Types.ObjectId(studentId);
            const fIds = feeIds.map(id => new mongoose.Types.ObjectId(id));

            try {
                session.startTransaction();
                transactionStarted = true;
            } catch (e) {
                console.log('[FeeService] Transactions not supported');
            }

            const query = { _id: { $in: fIds }, studentId: sId, status: 'unpaid' };
            const fees = transactionStarted
                ? await Fee.find(query).session(session)
                : await Fee.find(query);

            if (fees.length !== fIds.length) {
                throw new Error('One or more selected months are invalid or already paid.');
            }

            const totalAmount = fees.reduce((sum, f) => sum + f.amount, 0);

            history = new PaymentHistory({
                studentId: sId,
                teacherId,
                totalAmount,
                paymentMethod,
                monthsCovered: fees.map(f => ({ month: f.month, year: f.year, feeId: f._id })),
                markedBy: teacherId,
                notes,
                receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`
            });

            if (transactionStarted) await history.save({ session });
            else await history.save();

            await Fee.updateMany(
                { _id: { $in: fIds } },
                {
                    $set: {
                        status: 'paid',
                        paidAt: new Date(),
                        paymentMethod,
                        markedBy: teacherId,
                        transactionId: history._id
                    }
                },
                { session: transactionStarted ? session : undefined }
            );

            if (transactionStarted) await session.commitTransaction();

            const auditService = require('./auditService');
            await auditService.log({
                userId: teacherId,
                actionType: 'PROCESS_PAYMENT',
                entityType: 'Fee',
                entityId: history._id,
                newValue: { totalAmount, paymentMethod },
                metadata: { studentId, monthsPaid: feeIds.length }
            });

            // Async email (best effort)
            try {
                const student = await Student.findById(sId).populate({
                    path: 'parentId', populate: { path: 'userId' }
                }).populate('userId', 'name');

                if (student?.parentId?.userId?.email) {
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const covered = fees.map(f => `${monthNames[f.month - 1]} ${f.year}`).join(', ');
                    const nextUnpaid = await Fee.findOne({ studentId: sId, status: 'unpaid' }).sort({ year: 1, month: 1 });
                    const nextDue = nextUnpaid ? `${monthNames[nextUnpaid.month - 1]} ${nextUnpaid.year} (₹${nextUnpaid.amount})` : 'None';

                    await require('./emailService').send(
                        student.parentId.userId.email,
                        `Tuition Fee Receipt - ${student.userId.name}`,
                        `Dear Parent,\n\nReceived: ₹${totalAmount}\nMonths: ${covered}\nReceipt: ${history.receiptNumber}\nNext due: ${nextDue}`
                    );
                }
            } catch (err) {
                console.error('[FeeService] Email fail:', err.message);
            }

            return history;
        } catch (error) {
            if (transactionStarted) await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    getPendingSummary: async (studentId) => {
        const unpaid = await Fee.find({ studentId, status: 'unpaid' });
        const totalPending = unpaid.reduce((sum, f) => sum + f.amount, 0);
        return {
            totalPending,
            unpaidCount: unpaid.length,
            oldestDue: unpaid.length > 0 ? unpaid.sort((a, b) => a.dueDate - b.dueDate)[0].dueDate : null
        };
    },

    getDefaulters: async (teacherId, minMonths = 1, batchId = null) => {
        const today = new Date();
        const defaulters = await Fee.aggregate([
            {
                $match: {
                    teacherId: new mongoose.Types.ObjectId(teacherId),
                    status: 'unpaid',
                    dueDate: { $lt: today }
                }
            },
            {
                $group: {
                    _id: '$studentId',
                    unpaidCount: { $sum: 1 },
                    totalPending: { $sum: '$amount' },
                    oldestDueDate: { $min: '$dueDate' }
                }
            },
            {
                $lookup: {
                    from: 'students',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            { $unwind: '$student' },
            {
                $match: batchId ? { "student.batchId": new mongoose.Types.ObjectId(batchId) } : {}
            },
            { $match: { unpaidCount: { $gte: Number(minMonths) } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student.userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' }
        ]);

        return defaulters.map(d => ({
            studentId: d._id,
            name: d.user.name,
            regNo: d.student.registrationNumber,
            unpaidMonths: d.unpaidCount,
            totalPending: d.totalPending,
            overdueDays: Math.floor((today - d.oldestDueDate) / (1000 * 60 * 60 * 24)),
            batchId: d.student.batchId
        }));
    },

    getPaymentHistory: async (studentId) => {
        return await PaymentHistory.find({ studentId }).sort({ paymentDate: -1 });
    },

    getAllPaymentHistory: async (teacherId, batchId = null) => {
        const query = { teacherId: new mongoose.Types.ObjectId(teacherId) };
        if (batchId && batchId !== 'all') {
            const studentIds = await Student.find({ batchId, teacherId }).distinct('_id');
            query.studentId = { $in: studentIds };
        }

        return await PaymentHistory.find(query)
            .populate({
                path: 'studentId',
                populate: { path: 'userId', select: 'name registrationNumber' }
            })
            .sort({ paymentDate: -1 })
            .limit(50);
    },

    getFeesByStudent: async (studentId) => {
        return await Fee.find({ studentId }).sort({ year: -1, month: -1 });
    },

    /**
     * Generate fees for a new student
     * Rule: SKIP joining month (₹0), generate unpaid for remaining months
     */
    generateFeeForStudent: async (studentId, monthlyFee, year, teacherId, session, joiningDate) => {
        const joinDate = new Date(joiningDate);
        const joinMonth = joinDate.getMonth() + 1; // 1-12
        const joinYear = joinDate.getFullYear();
        const currentYear = year || joinYear;

        const feesToCreate = [];

        for (let month = 1; month <= 12; month++) {
            if (currentYear === joinYear && month < joinMonth) {
                continue;
            }

            const isJoiningMonth = (currentYear === joinYear && month === joinMonth);

            if (isJoiningMonth) {
                // Rule: Joining month is SKIPPED (₹0)
                feesToCreate.push({
                    teacherId,
                    studentId,
                    month,
                    year: currentYear,
                    amount: 0,
                    status: 'skipped',
                    skippedReason: 'Joining month'
                });
            } else {
                let dueDay = 15;
                const student = await Student.findById(studentId);
                if (student && student.feePaymentDay) {
                    dueDay = student.feePaymentDay;
                }

                const daysInMonth = new Date(currentYear, month, 0).getDate();
                const adjustedDueDay = Math.min(dueDay, daysInMonth);
                const dueDate = new Date(currentYear, month - 1, adjustedDueDay);

                feesToCreate.push({
                    teacherId,
                    studentId,
                    month,
                    year: currentYear,
                    amount: monthlyFee,
                    status: 'unpaid',
                    dueDate
                });
            }
        }

        if (feesToCreate.length > 0) {
            await Fee.insertMany(feesToCreate, { session });
        }

        return feesToCreate.length;
    },

    getRegistry: async (teacherId, query = {}) => {
        const { month, year, batchId } = query;
        const match = { teacherId: new mongoose.Types.ObjectId(teacherId) };
        if (month) match.month = Number(month);
        if (year) match.year = Number(year);

        if (batchId) {
            const studentIds = await Student.find({ batchId, teacherId }).distinct('_id');
            match.studentId = { $in: studentIds };
        }

        return await Fee.find(match)
            .populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } })
            .sort({ status: 1 });
    }

};

module.exports = feeService;
