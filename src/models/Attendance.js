const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    status: { type: String, enum: ['present', 'absent'], required: true },
    remarks: { type: String, default: '' },
    emailSent: { type: Boolean, default: false }
});

const attendanceSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', index: true },
    type: { type: String, enum: ['regular', 'custom'], default: 'regular' },
    sessionType: { type: String }, // e.g., 'Doubt Clearing', 'Extra Class'
    sessionTime: { type: String },
    date: { type: Date, required: true, index: true },
    records: [attendanceRecordSchema]
}, { timestamps: true });

// Ensure unique attendance per batch per date
attendanceSchema.index({ batchId: 1, date: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
