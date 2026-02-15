/**
 * Common utility functions for clean code and reusability
 */

const dateUtils = {
    /**
     * Formats a date to YYYY-MM-DD
     */
    formatDate: (date) => {
        if (!date) return null;
        return new Date(date).toISOString().split('T')[0];
    },

    /**
     * Checks if a date is today
     */
    isToday: (date) => {
        const today = new Date();
        const d = new Date(date);
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    }
};

const responseUtils = {
    internalError: (res, error) => {
        console.error('[Internal Error]:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { dateUtils, responseUtils };
