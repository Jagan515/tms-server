const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const authService = {

    // Generate a cryptographically strong random token
    generateResetToken: () => {
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Hash the token before saving to DB
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        return { resetToken, hashedToken };
    },

    // Hash password with bcrypt
    hashPassword: async (password) => {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    },

    // Verify password
    verifyPassword: async (enteredPassword, storedPassword) => {
        return await bcrypt.compare(enteredPassword, storedPassword);
    },

    // Validate password strength
    validatePasswordStrength: (password) => {
        // Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return re.test(password);
    }
};

module.exports = authService;
