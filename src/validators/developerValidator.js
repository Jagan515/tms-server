const { body, validationResult } = require('express-validator');

const teacherCreateRules = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone number is required')
];

const resetRules = [
    body('email').isEmail()
];

const teacherCreateValidator = async (req, res, next) => {

    for (const rule of teacherCreateRules) {
        await rule.run(req);
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    next();
};

const resetValidator = async (req, res, next) => {

    for (const rule of resetRules) {
        await rule.run(req);
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    next();
};

module.exports = {
    teacherCreateValidator,
    resetValidator
};
