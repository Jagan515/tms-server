const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    phone: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
    emailPreferences: {
        masterToggle: { type: Boolean, default: true },
        attendanceEmails: { type: Boolean, default: true },
        marksEmails: { type: Boolean, default: true },
        feeEmails: { type: Boolean, default: true },
        announcementEmails: { type: Boolean, default: true }
    },
    createdAt: { type: Date, default: Date.now() }
});


module.exports = mongoose.model('Teacher', teacherSchema);
