const { body, validationResult } = require('express-validator');

const batchRules = [
    body('name').notEmpty(),
    body('class').notEmpty(),
    body('year').isNumeric()
];

const batchValidator = async (req, res, next) => {

    for (const rule of batchRules) {
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

module.exports = batchValidator;
