/**
 * Role-based middleware for strict access control
 * Usage: requireRole('teacher') or requireRole(['teacher', 'admin'])
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Insufficient privileges'
            });
        }

        next();
    };
};

module.exports = requireRole;
