const mongoose = require('mongoose');

const markAuditSchema = new mongoose.Schema({
    markId: { type: mongoose.Schema.Types.ObjectId, ref: 'Marks', required: true },
    field: { type: String, required: true },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now() }
}, { timestamps: true });

module.exports = mongoose.model('MarkAudit', markAuditSchema);
