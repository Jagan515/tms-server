const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    actionType: {
        type: String, // 'CREATE', 'UPDATE', 'DELETE', 'APPROVE'
        required: true
    },
    entityType: {
        type: String, // 'student', 'attendance', 'fee', 'mark'
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    oldValue: {
        type: mongoose.Schema.Types.Mixed
    },
    newValue: {
        type: mongoose.Schema.Types.Mixed
    },
    ipAddress: String,
    metadata: mongoose.Schema.Types.Mixed // For extra context like 'Batch Edit'
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
