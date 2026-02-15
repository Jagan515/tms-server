const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: false },
    relation: { type: String, required: false }
});

const studentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: false, index: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: false, index: true },
    registrationNumber: { type: String, required: true, unique: true, index: true },
    class: { type: String, required: true },
    school: { type: String, required: true },
    year: { type: Number, required: true },
    joiningDate: { type: Date, required: true },
    monthlyFee: { type: Number, required: true },
    feePaymentDay: { type: Number, default: 15 },
    contacts: [contactSchema],
    photo: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    archivedAttendance: {
        totalSessions: { type: Number, default: 0 },
        presentSessions: { type: Number, default: 0 }
    },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
