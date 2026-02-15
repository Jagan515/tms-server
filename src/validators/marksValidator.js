const { body, validationResult } = require('express-validator');

const marksRules = [
    body('studentId').notEmpty(),
    body('type').isIn(['exam', 'task']),
    body('title').notEmpty(),
    body('marksObtained').isNumeric(),
    body('totalMarks').isNumeric(),
    body('date').notEmpty()
];

const marksValidator = async (req, res, next) => {

    for (const rule of marksRules) {
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

module.exports = marksValidator;
