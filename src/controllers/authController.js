const userDao = require('../dao/userDao');
const studentDao = require('../dao/studentDao');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { TEACHER_ROLE } = require('../utility/userRoles');

const authController = {
    login: async (request, response) => {
        const rawEmail = request.body.email;
        const rawRegNo = request.body.registrationNumber;
        const password = request.body.password;

        const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
        const registrationNumber = (rawRegNo != null && rawRegNo !== '') ? String(rawRegNo).trim() : '';

        try {
            let user;
            // Support login via email OR registration number (normalized for reliable lookup)
            if (registrationNumber) {
                const student = await studentDao.findByRegistrationNumber(registrationNumber);
                if (student && student.userId) {
                    user = student.userId;
                }
            } else if (email) {
                user = await userDao.findByEmailCaseInsensitive(email);
            }

            if (!user) {
                return response.status(400).json({ success: false, message: 'Invalid credentials' });
            }

            if (user.isActive === false) {
                return response.status(403).json({ success: false, message: 'Account is deactivated. Contact support.' });
            }

            const isPasswordMatched = password && user.password && await bcrypt.compare(password, user.password);
            if (!isPasswordMatched) {
                return response.status(400).json({ success: false, message: 'Invalid credentials' });
            }

            const rememberMe = request.body.rememberMe === true;
            const expiresIn = rememberMe ? '24h' : '1h';

            const token = jwt.sign({
                name: user.name,
                email: user.email,
                _id: user._id,
                role: user.role
            }, process.env.JWT_SECRET, { expiresIn });

            response.cookie('jwtToken', token, {
                httpOnly: true,
                secure: true, // Required for sameSite: 'none'
                path: '/',
                sameSite: 'none',
                maxAge: rememberMe ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000
            });

            return response.status(200).json({
                success: true,
                message: 'User authenticated',
                data: {
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        requirePasswordChange: user.requirePasswordChange ?? false
                    }
                }
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    register: async (request, response) => {
        // ... keeping existing register for fallback, though Developer usually handles this ...
        const { name, email, password } = request.body;
        if (!name || !email || !password) return response.status(400).json({ message: 'Required fields missing' });

        try {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const user = await userDao.create({ name, email, password: hashedPassword, role: TEACHER_ROLE });
            return response.status(200).json({ message: 'User registered', user: { id: user._id } });
        } catch (error) {
            if (error.code === 'USER_EXIST') return response.status(400).json({ message: 'User already exists' });
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    isUserLoggedIn: async (request, response) => {
        try {
            const token = request.cookies?.jwtToken;
            if (!token) return response.status(401).json({ message: 'Unauthorized access' });

            // Using decoded token to find fresh user data if needed
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await userDao.findById(decoded._id);
            if (!user) return response.status(401).json({ message: 'User not found' });

            return response.status(200).json({
                success: true,
                data: {
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                }
            });
        } catch (error) {
            return response.status(401).json({ success: false, message: 'Invalid session' });
        }
    },

    logout: async (request, response) => {
        response.clearCookie('jwtToken');
        return response.json({ message: 'Logout successful' });
    },

    // 📱 STUDENT PASSWORD RESET (VIA TEACHER OTP)
    forgotPasswordStudent: async (request, response) => {
        try {
            const { registrationNumber } = request.body;
            if (!registrationNumber) return response.status(400).json({ message: 'Registration number required' });

            const student = await studentDao.findByRegistrationNumber(registrationNumber);
            if (!student) return response.status(404).json({ message: 'Student not found in the system' });

            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            const user = student.userId;
            user.resetPasswordToken = otp;
            user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 mins
            await user.save();

            const Notification = require('../models/Notification');
            await Notification.create({
                userId: student.teacherId, // To Teacher
                type: 'general',
                message: `🔑 Password Reset OTP: Student ${user.name} (${registrationNumber}) requested a reset. OTP: ${otp}. Valid for 15 mins.`
            });

            return response.status(200).json({ success: true, message: 'OTP has been sent to your teacher' });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ success: false, message: 'Could not process request' });
        }
    },

    // 👤 GENERAL FORGOT PASSWORD (FOR TEACHER, PARENT, DEV)
    forgotPassword: async (request, response) => {
        try {
            const { identifier, role } = request.body; // identifier is email or regNo

            // Delegate to student logic if role is student
            if (role === 'student') {
                request.body.registrationNumber = identifier; // Map identifier to regNo
                return authController.forgotPasswordStudent(request, response);
            }

            const user = await userDao.findByEmail(identifier);
            if (!user) {
                // Return success anyway for security to avoid email enumeration
                return response.status(200).json({ success: true, message: 'If an account exists, a reset link has been sent' });
            }

            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            user.resetPasswordToken = token;
            user.resetPasswordExpire = Date.now() + 3600000;
            await user.save();

            const emailService = require('../services/emailService');
            const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${token}`;

            await emailService.send(
                identifier,
                '🔐 Access Recovery: NomadPulse Portal',
                `Institutional Protocol Initiative detected.\n\nTo restore your portal access, navigate to terminal: ${resetUrl}\n\nNote: This link expires in 60 minutes.`
            );

            return response.status(200).json({ success: true, message: 'Reset link dispatched' });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ success: false, message: 'Critical failure in transmission' });
        }
    },

    resetPasswordStudent: async (request, response) => {
        try {
            const { registrationNumber, otp, newPassword } = request.body;
            if (!registrationNumber || !otp || !newPassword) {
                return response.status(400).json({ message: 'All fields are required' });
            }

            const student = await studentDao.findByRegistrationNumber(registrationNumber);
            if (!student) return response.status(404).json({ message: 'Student not found' });

            const user = student.userId;

            // Verify OTP
            if (user.resetPasswordToken !== otp || user.resetPasswordExpire < Date.now()) {
                return response.status(400).json({ message: 'Invalid or expired OTP. Request again.' });
            }

            // Update Password
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);

            // Clear OTP
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;

            await user.save();

            return response.status(200).json({ success: true, message: 'Password reset successful. Please login.' });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    resetPassword: async (request, response) => {
        try {
            const { token } = request.params;
            const { newPassword } = request.body;

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await userDao.findById(decoded._id);

            if (!user || user.resetPasswordToken !== token || user.resetPasswordExpire < Date.now()) {
                return response.status(400).json({ success: false, message: 'Invalid or expired recovery token' });
            }

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();

            return response.status(200).json({ success: true, message: 'Identity credentials updated' });
        } catch (error) {
            return response.status(400).json({ success: false, message: 'Recovery session expired' });
        }
    },

    changePassword: async (request, response) => {
        try {
            const { currentPassword, newPassword } = request.body;
            const user = await userDao.findById(request.user._id);

            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return response.status(400).json({ message: 'Current password incorrect' });

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
            user.requirePasswordChange = false;
            await user.save();

            return response.status(200).json({ message: 'Password updated successfully' });
        } catch (error) {
            return response.status(500).json({ message: 'Internal server error' });
        }
    }
};

module.exports = authController;
