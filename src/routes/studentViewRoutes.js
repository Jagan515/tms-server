const express = require('express');
const studentViewController = require('../controllers/studentViewController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeMiddleware = require('../middlewares/authorizeMiddleware');

const router = express.Router();

router.use(authMiddleware.protect);

router.get(
    '/attendance',
    authorizeMiddleware('attendance:self:view'),
    studentViewController.attendance
);

router.get(
    '/marks',
    authorizeMiddleware('marks:self:view'),
    studentViewController.marks
);

router.get(
    '/dashboard',
    authorizeMiddleware('dashboard:view'),
    studentViewController.dashboard
);

router.post(
    '/marks/custom',
    authorizeMiddleware('marks:self:create'),
    studentViewController.submitSchoolMarks
);

module.exports = router;
