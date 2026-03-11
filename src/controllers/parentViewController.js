const parentViewService = require('../services/parentViewService');
const Parent = require('../models/Parent');
const asyncHandler = require('../utility/asyncHandler');
const ApiError = require('../utility/apiError');

const parentViewController = {

    getChildren: asyncHandler(async (request, response) => {
        const parent = await Parent.findOne({ userId: request.user._id });
        if (!parent) {
            throw new ApiError(404, 'Guardian profile not identified in registry.');
        }

        const data = await parentViewService.getChildren(parent._id);
        return response.status(200).json(data);
    }),

    getChildDashboard: asyncHandler(async (request, response) => {
        const { studentId } = request.params;
        const parent = await Parent.findOne({ userId: request.user._id });
        if (!parent) {
            throw new ApiError(404, 'Guardian profile not identified in registry.');
        }

        // Security check: Ensure this child belongs to this parent
        const isAuthorized = await parentViewService.validateParentChildRelationship(parent._id, studentId);
        if (!isAuthorized) {
            throw new ApiError(403, 'Unauthorized access: Ward linkage verify failure.');
        }

        const data = await parentViewService.getChildDashboard(parent._id, studentId);
        return response.status(200).json(data);
    })
};

module.exports = parentViewController;
