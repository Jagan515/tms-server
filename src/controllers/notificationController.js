const notificationService = require('../services/notificationService');

const notificationController = {

    getNotifications: async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 20;
            const notifications = await notificationService.getUserNotifications(req.user._id, limit);
            const unreadCount = await notificationService.getUnreadCount(req.user._id);
            res.status(200).json({ success: true, notifications, unreadCount });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    markRead: async (req, res) => {
        try {
            const { id } = req.params;
            await notificationService.markAsRead(id, req.user._id);
            res.status(200).json({ success: true, message: 'Notification marked as read' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    markAllRead: async (req, res) => {
        try {
            await notificationService.markAllAsRead(req.user._id);
            res.status(200).json({ success: true, message: 'All notifications cleared' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = notificationController;
