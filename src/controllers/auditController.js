const auditService = require('../services/auditService');

const auditController = {

    getTeacherLogs: async (req, res) => {
        try {
            const logs = await auditService.getTeacherAuditTrail(req.user._id);
            res.status(200).json({ success: true, logs });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getEntityLogs: async (req, res) => {
        try {
            const { entityType, entityId } = req.params;
            const logs = await auditService.getLogsByEntity(entityType, entityId);
            res.status(200).json({ success: true, logs });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = auditController;
