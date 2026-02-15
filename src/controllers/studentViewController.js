const studentViewService = require('../services/studentViewService');

const studentViewController = {

    dashboard: async (request, response) => {
        try {
            const data = await studentViewService.getDashboardData(request.user._id);
            return response.status(200).json(data);
        } catch (error) {
            console.error(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    submitSchoolMarks: async (request, response) => {
        try {
            console.log("Submitting marks for user:", request.user._id);
            console.log("Payload:", JSON.stringify(request.body));
            const data = await studentViewService.submitSchoolMarks(request.user._id, request.body);
            console.log("Submission successful:", data);
            return response.status(201).json(data);
        } catch (error) {
            console.error("Submission error:", error);
            return response.status(500).json({ message: error.message || 'Internal server error' });
        }
    },

    attendance: async (request, response) => {
        try {
            const page = parseInt(request.query.page) || 1;
            const limit = parseInt(request.query.limit) || 10;

            const data = await studentViewService.getMyAttendance(
                request.user._id,
                page,
                limit
            );

            return response.status(200).json(data);
        } catch (error) {
            console.error(error);
            return response.status(500).json({
                message: 'Internal server error'
            });
        }
    },

    marks: async (request, response) => {

        try {

            const page = parseInt(request.query.page) || 1;
            const limit = parseInt(request.query.limit) || 10;

            const data = await studentViewService.getMyMarks(
                request.user._id,
                page,
                limit
            );

            return response.status(200).json(data);

        } catch (error) {

            return response.status(500).json({
                message: 'Internal server error'
            });
        }
    }

};

module.exports = studentViewController;
