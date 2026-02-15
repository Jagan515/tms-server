const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['announcement', 'attendance', 'marks', 'fee', 'general'],
        required: true
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId, // ID of announcement, mark, etc.
        index: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    }
}, { timestamps: true });

// Auto-delete notifications after 24 hours (86400 seconds)
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Notification', notificationSchema);
