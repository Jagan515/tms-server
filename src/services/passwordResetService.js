const userDao = require('../dao/userDao');
const studentDao = require('../dao/studentDao');
const emailService = require('./emailService');
const bcrypt = require('bcryptjs');
const Notification = require('../models/Notification');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const passwordResetService = {

    requestReset: async (role, identifier) => {
        let user;
        let student;

        if (role === 'student') {
            student = await studentDao.findByRegistrationNumber(identifier);
            if (!student) throw new Error('Student not found');
            user = await userDao.findById(student.userId);
        } else {
            user = await userDao.findByEmail(identifier);
        }

        if (!user) throw new Error('User not found');
        // Optional: Check if user.role matches requested role

        const otp = generateOTP();
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        // In production, we should hash the OTP before saving.
        // For this MVP, storing plain for simplicity or hashing if verify matches.
        // Let's store hashed to be secure, but we need to verify against hash.
        const salt = await bcrypt.genSalt(10);
        const hashedOtp = await bcrypt.hash(otp, salt);

        user.resetOtp = hashedOtp;
        user.resetOtpExpiry = expiry;
        user.resetPasswordLastRequestedAt = new Date();
        await user.save();

        // Send Notification
        if (role === 'student') {
            // Send to Teacher
            if (!student.teacherId) throw new Error('Student has no assigned teacher');
            const teacherUser = await userDao.findById(student.teacherId); // Assuming teacherId is User ID ref

            if (teacherUser && teacherUser.email) {
                await emailService.send(
                    teacherUser.email,
                    'Password Reset Request - Student',
                    `Student ${user.name} (${student.registrationNumber}) has requested a password reset.\nOTP: ${otp}`
                );
            } else {
                // Fallback?
                console.warn(`Teacher not found or no email for student ${identifier}`);
            }

            // Create In-App Notification
            if (teacherUser) {
                await Notification.create({
                    userId: teacherUser._id,
                    title: 'Password Reset Request',
                    message: `Student ${user.name} (${student.registrationNumber}) has requested a password reset. OTP: ${otp}`,
                    type: 'alert',
                    data: { studentId: student._id, otp }
                });
            }

        } else if (role === 'parent') {
            // Send to Parent Email
            await emailService.send(
                user.email,
                'Password Reset OTP',
                `Your OTP for password reset is: ${otp}`
            );
        }

        return { message: 'OTP sent successfully' };
    },

    resetPassword: async (role, identifier, otp, newPassword) => {
        let user;

        if (role === 'student') {
            const student = await studentDao.findByRegistrationNumber(identifier);
            if (!student) throw new Error('Student not found');
            user = await userDao.findById(student.userId);
        } else {
            user = await userDao.findByEmail(identifier);
        }

        if (!user) throw new Error('User not found');

        // Check Expiry
        if (!user.resetOtpExpiry || user.resetOtpExpiry < new Date()) {
            throw new Error('OTP expired');
        }

        // Check OTP
        const isMatch = await bcrypt.compare(otp, user.resetOtp);
        if (!isMatch) {
            throw new Error('Invalid OTP');
        }

        // Reset Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        user.resetOtp = undefined;
        user.resetOtpExpiry = undefined;
        await user.save();

        return { message: 'Password reset successfully' };
    }
};

module.exports = passwordResetService;
