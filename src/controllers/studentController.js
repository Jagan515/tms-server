const studentService = require('../services/studentService');

const studentController = {
    getAll: async (request, response) => {
        try {
            const { page, limit, search, batchId } = request.query;
            const teacherId = request.user._id;

            const data = await studentService.getAllStudents(
                teacherId,
                Number(page) || 1,
                Number(limit) || 10,
                search || '',
                batchId
            );

            return response.status(200).json(data);
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    create: async (request, response) => {
        try {
            const teacherId = request.user._id;
            const result = await studentService.createStudent(request.body, teacherId);

            return response.status(201).json({
                message: 'Student enrolled successfully',
                data: result
            });
        } catch (error) {
            console.log(error);
            return response.status(400).json({ message: error.message || 'Enrollment failed' });
        }
    },

    update: async (request, response) => {
        try {
            const teacherId = request.user._id;
            const updated = await studentService.updateStudent(
                request.params.id,
                request.body,
                teacherId,
                request.user
            );
            return response.status(200).json({
                message: 'Student updated successfully',
                student: updated
            });
        } catch (error) {
            console.log(error);
            return response.status(400).json({ message: error.message || 'Update failed' });
        }
    },

    getDetail: async (request, response) => {
        try {
            const teacherId = request.user._id;
            const data = await studentService.getStudentDetails(request.params.id, teacherId);
            return response.status(200).json(data);
        } catch (error) {
            console.log(error);
            return response.status(404).json({ message: error.message || 'Student not found' });
        }
    },

    delete: async (request, response) => {
        try {
            const { id } = request.params;
            const { confirmation } = request.body; // Expecting "DELETE" string
            const teacherId = request.user._id;

            if (confirmation !== 'DELETE') {
                return response.status(400).json({ message: 'Verification failed. Please type DELETE to confirm.' });
            }

            const result = await studentService.deleteStudent(id, true, teacherId);
            return response.status(200).json(result);
        } catch (error) {
            console.log(error);
            return response.status(400).json({ message: error.message || 'Deletion failed' });
        }
    },

    transfer: async (request, response) => {
        try {
            const { id } = request.params;
            const { targetTeacherEmail, confirmation } = request.body; // Expecting "TRANSFER"
            const currentTeacherId = request.user._id;

            if (confirmation !== 'TRANSFER') {
                return response.status(400).json({ message: 'Verification failed. Please type TRANSFER to confirm.' });
            }

            const result = await studentService.transferStudent(id, targetTeacherEmail, currentTeacherId);
            return response.status(200).json(result);
        } catch (error) {
            console.log(error);
            return response.status(400).json({ message: error.message || 'Transfer failed' });
        }
    },

    checkParent: async (request, response) => {
        try {
            const { email } = request.query;
            const User = require('../models/User');
            const user = await User.findOne({ email, role: 'parent' });

            if (user) {
                return response.status(200).json({
                    exists: true,
                    name: user.name,
                    userId: user._id
                });
            }
            return response.status(200).json({ exists: false });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    }
};

module.exports = studentController;
