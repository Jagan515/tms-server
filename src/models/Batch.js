const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
    name: { type: String, required: true },
    class: { type: String, required: true },
    subject: { type: String, required: false },
    time: { type: String, required: false }, // e.g., 10:00 AM - 11:30 AM
    days: [{ type: String }], // e.g., ['Monday', 'Wednesday']
    year: { type: String, required: false },
    description: { type: String, required: false },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Batch', batchSchema);
