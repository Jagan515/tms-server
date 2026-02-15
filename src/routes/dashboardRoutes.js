const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeMiddleware = require('../middlewares/authorizeMiddleware');

const router = express.Router();

router.use(authMiddleware.protect);

router.get(
    '/teacher',
    authorizeMiddleware('dashboard:view'),
    dashboardController.teacherDashboard
);

router.get(
    '/system',
    authorizeMiddleware('dashboard:system:view'),
    dashboardController.systemDashboard
);

router.get(
    '/student',
    dashboardController.studentDashboard
);

module.exports = router;
