const dashboardService = require('../services/dashboardService');
const Teacher = require('../models/Teacher');


const teacherController = {

    getDashboardStats: async (req, res) => {
        try {
            const teacherId = req.user._id;
            const stats = await dashboardService.getTeacherDashboard(teacherId);

            return res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Teacher Dashboard Error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    updateProfile: async (req, res) => {
        try {
            const userId = req.user._id;
            const { name, phone } = req.body;
            const User = require('../models/User');

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { name, phone },
                { new: true, runValidators: true }
            ).select('-password');

            return res.status(200).json({
                success: true,
                message: "Profile updated",
                user: updatedUser
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },

    getEmailPreferences: async (req, res) => {
        try {
            const userId = req.user._id;
            let teacher = await Teacher.findOne({ userId });

            if (!teacher) {
                // Auto-create profile if missing (use adminId from user model or current user)
                const User = require('../models/User');
                const user = await User.findById(userId);

                teacher = await Teacher.create({
                    userId,
                    phone: user.phone || "0000000000",
                    createdBy: user.adminId || userId,
                    emailPreferences: {
                        masterToggle: true,
                        attendanceEmails: true,
                        marksEmails: true,
                        feeEmails: true,
                        announcementEmails: true
                    }
                });
            }

            return res.status(200).json({
                success: true,
                emailPreferences: teacher.emailPreferences || {}
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },

    updateEmailPreferences: async (req, res) => {
        try {
            const userId = req.user._id;
            const { emailPreferences } = req.body;

            let teacher = await Teacher.findOneAndUpdate(
                { userId },
                { emailPreferences },
                { new: true, upsert: false } // We shouldn't upsert without createdBy
            );

            if (!teacher) {
                // If not found, it means it wasn't auto-created by get, or failed.
                // Re-running the creation logic.
                const User = require('../models/User');
                const user = await User.findById(userId);
                teacher = await Teacher.create({
                    userId,
                    createdBy: user.adminId || userId,
                    emailPreferences
                });
            }

            return res.status(200).json({
                success: true,
                message: "Email preferences updated",
                emailPreferences: teacher.emailPreferences
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },

};

module.exports = teacherController;
