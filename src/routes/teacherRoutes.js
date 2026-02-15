const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeMiddleware = require('../middlewares/authorizeMiddleware');

const teacherController = require('../controllers/teacherController');

const router = express.Router();

router.use(authMiddleware.protect);

// Teacher Dashboard
router.get('/dashboard', authorizeMiddleware('dashboard:view'), teacherController.getDashboardStats);

// Update Profile
router.put('/profile', teacherController.updateProfile);

// Email Preferences
router.get('/email-preferences', teacherController.getEmailPreferences);
router.put('/email-preferences', teacherController.updateEmailPreferences);


module.exports = router;
