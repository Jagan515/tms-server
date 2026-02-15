const Notification = require('../models/Notification');

const notificationService = {

    getUserNotifications: async (userId, limit = 20) => {
        return await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit);
    },

    getUnreadCount: async (userId) => {
        return await Notification.countDocuments({ userId, isRead: false });
    },

    markAsRead: async (notificationId, userId) => {
        return await Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            { isRead: true },
            { new: true }
        );
    },

    markAllAsRead: async (userId) => {
        return await Notification.updateMany(
            { userId, isRead: false },
            { isRead: true }
        );
    },

    createNotification: async (data) => {
        // Simple helper for other services to create notifications
        return await Notification.create(data);
    }
};

module.exports = notificationService;
