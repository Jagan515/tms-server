const ApiError = require('../utility/apiError');

/**
 * Global Error Handling Middleware
 */
const errorMiddleware = (err, req, res, next) => {
    let error = err;

    // If it's not an instance of ApiError, convert it
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
        const message = error.message || 'Something went wrong';
        error = new ApiError(statusCode, message, err?.errors || [], err.stack);
    }

    const response = {
        success: false,
        message: error.message,
        errors: error.errors,
        ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
    };

    // Log the error for developers
    console.error(`[Error] ${req.method} ${req.url}:`, error.message);
    if (process.env.NODE_ENV === 'development') {
        console.error(error.stack);
    }

    return res.status(error.statusCode || 500).json(response);
};

module.exports = errorMiddleware;
