const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    date: { type: String, required: true },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now() }
});

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
