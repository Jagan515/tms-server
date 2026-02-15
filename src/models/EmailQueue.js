const mongoose = require('mongoose');

const emailQueueSchema = new mongoose.Schema({
    recipientEmail: {
        type: String,
        required: true,
        index: true
    },
    subject: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending',
        index: true
    },
    retryCount: {
        type: Number,
        default: 0
    },
    error: String,
    sentAt: Date
}, { timestamps: true });

module.exports = mongoose.model('EmailQueue', emailQueueSchema);
