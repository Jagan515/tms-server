const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    status: { type: String, enum: ['present', 'absent', 'late', 'excused'], default: 'present' },
    remarks: { type: String, required: false },
    createdAt: { type: Date, default: Date.now() }
});

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
