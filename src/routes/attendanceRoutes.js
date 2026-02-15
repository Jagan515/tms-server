const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = express.Router();

router.use(authMiddleware.protect);

// Loads existing session or creates a new one
router.get(
    '/session',
    requireRole('teacher'),
    attendanceController.getSession
);

// Daily overview for selected date
router.get(
    '/daily-overview',
    requireRole('teacher'),
    attendanceController.getDailyOverview
);

// Marks a single student for a session
router.patch(
    '/record',
    requireRole('teacher'),
    attendanceController.patchRecord
);

// Bulk marks entire batch present/absent
router.patch(
    '/bulk-record',
    requireRole('teacher'),
    attendanceController.bulkPatch
);

router.get(
    '/history/:batchId',
    requireRole('teacher'),
    attendanceController.getHistory
);

// Custom session attendance (for makeup classes, etc.)
router.post(
    '/custom',
    requireRole('teacher'),
    attendanceController.recordCustom
);

// Stats for child monitoring
router.get(
    '/stats/:studentId',
    requireRole(['teacher', 'parent', 'student']),
    attendanceController.getStudentStats
);

router.get(
    '/my-calendar',
    requireRole(['student']),
    attendanceController.getMyCalendar
);

module.exports = router;
