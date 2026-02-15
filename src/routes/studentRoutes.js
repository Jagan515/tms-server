const express = require('express');
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');
const ownershipValidation = require('../middlewares/ownershipValidation');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.protect);

// Create student - Teacher only
router.post(
    '/create',
    requireRole('teacher'),
    studentController.create
);

// Get all students - Teacher only, auto-filtered by teacherId
router.get(
    '/',
    requireRole('teacher'),
    studentController.getAll
);

// Check parent existence
router.get(
    '/check-parent',
    requireRole('teacher'),
    studentController.checkParent
);

// Update student - Teacher only + Ownership validation
router.patch(
    '/:id',
    requireRole('teacher'),
    ownershipValidation.requireStudentOwnership,
    studentController.update
);

// Delete student - Teacher only + Ownership validation
router.delete(
    '/:id',
    requireRole('teacher'),
    ownershipValidation.requireStudentOwnership,
    studentController.delete
);

// Transfer student - Teacher only + Ownership validation
router.patch('/:id/transfer', requireRole('teacher'), ownershipValidation.requireStudentOwnership, studentController.transfer);
router.post('/:id/transfer', requireRole('teacher'), ownershipValidation.requireStudentOwnership, studentController.transfer);

module.exports = router;
