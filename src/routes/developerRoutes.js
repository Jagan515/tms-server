const express = require('express');
const developerController = require('../controllers/developerController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeMiddleware = require('../middlewares/authorizeMiddleware');
const {
    teacherCreateValidator,
    resetValidator
} = require('../validators/developerValidator');

const router = express.Router();

// Protect all developer routes
router.use(authMiddleware.protect);

// Stats
router.get('/stats', authorizeMiddleware('developer:stats'), developerController.getStats);

// Audit Logs
router.get('/audit-logs', authorizeMiddleware('developer:audit'), developerController.getAuditLogs);

// Teacher Management
router.get('/teachers', authorizeMiddleware('teachers:view'), developerController.getAllTeachers);
router.get('/teachers/:id', authorizeMiddleware('teachers:view'), developerController.getTeacherDetails);
router.post('/teachers/create', authorizeMiddleware('teachers:create'), teacherCreateValidator, developerController.createTeacher);
router.patch('/teachers/:id/status', authorizeMiddleware('teachers:update'), developerController.toggleStatus);
router.delete('/teachers/:id', authorizeMiddleware('teachers:delete'), developerController.deleteTeacher);

// User Management (Generic)
router.post('/users/reset-password', authorizeMiddleware('users:reset'), resetValidator, developerController.resetPassword);

module.exports = router;
