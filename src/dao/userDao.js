const User = require('../models/User');

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const userDao = {
    findByEmail: async (email) => {
        return await User.findOne({ email });
    },

    /** Case-insensitive email lookup (e.g. for login so User@Mail.com matches user@mail.com) */
    findByEmailCaseInsensitive: async (email) => {
        if (!email || typeof email !== 'string') return null;
        const safe = escapeRegex(email.trim());
        return await User.findOne({ email: new RegExp(`^${safe}$`, 'i') });
    },

    findById: async (id) => {
        return await User.findById(id);
    },

    create: async (userData, session = null) => {
        const newUser = new User(userData);
        try {
            return await newUser.save({ session });
        } catch (error) {
            if (error.code === 11000) {
                const err = new Error();
                err.code = 'USER_EXIST';
                throw err;
            } else {
                console.log(error);
                const err = new Error('Something went wrong while communicating with DB');
                err.code = 'INTERNAL_SERVER_ERROR';
                throw err;
            }
        }
    },

    update: async (userId, data, session = null) => {
        return await User.findByIdAndUpdate(userId, data, { new: true, session });
    },

    delete: async (userId, session = null) => {
        return await User.findByIdAndDelete(userId, { session });
    }
};

module.exports = userDao;
