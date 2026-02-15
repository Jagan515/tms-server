const express = require('express');
const parentViewController = require('../controllers/parentViewController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeMiddleware = require('../middlewares/authorizeMiddleware');

const router = express.Router();

router.use(authMiddleware.protect);

router.get(
    '/children',
    authorizeMiddleware('students:child:view'),
    parentViewController.getChildren
);

router.get(
    '/child/:studentId/dashboard',
    authorizeMiddleware('dashboard:child:view'),
    parentViewController.getChildDashboard
);

module.exports = router;
