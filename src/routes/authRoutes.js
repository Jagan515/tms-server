const express = require('express');
const authController = require('../controllers/authController');
const { loginValidator } = require('../validators/authValidators');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/login', loginValidator, authController.login);
router.post('/:role/login', loginValidator, authController.login);
router.post('/register', authController.register);
router.post('/logout', authController.logout);
router.post('/is-user-logged-in', authController.isUserLoggedIn);
router.get('/me', authMiddleware.protect, authController.isUserLoggedIn);

// Student Password Reset Flow (Teacher OTP)
router.post('/student/forgot-password', authController.forgotPasswordStudent);
router.post('/student/reset-password', authController.resetPasswordStudent);

// Generic Aliases for client
router.post('/forgot-password', authController.forgotPassword);
router.put('/reset-password/:token', authController.resetPassword);

// Account Management
router.post('/change-password', authMiddleware.protect, authController.changePassword);

module.exports = router;
