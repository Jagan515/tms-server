const express = require('express');
const parentController = require('../controllers/parentController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = express.Router();

router.use(authMiddleware.protect);
router.use(requireRole('parent'));

// List all children for selection
router.get('/children', parentController.getChildren);

// Specific child dashboard
router.get('/dashboard', parentController.getChildDashboard);
router.get('/child/:studentId/dashboard', parentController.getChildDashboard);

// Combined fee view across all children
router.get('/fees/combined', parentController.getCombinedFees);

// Profile management
router.get('/profile', parentController.getProfile);

module.exports = router;
