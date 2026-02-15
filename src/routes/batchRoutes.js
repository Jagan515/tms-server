const express = require('express');
const batchController = require('../controllers/batchController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeMiddleware = require('../middlewares/authorizeMiddleware');

const router = express.Router();

// Apply global protection
router.use(authMiddleware.protect);

router.get(
    '/',
    authorizeMiddleware('batches:view'),
    batchController.getAll
);

router.post(
    '/',
    authorizeMiddleware('batches:create'),
    batchController.create
);

router.patch(
    '/:id',
    authorizeMiddleware('batches:update'),
    batchController.update
);

router.get(
    '/stats',
    authorizeMiddleware('batches:view'),
    batchController.getStats
);

module.exports = router;
