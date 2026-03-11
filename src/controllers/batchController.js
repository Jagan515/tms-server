const batchService = require('../services/batchService');
const asyncHandler = require('../utility/asyncHandler');
const ApiError = require('../utility/apiError');

const batchController = {
    getAll: asyncHandler(async (request, response) => {
        const { page, limit, search } = request.query;
        const teacherId = request.user._id;

        const isAll = limit === 'all';
        const data = await batchService.getAllBatches(
            teacherId,
            isAll ? 1 : (Number(page) || 1),
            isAll ? 1000 : (Number(limit) || 10),
            search || ''
        );

        return response.status(200).json(data);
    }),

    getDetail: asyncHandler(async (request, response) => {
        const { id } = request.params;
        const data = await batchService.getBatchDetails(id);
        if (!data) {
            throw new ApiError(404, 'Batch profile not identified in registry.');
        }
        return response.status(200).json(data);
    }),

    create: asyncHandler(async (request, response) => {
        const teacherId = request.user._id;
        const batch = await batchService.createBatch(request.body, teacherId);

        return response.status(201).json({
            message: 'Batch created successfully',
            batch: batch
        });
    }),

    update: asyncHandler(async (request, response) => {
        const { id } = request.params;
        const updated = await batchService.updateBatch(id, request.body);

        return response.status(200).json({
            message: 'Batch updated successfully',
            batch: updated
        });
    }),

    delete: asyncHandler(async (request, response) => {
        const { id } = request.params;
        await batchService.deleteBatch(id);
        return response.status(200).json({
            message: 'Batch deleted successfully'
        });
    }),

    getStats: asyncHandler(async (request, response) => {
        const teacherId = request.user._id;
        const result = await batchService.getAllBatches(teacherId, 1, 1000);
        return response.status(200).json({
            totalBatches: result.batches.length,
            totalStudents: result.batches.reduce((acc, b) => acc + (b.studentCount || 0), 0)
        });
    })
};

module.exports = batchController;
