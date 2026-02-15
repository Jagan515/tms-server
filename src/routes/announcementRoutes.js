const express = require('express');
const announcementController = require('../controllers/announcementController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeMiddleware = require('../middlewares/authorizeMiddleware');

const router = express.Router();

router.use(authMiddleware.protect);

router.post(
    '/create',
    authorizeMiddleware('announcements:create'),
    announcementController.create
);

router.get(
    '/my-announcements',
    authorizeMiddleware('announcements:view'),
    announcementController.getMine
);

router.delete(
    '/delete/:id',
    authorizeMiddleware('announcements:delete'),
    announcementController.delete
);

module.exports = router;
