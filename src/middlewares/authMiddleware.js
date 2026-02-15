const jwt = require('jsonwebtoken');

const authMiddleware = {
    protect: async (request, response, next) => {
        try {
            const token = request.cookies?.jwtToken;

            if (!token) {
                return response.status(401).json({ error: 'Unauthorized: No token provided' });
            }

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                request.user = decoded;
                next();
            } catch (error) {
                return response.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
            }

        } catch (error) {
            console.error('[AuthMiddleware] Error:', error);
            response.status(500).json({ message: 'Internal server error during authentication' });
        }
    },
};

module.exports = authMiddleware;
