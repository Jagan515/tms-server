const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const emailService = require('./emailService');
const mongoose = require('mongoose');

const attendanceService = {

    /**
     * Loads existing session or creates a new one with auto-populated student list
     */
    getOrCreateSession: async (batchId, date, teacherId) => {
        // Normalize date to start of day
        const sessionDate = new Date(date);
        sessionDate.setHours(0, 0, 0, 0);

        console.log(`[AttendanceService] Fetching session for Batch: ${batchId} on Date: ${sessionDate}`);

        // 1. Check if session exists
        let attendance = await Attendance.findOne({
            batchId,
            date: sessionDate,
            type: 'regular'
        });

        if (attendance) {
            console.log(`[AttendanceService] Regular session found: ${attendance._id}`);
            // Populate student names for the UI
            await attendance.populate('records.studentId', 'userId');
            // Further populate user names from userId
            // Note: Mongoose deep populate or manual lookup
            const Student = require('../models/Student');
            const populatedAttendance = await Attendance.findById(attendance._id).populate({
                path: 'records.studentId',
                populate: { path: 'userId', select: 'name' }
            });
            return populatedAttendance;
        }

        // 2. Create new session if not found
        console.log(`[AttendanceService] Session not found. Creating new for Batch ${batchId}...`);

        // Fetch all students in the batch
        const students = await Student.find({ batchId, teacherId, status: 'active' });

        const initialRecords = students.map(student => ({
            studentId: student._id,
            status: 'present', // Default to present as per standard app behavior
            emailSent: false
        }));

        attendance = new Attendance({
            teacherId,
            batchId,
            date: sessionDate,
            type: 'regular',
            records: initialRecords
        });

        await attendance.save();

        const auditService = require('./auditService');
        await auditService.log({
            userId: teacherId,
            actionType: 'CREATE_ATTENDANCE',
            entityType: 'Attendance',
            entityId: attendance._id,
            metadata: { batchId, date: sessionDate }
        });

        const populated = await Attendance.findById(attendance._id).populate({
            path: 'records.studentId',
            populate: { path: 'userId', select: 'name' }
        });

        return populated;
    },

    /**
     * Auto-saves a single student's status change
     */
    updateRecord: async (data, teacherId) => {
        const { attendanceId, studentId, status, remarks, sendEmail = false } = data;

        console.log(`[AttendanceService] Auto-saving: Attendance ${attendanceId}, Student ${studentId} -> ${status}`);

        const attendance = await Attendance.findById(attendanceId);
        if (!attendance) throw new Error('Attendance session not found');

        if (attendance.teacherId.toString() !== teacherId.toString()) {
            throw new Error('Not authorized to update this record');
        }

        // Find the specific record in the array
        const recordIndex = attendance.records.findIndex(r => r.studentId.toString() === studentId.toString());
        if (recordIndex === -1) throw new Error('Student not found in this session');

        const oldStatus = attendance.records[recordIndex].status;

        // Update the record
        attendance.records[recordIndex].status = status;
        if (remarks !== undefined) attendance.records[recordIndex].remarks = remarks;

        // Handling Email Logic
        if (sendEmail && status === 'absent' && oldStatus !== 'absent') {
            await attendanceService.sendAbsenceEmail(studentId, attendance.date);
            attendance.records[recordIndex].emailSent = true;
        }

        await attendance.save();
        return attendance.records[recordIndex];
    },

    /**
     * Creates a custom/extra session for specific students
     */
    createCustomSession: async (data, teacherId) => {
        const { date, studentIds, sessionType, sessionTime, remarks } = data;

        const sessionDate = new Date(date);
        sessionDate.setHours(0, 0, 0, 0);

        const records = studentIds.map(sId => ({
            studentId: sId,
            status: 'present',
            remarks: remarks || ''
        }));

        const attendance = new Attendance({
            teacherId,
            date: sessionDate,
            type: 'custom',
            sessionType: sessionType || 'Extra Class',
            sessionTime: sessionTime || '',
            records: records
        });

        await attendance.save();

        const auditService = require('./auditService');
        await auditService.log({
            userId: teacherId,
            actionType: 'CREATE_CUSTOM_ATTENDANCE',
            entityType: 'Attendance',
            entityId: attendance._id,
            metadata: { date: sessionDate, studentCount: studentIds.length, sessionType: sessionType }
        });

        return attendance.populate({
            path: 'records.studentId',
            populate: { path: 'userId', select: 'name' }
        });
    },

    bulkUpdateRecords: async (data, teacherId) => {
        const { attendanceId, status, sendEmail = false } = data;

        const attendance = await Attendance.findById(attendanceId);
        if (!attendance) throw new Error('Attendance session not found');

        if (attendance.teacherId.toString() !== teacherId.toString()) {
            throw new Error('Unauthorized');
        }

        // Apply status to all records
        attendance.records.forEach(record => {
            record.status = status;
        });

        await attendance.save();

        // Note: Bulk email sending for entire batch might be too noisy.
        // Usually, teachers only notify about absence for individual students.
        // But if Bulk is 'absent' and sendEmail is true:
        if (status === 'absent' && sendEmail) {
            for (const record of attendance.records) {
                if (!record.emailSent) {
                    await attendanceService.sendAbsenceEmail(record.studentId, attendance.date);
                    record.emailSent = true;
                }
            }
            await attendance.save();

            const auditService = require('./auditService');
            await auditService.log({
                userId: teacherId,
                actionType: 'BULK_UPDATE_ATTENDANCE',
                entityType: 'Attendance',
                entityId: attendanceId,
                newValue: { status },
                metadata: { emailSent: sendEmail }
            });
        }

        return attendance;
    },

    getBatchHistory: async (batchId, page = 1, limit = 10) => {
        const skip = (page - 1) * limit;
        const total = await Attendance.countDocuments({ batchId, type: 'regular' });

        const sessions = await Attendance.find({ batchId, type: 'regular' })
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        const history = sessions.map(session => {
            const presentCount = session.records.filter(r => r.status === 'present').length;
            const absentCount = session.records.filter(r => r.status === 'absent').length;
            const totalRecords = session.records.length;

            return {
                id: session._id,
                date: session.date,
                presentCount,
                absentCount,
                total: totalRecords,
                percentage: totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0
            };
        });

        return {
            history,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    },

    getGlobalHistory: async (teacherId, page = 1, limit = 10) => {
        const skip = (page - 1) * limit;
        const total = await Attendance.countDocuments({ teacherId, type: 'regular' });

        const sessions = await Attendance.find({ teacherId, type: 'regular' })
            .populate('batchId', 'name')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        const history = sessions.map(session => {
            const presentCount = session.records.filter(r => r.status === 'present').length;
            const absentCount = session.records.filter(r => r.status === 'absent').length;
            const totalRecords = session.records.length;

            return {
                id: session._id,
                date: session.date,
                batchId: session.batchId?._id,
                batchName: session.batchId?.name || 'Legacy Batch',
                presentCount,
                absentCount,
                total: totalRecords,
                percentage: totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0
            };
        });

        return {
            history,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    },

    getStudentStats: async (studentId) => {
        const sessions = await Attendance.find({
            'records.studentId': studentId
        });

        let presentDays = 0;
        let absentDays = 0;
        let totalSessions = sessions.length;

        sessions.forEach(session => {
            const record = session.records.find(r => r.studentId.toString() === studentId.toString());
            if (record) {
                if (record.status === 'present') presentDays++;
                else if (record.status === 'absent') absentDays++;
            }
        });

        return {
            totalSessions,
            presentDays,
            absentDays,
            percentage: totalSessions > 0 ? ((presentDays / totalSessions) * 100).toFixed(2) : "0.00"
        };
    },

    getStudentCalendarView: async (studentId, month, year) => {
        const query = {
            'records.studentId': studentId
        };

        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            query.date = { $gte: startDate, $lte: endDate };
        }

        const sessions = await Attendance.find(query).sort({ date: 1 });

        return sessions.map(session => {
            const record = session.records.find(r => r.studentId.toString() === studentId.toString());
            return {
                id: session._id,
                date: session.date,
                status: record ? record.status : 'N/A',
                type: session.type, // 'regular' or 'custom'
                sessionType: session.sessionType,
                remarks: record ? record.remarks : ''
            };
        });
    },

    sendAbsenceEmail: async (studentId, date) => {
        try {
            const student = await Student.findById(studentId).populate({
                path: 'parentId', populate: { path: 'userId' }
            }).populate('userId');

            if (student && student.parentId && student.parentId.userId) {
                const parentEmail = student.parentId.userId.email;
                const studentName = student.userId.name;

                await emailService.send(
                    parentEmail,
                    'Attendance Alert: Absence Noted',
                    `Dear Parent,\n\nYour child ${studentName} was marked ABSENT for the session on ${new Date(date).toLocaleDateString()}.\n\nThis is an automated notification. Please contact the teacher if this is an error.`
                );
            }
        } catch (e) {
            console.error('[AttendanceService] Absence Email Error:', e.message);
        }
    },

    createCustomSession: async (data, teacherId) => {
        const { batchId, date, sessionType, records } = data;

        console.log(`[AttendanceService] Creating Custom Session: ${sessionType} on ${date}`);

        const sessionDate = new Date(date);

        // Custom sessions allow duplicates on same date/batch if types differ, 
        // but schema unique index (batchId, date, type) prevents same type same day.
        // Assuming 'custom' type with 'sessionType' string.

        const attendance = new Attendance({
            teacherId,
            batchId,
            date: sessionDate,
            type: 'custom',
            sessionType: sessionType || 'Extra Class',
            records: records.map(r => ({
                studentId: r.studentId,
                status: r.status,
                remarks: r.remarks
            }))
        });

        await attendance.save();
        return attendance;
    },

    getTeacherDailyOverview: async (teacherId, date) => {
        const sessionDate = new Date(date);
        sessionDate.setHours(0, 0, 0, 0);

        const Batch = require('../models/Batch');
        const allBatches = await Batch.find({ teacherId });

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[sessionDate.getDay()];

        const scheduledBatches = allBatches.filter(b => b.days && b.days.includes(dayName));

        const attendanceRecords = await Attendance.find({
            teacherId,
            date: sessionDate,
            type: 'regular',
            batchId: { $in: scheduledBatches.map(b => b._id) }
        });

        const overview = scheduledBatches.map(batch => {
            const record = attendanceRecords.find(r => r.batchId.toString() === batch._id.toString());
            const presentCount = record ? record.records.filter(r => r.status === 'present').length : 0;
            const absentCount = record ? record.records.filter(r => r.status === 'absent').length : 0;
            const total = record ? record.records.length : 0;

            return {
                batchId: batch._id,
                name: batch.name,
                time: batch.time,
                isMarked: !!record,
                stats: record ? {
                    presentCount,
                    absentCount,
                    total,
                    percentage: total > 0 ? Math.round((presentCount / total) * 100) : 0
                } : null
            };
        });

        return {
            date: sessionDate,
            day: dayName,
            batches: overview
        };
    }

};

module.exports = attendanceService;
