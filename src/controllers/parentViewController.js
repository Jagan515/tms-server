const parentViewService = require('../services/parentViewService');

const parentViewController = {

    getChildren: async (request, response) => {
        try {
            const data = await parentViewService.getChildren(request.user._id);
            return response.status(200).json(data);
        } catch (error) {
            console.error(error);
            return response.status(500).json({ message: error.message || 'Internal server error' });
        }
    },

    getChildDashboard: async (request, response) => {
        try {
            const { studentId } = request.params;
            const data = await parentViewService.getChildDashboard(request.user._id, studentId);
            return response.status(200).json(data);
        } catch (error) {
            console.error(error);
            // Distinguish between 404/403 and 500 later if needed
            return response.status(500).json({ message: error.message || 'Internal server error' });
        }
    }

};

module.exports = parentViewController;
