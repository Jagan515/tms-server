const express = require('express');
const auditController = require('../controllers/auditController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeMiddleware = require('../middlewares/authorizeMiddleware');

const router = express.Router();

router.use(authMiddleware.protect);

// 1. Get my own audit logs (Teacher/User)
router.get(
    '/my-trail',
    auditController.getTeacherLogs
);

// 2. Get specific entity logs (e.g. Student history)
router.get(
    '/entity/:entityType/:entityId',
    authorizeMiddleware('students:view'), // Assuming view perms are enough for history
    auditController.getEntityLogs
);

module.exports = router;
