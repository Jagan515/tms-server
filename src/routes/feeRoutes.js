const express = require('express');
const feeController = require('../controllers/feeController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = express.Router();

router.use(authMiddleware.protect);

// Teacher-only operations
router.post(
    '/generate-monthly',
    requireRole('teacher'),
    feeController.runAutoGeneration
);

router.get(
    '/registry',
    requireRole('teacher'),
    feeController.getRegistry
);

router.post(
    '/record-payment',
    requireRole('teacher'),
    feeController.recordPayment
);

router.get(
    '/defaulters',
    requireRole('teacher'),
    feeController.getDefaulters
);

router.get(
    '/history',
    requireRole('teacher'),
    feeController.getPaymentHistory
);

// Student/Parent can view their own fees
router.get(
    '/student/:studentId',
    requireRole(['teacher', 'student', 'parent']),
    feeController.getStudentFees
);

module.exports = router;
