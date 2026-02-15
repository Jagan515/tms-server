const permissionMap = require('../utility/permissions');

const authorizeMiddleware = (requiredPermission) => {
    return (request, response, next) => {
        const user = request.user;

        if (!user) {
            return response.status(401).json({ message: 'Unauthorized access' });
        }

        const userPermissions = permissionMap[user.role] || [];

        if (!userPermissions.includes(requiredPermission)) {
            return response.status(403).json({
                message: 'Forbidden: Insufficient Permissions'
            });
        }

        next();
    };
};

module.exports = authorizeMiddleware;
