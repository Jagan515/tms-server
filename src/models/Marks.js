const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', index: true },
    category: { type: String, enum: ['school', 'tuition'], required: true },
    subject: { type: String, required: true },
    unitName: { type: String, required: true },
    marksObtained: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    percentage: { type: Number },
    examDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Auto-calculate percentage before saving
marksSchema.pre('save', function () {
    if (this.totalMarks > 0) {
        this.percentage = parseFloat(((this.marksObtained / this.totalMarks) * 100).toFixed(2));
    } else {
        this.percentage = 0;
    }
});

module.exports = mongoose.model('Marks', marksSchema);
