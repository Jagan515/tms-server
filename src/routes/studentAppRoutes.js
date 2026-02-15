const express = require('express');
const studentAppController = require('../controllers/studentAppController');
const authMiddleware = require('../middlewares/authMiddleware');
const { marksSubmissionLimiter, sensitiveActionLimiter } = require('../middlewares/rateLimitMiddleware');

const router = express.Router();

// All routes require authentication as a Student
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('student'));

// 5.1 Dashboard
router.get('/dashboard', studentAppController.getDashboard);

// 5.2 Attendance
router.get('/attendance', studentAppController.getAttendance);
router.get('/attendance/calendar', studentAppController.getAttendanceCalendar);

// 5.3 Marks
router.get('/marks', studentAppController.getMarks);
router.post('/marks/submit-school', marksSubmissionLimiter, studentAppController.submitSchoolMarks);
router.get('/marks/pending', studentAppController.getPendingMarks);
router.get('/marks/rejected', studentAppController.getRejectedMarks);

// 5.8 Fees
router.get('/fees', studentAppController.getFeeStatus);

// 5.9 Announcements
router.get('/announcements', studentAppController.getAnnouncements);

// 5.10 Profile
router.get('/profile', studentAppController.getProfile);

module.exports = router;
