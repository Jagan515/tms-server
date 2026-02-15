const express = require('express');
const marksController = require('../controllers/marksController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = express.Router();

router.use(authMiddleware.protect);

// Teacher lists/filters marks
router.get(
    '/',
    requireRole('teacher'),
    marksController.getMarks
);

// Student submits school marks for verification
router.post(
    '/submit-school',
    requireRole('student'),
    marksController.submitSchoolMarks
);
router.post('/school', requireRole('student'), marksController.submitSchoolMarks);

// Teacher adds tuition marks directly (auto-approved)
router.post(
    '/add-tuition',
    requireRole('teacher'),
    marksController.addTuitionMarks
);
router.post('/tuition', requireRole('teacher'), marksController.addTuitionMarks);

// Teacher approves submitted school marks
router.patch('/approve/:id', requireRole('teacher'), marksController.approveMark);
router.patch('/:id/approve', requireRole('teacher'), marksController.approveMark);

// Teacher rejects submitted school marks
router.patch('/reject-bulk', requireRole('teacher'), marksController.rejectBulk);
router.patch('/reject/:id', requireRole('teacher'), marksController.rejectMark);
router.patch('/:id/reject', requireRole('teacher'), marksController.rejectMark);

// Teacher edits and approves in one action
router.patch('/edit-approve/:id', requireRole('teacher'), marksController.editAndApprove);
router.patch('/:id/edit-approve', requireRole('teacher'), marksController.editAndApprove);

// Get my marks (for student/parent logged in)
router.get(
    '/my-report',
    marksController.getMyReport
);

// Get marks report (role-based filtering inside controller)
router.get('/report/:studentId', requireRole(['teacher', 'student', 'parent']), marksController.getReport);
router.get('/stats/:studentId', requireRole(['teacher', 'student', 'parent']), marksController.getReport);

module.exports = router;
