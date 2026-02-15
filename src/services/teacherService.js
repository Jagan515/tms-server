const studentDao = require('../dao/studentDao');
const batchDao = require('../dao/batchDao');

const teacherService = {

    getDashboardStats: async (teacherId) => {
        const totalStudents = await studentDao.countByTeacher(teacherId);
        const totalBatches = await batchDao.countByTeacher(teacherId);

        // Placeholder for future stats
        const todayAttendance = 0;
        const pendingFees = 0;

        return {
            students: totalStudents,
            batches: totalBatches,
            attendance: todayAttendance,
            fees: pendingFees
        };
    }
};

module.exports = teacherService;
