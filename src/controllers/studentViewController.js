const studentViewService = require('../services/studentViewService');
const asyncHandler = require('../utility/asyncHandler');
const ApiError = require('../utility/apiError');

const studentViewController = {

    dashboard: asyncHandler(async (request, response) => {
        const data = await studentViewService.getDashboardData(request.user._id);
        return response.status(200).json(data);
    }),

    submitSchoolMarks: asyncHandler(async (request, response) => {
        const data = await studentViewService.submitSchoolMarks(request.user._id, request.body);
        return response.status(201).json(data);
    }),

    attendance: asyncHandler(async (request, response) => {
        const page = parseInt(request.query.page) || 1;
        const limit = parseInt(request.query.limit) || 10;

        const data = await studentViewService.getMyAttendance(
            request.user._id,
            page,
            limit
        );

        return response.status(200).json(data);
    }),

    marks: asyncHandler(async (request, response) => {
        const page = parseInt(request.query.page) || 1;
        const limit = parseInt(request.query.limit) || 10;

        const data = await studentViewService.getMyMarks(
            request.user._id,
            page,
            limit
        );

        return response.status(200).json(data);
    })

};

module.exports = studentViewController;
