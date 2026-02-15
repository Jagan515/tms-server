const { body, validationResult } = require('express-validator');

const loginRules = [
    body('password').notEmpty().withMessage('Password is required'),
    body().custom((value, { req }) => {
        const hasEmail = req.body.email != null && String(req.body.email).trim() !== '';
        const hasRegNo = req.body.registrationNumber != null && String(req.body.registrationNumber).trim() !== '';
        if (!hasEmail && !hasRegNo) {
            throw new Error('Email or Registration Number is required');
        }
        if (hasEmail && !/^\S+@\S+\.\S+$/.test(String(req.body.email).trim())) {
            throw new Error('Invalid email format');
        }
        return true;
    })
];

const resetPasswordRules = [
    body('email').notEmpty().isEmail(),
    body('otp').notEmpty().isNumeric().isLength({ min: 6, max: 6 }),
    body('newPassword').notEmpty().isLength({ min: 3 })
];

const loginValidator = async (request, response, next) => {
    for (const rule of loginRules) {
        await rule.run(request);
    }
    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(400).json({ errors: errors.array() });
    }
    next();
};

const resetPasswordValidator = async (request, response, next) => {
    for (const rule of resetPasswordRules) {
        await rule.run(request);
    }
    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = {
    loginValidator,
    resetPasswordValidator
};
