const express = require('express');
const parentAppController = require('../controllers/parentAppController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// All routes require authentication as a Parent
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('parent'));

// 6.1 Dashboard
router.get('/dashboard', parentAppController.getDashboard);

// 6.2 Children List
router.get('/children', parentAppController.getChildren);

// 6.3 Child Dashboard (Specific Child View)
router.get('/children/:studentId/dashboard', parentAppController.getChildDashboard);

// 6.4 Fee Payment History
router.get('/fees/history', parentAppController.getFeePaymentHistory);

// 6.5 Messages / Announcements
router.get('/messages', parentAppController.getMessages);

module.exports = router;
