const express = require('express');
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware.protect);

router.post('/send', messageController.send);
router.get('/inbox', messageController.getInbox);
router.get('/sent', messageController.getSent);
router.patch('/:id/read', messageController.markRead);
router.delete('/:id', messageController.delete);

module.exports = router;
