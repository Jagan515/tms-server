const batchService = require('../services/batchService');

const batchController = {
    getAll: async (request, response) => {
        try {
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
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    getDetail: async (request, response) => {
        try {
            const { id } = request.params;
            const data = await batchService.getBatchDetails(id);
            return response.status(200).json(data);
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    create: async (request, response) => {
        try {
            const teacherId = request.user._id;
            const batch = await batchService.createBatch(request.body, teacherId);

            return response.status(201).json({
                message: 'Batch created successfully',
                batch: batch
            });
        } catch (error) {
            console.log(error);
            return response.status(400).json({ message: error.message || 'Creation failed' });
        }
    },

    update: async (request, response) => {
        try {
            const { id } = request.params;
            const updated = await batchService.updateBatch(id, request.body);

            return response.status(200).json({
                message: 'Batch updated successfully',
                batch: updated
            });
        } catch (error) {
            console.log(error);
            return response.status(400).json({ message: error.message || 'Update failed' });
        }
    },

    delete: async (request, response) => {
        try {
            const { id } = request.params;
            await batchService.deleteBatch(id);
            return response.status(200).json({
                message: 'Batch deleted successfully'
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    // Added to prevent crash
    getStats: async (request, response) => {
        try {
            const teacherId = request.user._id;
            const result = await batchService.getAllBatches(teacherId, 1, 1000);
            return response.status(200).json({
                totalBatches: result.batches.length,
                totalStudents: result.batches.reduce((acc, b) => acc + (b.studentCount || 0), 0)
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    }
};

module.exports = batchController;
