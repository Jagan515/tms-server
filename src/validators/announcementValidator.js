const { body, validationResult } = require('express-validator');

const announcementRules = [
    body('title').notEmpty(),
    body('message').notEmpty(),
    body('targetRole').isIn(['student', 'parent', 'both'])
];

const announcementValidator = async (req, res, next) => {

    for (const rule of announcementRules) {
        await rule.run(req);
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    next();
};

module.exports = announcementValidator;
