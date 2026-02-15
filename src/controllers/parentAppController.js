const parentViewService = require('../services/parentViewService');
const feeService = require('../services/feeService');
const announcementService = require('../services/announcementService');
const studentViewService = require('../services/studentViewService'); // Reusing student logic for child dashboard
const Parent = require('../models/Parent'); // Import Parent model

const parentAppController = {

    // 6.1 Get Parent Dashboard
    getDashboard: async (req, res) => {
        try {
            const parent = await Parent.findOne({ userId: req.user._id });
            if (!parent) return res.status(404).json({ success: false, message: 'Parent profile not found' });

            const dashboard = await parentViewService.getParentDashboard(parent._id);
            res.status(200).json({ success: true, data: dashboard });
        } catch (error) {
            console.error('Parent Dashboard Error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    // 6.2 Get Children List
    getChildren: async (req, res) => {
        try {
            const parent = await Parent.findOne({ userId: req.user._id });
            if (!parent) return res.status(404).json({ success: false, message: 'Parent profile not found' });

            const children = await parentViewService.getChildren(parent._id);
            res.status(200).json({ success: true, data: children });
        } catch (error) {
            console.error('Get Children Error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    // 6.3 Get Child Dashboard
    getChildDashboard: async (req, res) => {
        try {
            const { studentId } = req.params;
            const parent = await Parent.findOne({ userId: req.user._id });
            if (!parent) return res.status(404).json({ success: false, message: 'Parent profile not found' });

            // Security check: Ensure this child belongs to this parent
            const isAuthorized = await parentViewService.validateParentChildRelationship(parent._id, studentId);
            if (!isAuthorized) {
                return res.status(403).json({ success: false, message: 'Unauthorized access to this student profile' });
            }

            // Reuse student dashboard logic
            const dashboard = await studentViewService.getStudentDashboard(studentId);
            res.status(200).json({ success: true, data: dashboard });
        } catch (error) {
            console.error('Child Dashboard Error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    // 6.4 Get Fee History (for all kids or specific?)
    // Doc says "Transaction history". Let's assume for all kids unless filtered.
    getFeePaymentHistory: async (req, res) => {
        try {
            const parent = await Parent.findOne({ userId: req.user._id });
            if (!parent) return res.status(404).json({ success: false, message: 'Parent profile not found' });

            const history = await parentViewService.getFeePaymentHistory(parent._id);
            res.status(200).json({ success: true, data: history });
        } catch (error) {
            console.error('Fee History Error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    // 6.5 Get Messages/Announcements
    getMessages: async (req, res) => {
        try {
            // Logic similar to student announcements but targeting 'parent' role
            // And potentially specific to their children's batches
            const parent = await Parent.findOne({ userId: req.user._id });
            if (!parent) return res.status(404).json({ success: false, message: 'Parent profile not found' });

            const { page, limit } = req.query;
            const messages = await parentViewService.getParentMessages(parent._id, page, limit);
            res.status(200).json({ success: true, data: messages });
        } catch (error) {
            console.error('Messages Error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
};

module.exports = parentAppController;
