/**
 * Ownership validation helper
 * Ensures teachers can only access their own students
 */
const Student = require('../models/Student');

const ownershipValidation = {

    /**
     * Validate teacher owns the student
     */
    validateStudentOwnership: async (studentId, teacherId) => {
        const student = await Student.findById(studentId);

        if (!student) {
            // Return 404 to prevent information leakage
            throw { status: 404, message: 'Student not found' };
        }

        if (student.teacherId.toString() !== teacherId.toString()) {
            // Return 404 (not 403) to prevent enumeration attacks
            throw { status: 404, message: 'Student not found' };
        }

        return student;
    },

    /**
     * Validate parent-child relationship
     */
    validateParentChildRelationship: async (studentId, parentId) => {
        const student = await Student.findById(studentId).populate('parentId');

        if (!student || !student.parentId) {
            throw { status: 404, message: 'Student not found' };
        }

        if (student.parentId._id.toString() !== parentId.toString()) {
            throw { status: 404, message: 'Student not found' };
        }

        return student;
    },

    /**
     * Middleware to validate student ownership in route params
     */
    requireStudentOwnership: async (req, res, next) => {
        try {
            const studentId = req.params.studentId || req.params.id;
            const teacherId = req.user._id;

            await ownershipValidation.validateStudentOwnership(studentId, teacherId);
            next();
        } catch (error) {
            return res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }
};

module.exports = ownershipValidation;
