const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

const auditService = {

    log: async (data) => {
        try {
            // Validation to ensure mandatory fields are present
            if (!data.userId || !data.actionType || !data.entityType) {
                console.warn('[AuditService] Missing mandatory fields for audit log. Logging aborted.', {
                    userId: !!data.userId,
                    actionType: !!data.actionType,
                    entityType: !!data.entityType
                });
                return;
            }

            await AuditLog.create({
                userId: data.userId,
                actionType: data.actionType,
                entityType: data.entityType,
                entityId: data.entityId,
                oldValue: data.oldValue,
                newValue: data.newValue,
                ipAddress: data.ipAddress,
                metadata: data.metadata
            });
        } catch (error) {
            console.error('[AuditService] Failed to record audit log:', error.message);
        }
    },

    getLogsByEntity: async (entityType, entityId) => {
        return await AuditLog.find({ entityType, entityId }).sort({ createdAt: -1 });
    },

    getTeacherAuditTrail: async (teacherId, limit = 50) => {
        return await AuditLog.find({ userId: teacherId }).sort({ createdAt: -1 }).limit(limit);
    },

    getPagedLogs: async (filters = {}, page = 1, limit = 50) => {
        const query = {};

        if (filters.userId) query.userId = filters.userId;
        if (filters.actionType) query.actionType = filters.actionType;
        if (filters.entityType) query.entityType = filters.entityType;

        if (filters.search) {
            query.$or = [
                { actionType: { $regex: filters.search, $options: 'i' } },
                { entityType: { $regex: filters.search, $options: 'i' } },
                { entityId: mongoose.isValidObjectId(filters.search) ? filters.search : undefined }
            ].filter(cond => cond.entityId !== undefined || !cond.entityId);
        }

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        query.createdAt = { $gte: oneHourAgo };

        if (filters.startDate || filters.endDate) {
            // If user provides specific dates, we still respect the 1-hour ceiling 
            // but let them filter within that hour if they want.
            if (filters.startDate) {
                const start = new Date(filters.startDate);
                query.createdAt.$gte = start > oneHourAgo ? start : oneHourAgo;
            }
            if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
        }

        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .populate('userId', 'name email role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            AuditLog.countDocuments(query)
        ]);

        return {
            logs,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }
};

module.exports = auditService;
