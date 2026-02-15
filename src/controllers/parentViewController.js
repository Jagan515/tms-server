const parentViewService = require('../services/parentViewService');
const Parent = require('../models/Parent');

const parentViewController = {

    getChildren: async (request, response) => {
        try {
            const parent = await Parent.findOne({ userId: request.user._id });
            if (!parent) return response.status(404).json({ message: 'Parent profile not found' });

            const data = await parentViewService.getChildren(parent._id);
            return response.status(200).json(data);
        } catch (error) {
            console.error(error);
            return response.status(500).json({ message: error.message || 'Internal server error' });
        }
    },

    getChildDashboard: async (request, response) => {
        try {
            const { studentId } = request.params;
            const parent = await Parent.findOne({ userId: request.user._id });
            if (!parent) return response.status(404).json({ message: 'Parent profile not found' });

            // Security check: Ensure this child belongs to this parent
            const isAuthorized = await parentViewService.validateParentChildRelationship(parent._id, studentId);
            if (!isAuthorized) {
                return response.status(403).json({ message: 'Unauthorized access to this student profile' });
            }

            const data = await parentViewService.getChildDashboard(parent._id, studentId);
            return response.status(200).json(data);
        } catch (error) {
            console.error(error);
            return response.status(500).json({ message: error.message || 'Internal server error' });
        }
    }
};

module.exports = parentViewController;
