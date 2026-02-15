const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: false },
    status: { type: String, enum: ['paid', 'unpaid', 'skipped'], default: 'unpaid' },
    skippedReason: { type: String },
    paidAt: { type: Date },
    paymentMethod: { type: String },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentHistory' },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure unique fee record per student per month/year
feeSchema.index({ studentId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Fee', feeSchema);
