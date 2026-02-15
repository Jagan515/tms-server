const { body, validationResult } = require('express-validator');

const attendanceRules = [
    body('batchId').notEmpty(),
    body('date').notEmpty(),
    body('records').isArray({ min: 1 })
];

const attendanceValidator = async (req, res, next) => {

    for (const rule of attendanceRules) {
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

module.exports = attendanceValidator;
