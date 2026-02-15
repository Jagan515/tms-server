const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
        index: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    monthsCovered: [
        {
            month: Number,
            year: Number,
            feeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fee' }
        }
    ],
    paymentDate: {
        type: Date,
        default: Date.now
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Online', 'Cheque', 'Card', 'Other'],
        required: true
    },
    receiptNumber: {
        type: String,
        unique: true
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    notes: String
}, { timestamps: true });

// Prevent modification of payment history (financial integrity)
paymentHistorySchema.pre('save', async function () {
    if (!this.isNew) {
        throw new Error('Payment history records are immutable. Cannot modify existing payment records.');
    }
});

// Prevent deletion of payment history
paymentHistorySchema.pre('deleteOne', { document: true, query: false }, async function () {
    throw new Error('Payment history records cannot be deleted. Contact system administrator for audit reversal.');
});

module.exports = mongoose.model('PaymentHistory', paymentHistorySchema);
