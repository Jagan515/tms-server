const Marks = require('../models/Marks');
const MarkAudit = require('../models/MarkAudit');
const Student = require('../models/Student');
const emailService = require('./emailService');
const mongoose = require('mongoose');

const calculatePercentage = (obtained, total) => {
    if (!total || total <= 0) return 0;
    return parseFloat(((obtained / total) * 100).toFixed(2));
};

const marksService = {

    submitSchoolMarks: async (data, studentUserId) => {
        const { subject, unitName, marksObtained, totalMarks, examDate } = data;

        const student = await Student.findOne({ userId: studentUserId });
        if (!student) throw new Error('Student profile not found');

        if (Number(marksObtained) > Number(totalMarks)) {
            throw new Error('Marks obtained cannot exceed total marks');
        }

        const mark = new Marks({
            studentId: student._id,
            teacherId: student.teacherId,
            batchId: student.batchId,
            category: 'school',
            subject,
            unitName,
            marksObtained,
            totalMarks,
            examDate,
            status: 'pending',
            submittedBy: studentUserId
        });

        await mark.save();
        return mark;
    },

    addTuitionMarks: async (data, teacherId) => {
        const { studentId, subject, unitName, marksObtained, totalMarks, examDate } = data;

        const student = await Student.findById(studentId);
        if (Number(marksObtained) > Number(totalMarks)) {
            throw new Error('Marks obtained cannot exceed total marks');
        }

        const mark = new Marks({
            studentId,
            teacherId,
            batchId: student?.batchId,
            category: 'tuition',
            subject,
            unitName,
            marksObtained,
            totalMarks,
            examDate,
            status: 'approved',
            submittedBy: teacherId,
            approvedBy: teacherId
        });

        await mark.save();

        const auditService = require('./auditService');
        await auditService.log({
            userId: teacherId,
            actionType: 'ADD_MARKS',
            entityType: 'Marks',
            entityId: mark._id,
            newValue: { marksObtained, totalMarks, subject },
            metadata: { studentId }
        });

        return mark;
    },

    addBulkTuitionMarks: async (data, teacherId) => {
        const { subject, unitName, totalMarks, examDate, records } = data;

        const marksDocs = await Promise.all(records.map(async (record) => {
            const student = await Student.findById(record.studentId);
            if (Number(record.marksObtained) > Number(totalMarks)) {
                throw new Error(`Marks for student ${record.studentId} exceed total marks`);
            }
            return {
                studentId: record.studentId,
                teacherId,
                batchId: student?.batchId,
                category: 'tuition',
                subject,
                unitName,
                marksObtained: record.marksObtained,
                totalMarks,
                percentage: calculatePercentage(record.marksObtained, totalMarks), // Calculate percentage
                examDate,
                status: 'approved',
                submittedBy: teacherId,
                approvedBy: teacherId
            };
        }));

        const marks = await Marks.insertMany(marksDocs);
        return marks;
    },

    approveMark: async (markId, teacherId) => {
        const mark = await Marks.findById(markId);
        if (!mark) throw new Error('Evaluation record not found');
        if (mark.teacherId.toString() !== teacherId.toString()) throw new Error('Permission denied');

        mark.status = 'approved';
        mark.approvedBy = teacherId;
        await mark.save();

        marksService.notifyVerification(mark, 'Approved');

        const auditService = require('./auditService');
        await auditService.log({
            userId: teacherId,
            actionType: 'APPROVE_MARKS',
            entityType: 'Marks',
            entityId: mark._id,
            metadata: { subject: mark.subject }
        });

        return mark;
    },

    rejectMark: async (markId, reason, teacherId) => {
        const mark = await Marks.findById(markId);
        if (!mark) throw new Error('Evaluation record not found');
        if (mark.teacherId.toString() !== teacherId.toString()) throw new Error('Permission denied');

        mark.status = 'rejected';
        mark.rejectionReason = reason;
        await mark.save();

        marksService.notifyRejection(mark, reason);

        const auditService = require('./auditService');
        await auditService.log({
            userId: teacherId,
            actionType: 'REJECT_MARKS',
            entityType: 'Marks',
            entityId: mark._id,
            metadata: { subject: mark.subject, reason }
        });

        return mark;
    },

    rejectBulk: async (markIds, reason, teacherId) => {
        const results = await Marks.updateMany(
            { _id: { $in: markIds }, teacherId },
            { $set: { status: 'rejected', rejectionReason: reason } }
        );
        return results;
    },

    editAndApprove: async (markId, newData, teacherId) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const mark = await Marks.findById(markId).session(session);
            if (!mark) throw new Error('Evaluation record not found');
            if (mark.teacherId.toString() !== teacherId.toString()) throw new Error('Permission denied');

            const auditLogs = [];
            const fields = ['marksObtained', 'totalMarks', 'subject', 'unitName'];

            fields.forEach(field => {
                if (newData[field] !== undefined && newData[field] !== mark[field]) {
                    auditLogs.push({
                        markId: mark._id,
                        field,
                        oldValue: mark[field],
                        newValue: newData[field],
                        editedBy: teacherId
                    });
                    mark[field] = newData[field];
                }
            });

            if (auditLogs.length > 0) {
                await MarkAudit.insertMany(auditLogs, { session });
            }

            mark.status = 'approved';
            mark.approvedBy = teacherId;
            await mark.save({ session });

            await session.commitTransaction();
            marksService.notifyVerification(mark, 'Corrected & Approved');
            return mark;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    getMarks: async (query, page = 1, limit = 10) => {
        const skip = (page - 1) * limit;
        const total = await Marks.countDocuments(query);

        const marks = await Marks.find(query)
            .populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } })
            .populate('batchId', 'name')
            .sort({ examDate: -1 })
            .skip(skip)
            .limit(limit);

        return {
            marks,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    },

    getStudentMarksReport: async (studentId, category, subject) => {
        const query = { studentId, status: 'approved' };
        if (category && category !== 'all') query.category = category;
        if (subject) query.subject = new RegExp(subject, 'i');

        const marks = await Marks.find(query).sort({ examDate: -1 });

        const schoolMarks = marks.filter(m => m.category === 'school');
        const tuitionMarks = marks.filter(m => m.category === 'tuition');

        const avg = (arr) => arr.length ? (arr.reduce((s, c) => s + (c.percentage || 0), 0) / arr.length).toFixed(1) : 0;

        return {
            schoolMarks,
            tuitionMarks,
            summary: {
                schoolAverage: avg(schoolMarks),
                tuitionAverage: avg(tuitionMarks),
                totalTests: marks.length
            }
        };
    },

    getPendingMarks: async (studentId) => {
        const pending = await Marks.find({ studentId, status: 'pending' }).sort({ createdAt: -1 });
        return { pendingMarks: pending, count: pending.length };
    },

    getRejectedMarks: async (studentId) => {
        const rejected = await Marks.find({ studentId, status: 'rejected' }).sort({ updatedAt: -1 });
        return { rejectedMarks: rejected, count: rejected.length };
    },

    notifyVerification: async (mark, statusText) => {
        try {
            const student = await Student.findById(mark.studentId).populate({
                path: 'parentId', populate: { path: 'userId' }
            });

            if (student?.parentId?.userId?.email) {
                const message = `Academic status updated for ${mark.subject} (${mark.unitName}).\nResult: ${statusText}\nScore: ${mark.marksObtained}/${mark.totalMarks} (${mark.percentage}%).`;
                emailService.send(student.parentId.userId.email, `Performance Verification: ${mark.subject}`, message)
                    .catch(e => console.error('[MarksService] Notify Fail:', e.message));
            }
        } catch (e) {
            console.error('[MarksService] Notification Error:', e.message);
        }
    },

    notifyRejection: async (mark, reason) => {
        try {
            const student = await Student.findById(mark.studentId).populate('userId');
            if (student?.userId?.email) {
                const message = `Your submission for ${mark.subject} was unfortunately rejected.\nReason: ${reason}\nPlease resubmit with correct documentation.`;
                emailService.send(student.userId.email, `Submission Rejected: ${mark.subject}`, message)
                    .catch(e => console.error('[MarksService] Rejection Fail:', e.message));
            }
        } catch (e) {
            console.error('[MarksService] Rejection Notify Error:', e.message);
        }
    }
};

module.exports = marksService;
