const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');

const attendanceDao = {
    createSession: async (data) => {
        const newSession = new AttendanceSession(data);
        return await newSession.save();
    },

    getSession: async (batchId, date) => {
        return await AttendanceSession.findOne({ batchId, date });
    },

    createRecord: async (data) => {
        const newRecord = new AttendanceRecord(data);
        return await newRecord.save();
    },

    getRecordsBySession: async (sessionId) => {
        return await AttendanceRecord.find({ sessionId })
            .populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } });
    },

    updateRecord: async (recordId, status, remarks) => {
        return await AttendanceRecord.findByIdAndUpdate(recordId, {
            status, remarks
        }, { new: true });
    },

    getHistoryByBatch: async (batchId, limit = 30) => {
        return await AttendanceSession.find({ batchId })
            .sort({ date: -1 })
            .limit(limit);
    }
};

module.exports = attendanceDao;
