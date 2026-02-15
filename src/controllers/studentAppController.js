const studentViewService = require('../services/studentViewService');
const marksService = require('../services/marksService');
const feeService = require('../services/feeService');
const announcementService = require('../services/announcementService');
const attendanceService = require('../services/attendanceService');
const Student = require('../models/Student'); // Import Student model

const studentAppController = {

    // 5.1 Get Student Dashboard
    getDashboard: async (req, res) => {
        try {
            const student = await Student.findOne({ userId: req.user._id });
            if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

            const dashboard = await studentViewService.getStudentDashboard(student._id);
            res.status(200).json({ success: true, data: dashboard });
        } catch (error) {
            console.error('Student Dashboard Error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    // 5.2 Get Attendance History
    getAttendance: async (req, res) => {
        try {
            const student = await Student.findOne({ userId: req.user._id });
            if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

            const { month, year, type } = req.query;
            const data = await attendanceService.getStudentAttendanceHistory(student._id, month, year, type);
            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('Student Attendance Error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    // 5.3 Get Attendance Calendar
    getAttendanceCalendar: async (req, res) => {
        try {
            const student = await Student.findOne({ userId: req.user._id });
            if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

            const { month, year } = req.query;
            const data = await attendanceService.getStudentAttendanceCalendar(student._id, month, year);
            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('Attendance Calendar Error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    // 5.4 Get Marks Report
    getMarks: async (req, res) => {
        try {
            const student = await Student.findOne({ userId: req.user._id });
            if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

            const { category, subject } = req.query;
            const data = await marksService.getStudentMarksReport(student._id, category, subject);
            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('Marks Report Error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    // 5.5 Submit School Marks
    submitSchoolMarks: async (req, res) => {
        try {
            const result = await marksService.submitSchoolMarks(req.body, req.user._id);
            res.status(201).json({ success: true, data: result, message: 'Marks submitted successfully. Awaiting teacher approval.' });
        } catch (error) {
            console.error('Submit Marks Error:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    },

    // 5.6 Get Pending Marks
    getPendingMarks: async (req, res) => {
        try {
            const student = await Student.findOne({ userId: req.user._id });
            if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

            const data = await marksService.getPendingMarks(student._id);
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    // 5.7 Get Rejected Marks
    getRejectedMarks: async (req, res) => {
        try {
            const student = await Student.findOne({ userId: req.user._id });
            if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

            const data = await marksService.getRejectedMarks(student._id);
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    // 5.8 Get Fee Status
    getFeeStatus: async (req, res) => {
        try {
            const student = await Student.findOne({ userId: req.user._id });
            if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

            const data = await feeService.getStudentFeeStatus(student._id);
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    // 5.9 Get Announcements
    getAnnouncements: async (req, res) => {
        try {
            const student = await Student.findOne({ userId: req.user._id });
            if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

            const { page, limit } = req.query;
            const data = await announcementService.getStudentAnnouncements(student._id, page, limit);
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    // 5.10 Get Profile
    getProfile: async (req, res) => {
        try {
            const student = await Student.findOne({ userId: req.user._id });
            if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

            const data = await studentViewService.getStudentProfile(student._id);
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
};

module.exports = studentAppController;
