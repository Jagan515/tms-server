const rateLimit = require('express-rate-limit');

// Helper to determine key for rate limiting
const keyGenerator = (req) => {
    // Use user ID if authenticated, else IP
    return req.user ? req.user._id.toString() : req.ip;
};

// 9.1 Global Rate Limits
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    validate: { trustProxy: false },
    message: {
        success: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    }
});

// 9.4 Login Rate Limiting (Aggressive)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per `window`
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Only count failed attempts
    validate: { trustProxy: false }, // Suppress IPv6 warning
    keyGenerator: (req) => {
        // Rate limit by email/registration number to prevent brute force on specific accounts
        return req.body.email || req.body.registrationNumber || req.socket.remoteAddress;
    },
    message: {
        success: false,
        error: 'Too many failed login attempts. Please try again later.',
        code: 'LOGIN_ATTEMPTS_EXCEEDED'
    }
});

// 9.1 Endpoint-Specific Limits

// Password Reset / OTP / Student Creation
const sensitiveActionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 attempts per hour
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: {
        success: false,
        error: 'Too many requests for this action. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    }
});

// Marks Submission
const marksSubmissionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    keyGenerator: (req) => {
        // For authenticated requests, use User ID. Fallback to IP only if necessary.
        return req.user ? req.user._id.toString() : (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
    },
    message: {
        success: false,
        error: 'Too many marks submissions. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    }
});

module.exports = {
    globalLimiter,
    loginLimiter,
    sensitiveActionLimiter,
    marksSubmissionLimiter
};
