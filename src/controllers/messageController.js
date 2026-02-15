const Message = require('../models/Message');
const User = require('../models/User');

const messageController = {

    send: async (req, res) => {
        try {
            const senderId = req.user._id;
            const { recipientEmail, subject, body } = req.body;

            // Find recipient by email
            const recipient = await User.findOne({ email: recipientEmail });
            if (!recipient) {
                return res.status(404).json({ message: "Recipient not found" });
            }

            const message = await Message.create({
                senderId,
                recipientId: recipient._id,
                subject,
                body
            });

            return res.status(201).json({ message: "Message sent", data: message });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },

    getInbox: async (req, res) => {
        try {
            const userId = req.user._id;
            const messages = await Message.find({ recipientId: userId, isDeleted: false })
                .populate('senderId', 'name email role')
                .sort({ createdAt: -1 });
            return res.status(200).json({ messages });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },

    getSent: async (req, res) => {
        try {
            const userId = req.user._id;
            const messages = await Message.find({ senderId: userId, isDeleted: false })
                .populate('recipientId', 'name email role')
                .sort({ createdAt: -1 });
            return res.status(200).json({ messages });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },

    markRead: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user._id;

            const message = await Message.findOneAndUpdate(
                { _id: id, recipientId: userId },
                { isRead: true },
                { new: true }
            );

            if (!message) return res.status(404).json({ message: "Message not found" });

            return res.status(200).json({ message: "Marked as read", data: message });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user._id;

            // Soft delete
            const message = await Message.findOneAndUpdate(
                { _id: id, $or: [{ recipientId: userId }, { senderId: userId }] },
                { isDeleted: true },
                { new: true }
            );

            if (!message) return res.status(404).json({ message: "Message not found" });

            return res.status(200).json({ message: "Message deleted" });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
};

module.exports = messageController;
