const { body, validationResult } = require('express-validator');

const studentValidator = [
    body('name').notEmpty().withMessage('Name is required'),
    body('class').notEmpty().withMessage('Class is required'),
    body('school').notEmpty().withMessage('School is required'),
    body('year').optional().isNumeric().withMessage('Year must be a number'),
    body('monthlyFee').isNumeric().withMessage('Monthly Fee must be a number'),
    body('contacts').isArray({ min: 1 }).withMessage('At least one contact is required'),
    body('contacts.*.name').notEmpty().withMessage('Contact Name is required'),
    body('contacts.*.email').isEmail().withMessage('Valid Contact Email is required'),
    body('feePaymentDay').optional().isInt({ min: 1, max: 28 }).withMessage('Fee Due Day must be between 1 and 28'),
    body('joiningDate').optional().isISO8601().withMessage('Valid Joining Date is required'),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            });
        }

        next();
    }
];

module.exports = studentValidator;
