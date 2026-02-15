const { TEACHER_ROLE, STUDENT_ROLE, PARENT_ROLE, DEVELOPER_ROLE } = require("./userRoles");

const permissions = {
    [DEVELOPER_ROLE]: [
        'dashboard:system:view',
        'developer:stats',
        'developer:audit',
        'teachers:view',
        'teachers:create',
        'teachers:update',
        'teachers:delete',
        'users:reset'
    ],
    [TEACHER_ROLE]: [
        'batches:create', 'batches:update', 'batches:delete', 'batches:view',
        'students:create', 'students:update', 'students:delete', 'students:view',
        'attendance:mark', 'attendance:view',
        'marks:manage', 'marks:view',
        'fees:manage', 'fees:view',
        'announcements:create', 'announcements:view',
        'dashboard:view',
        'profile:update'
    ],
    [STUDENT_ROLE]: [
        'batches:view',
        'attendance:self:view',
        'marks:self:view',
        'marks:self:create',
        'fees:view',
        'announcements:view',
        'dashboard:view',
        'profile:update'
    ],
    [PARENT_ROLE]: [
        'students:child:view',
        'attendance:view',
        'marks:view',
        'fees:view',
        'announcements:view',
        'dashboard:child:view',
        'profile:update'
    ]
};

module.exports = permissions;
