const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['developer', 'teacher', 'student', 'parent'],
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    requirePasswordChange: {
        type: Boolean,
        default: true
    },
    resetPasswordToken: {
        type: String,
        index: true
    },
    resetPasswordExpire: {
        type: Date
    },
    resetPasswordLastRequestedAt: {
        type: Date
    },
    newEmail: {
        type: String
    },
    newEmailToken: {
        type: String
    },
    newEmailTokenExpire: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
