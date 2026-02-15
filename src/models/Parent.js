const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    phone: { type: String, required: false },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Parent', parentSchema);
