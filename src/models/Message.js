const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    recipientId: {
        type: mongoose.Schema.Types.ObjectId, // Can be null if system broadcast? But we have Announcements for that.
        ref: 'User',
        required: true,
        index: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    body: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    parentMessageId: {
        type: mongoose.Schema.Types.ObjectId, // For threading/replies
        ref: 'Message',
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
