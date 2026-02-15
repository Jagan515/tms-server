const { body, validationResult } = require('express-validator');

const feeRules = [
    body('studentId').notEmpty(),
    body('month').isNumeric(),
    body('year').isNumeric(),
    body('amount').isNumeric()
];

const feeValidator = async (req, res, next) => {

    for (const rule of feeRules) {
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

module.exports = feeValidator;
