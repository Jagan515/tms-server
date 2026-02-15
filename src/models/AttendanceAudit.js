const mongoose = require('mongoose');

const attendanceAuditSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    oldStatus: { type: String },
    newStatus: { type: String, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now() }
}, { timestamps: true });

module.exports = mongoose.model('AttendanceAudit', attendanceAuditSchema);
