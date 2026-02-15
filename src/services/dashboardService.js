const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Fee = require('../models/Fee');
const Batch = require('../models/Batch');

const dashboardService = {

    getTeacherDashboard: async (teacherId) => {

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1️⃣ Total Students
        const totalStudents = await Student.countDocuments({ teacherId });

        // 1.5️⃣ Total Batches
        const totalBatches = await Batch.countDocuments({ teacherId });

        // 2️⃣ Attendance Today
        const attendanceToday = await Attendance.find({
            teacherId,
            date: today
        });

        let presentCount = 0;
        let absentCount = 0;

        attendanceToday.forEach(att => {
            att.records.forEach(record => {
                if (record.status === 'present') presentCount++;
                if (record.status === 'absent') absentCount++;
            });
        });

        const presentPercentage = totalStudents > 0
            ? Math.round((presentCount / totalStudents) * 100)
            : 0;

        // 3️⃣ Pending Fees (Count & Amount)
        const pendingFeesDocs = await Fee.find({
            teacherId,
            status: 'unpaid'
        });

        const pendingFeesCount = pendingFeesDocs.length;
        const pendingFeesAmount = pendingFeesDocs.reduce((sum, fee) => sum + fee.amount, 0);

        // 4️⃣ Fee Defaulters (2+ months unpaid)
        // We need to group unpaid fees by studentId
        const defaultersMap = {};
        pendingFeesDocs.forEach(fee => {
            const sid = fee.studentId.toString();
            defaultersMap[sid] = (defaultersMap[sid] || 0) + 1;
        });

        const feeDefaultersCount = Object.values(defaultersMap).filter(count => count >= 2).length;

        // 5️⃣ Low Attendance Students (< 75%)
        // We need total school days vs present days for each student
        // This is a heavy operation, optimizing by fetching only necessary fields
        const allAttendance = await Attendance.find({ teacherId }).select('records');

        const studentAttendanceMap = {}; // { studentId: { total: 0, present: 0 } }

        allAttendance.forEach(att => {
            att.records.forEach(record => {
                const sid = record.studentId.toString();
                if (!studentAttendanceMap[sid]) {
                    studentAttendanceMap[sid] = { total: 0, present: 0 };
                }
                studentAttendanceMap[sid].total += 1;
                if (record.status === 'present') {
                    studentAttendanceMap[sid].present += 1;
                }
            });
        });

        let lowAttendanceCount = 0;
        Object.values(studentAttendanceMap).forEach(stats => {
            const percentage = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
            if (percentage < 75 && stats.total > 0) { // Only count if there's at least one record
                lowAttendanceCount++;
            }
        });

        // 6️⃣ Monthly Revenue Expected
        const students = await Student.find({ teacherId });
        const monthlyExpectedRevenue = students.reduce(
            (sum, student) => sum + student.monthlyFee,
            0
        );

        // 7️⃣ Collected Revenue (Current Month)
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const paidFeesDocs = await Fee.find({
            teacherId,
            month: currentMonth,
            year: currentYear,
            status: 'paid'
        });

        const collectedRevenue = paidFeesDocs.reduce(
            (sum, fee) => sum + fee.amount,
            0
        );

        const currentMonthPending = monthlyExpectedRevenue - collectedRevenue;

        // 8️⃣ Recent Announcements
        const Announcement = require('../models/Announcement');
        const recentAnnouncements = await Announcement.find({ teacherId })
            .sort({ createdAt: -1 })
            .limit(3);

        // 9️⃣ Attendance Trends (Last 7 Days)
        const attendanceTrends = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);

            // This loop inside query is not ideal for performance but acceptable for small scale
            // Better approach: fetch all attendance for last 7 days in one query and process in memory
            const dayAtt = await Attendance.find({
                teacherId,
                date: {
                    $gte: d,
                    $lt: new Date(d.getTime() + 24 * 60 * 60 * 1000)
                }
            });

            let dayPresent = 0;
            let dayTotal = 0; // Or use totalStudents

            dayAtt.forEach(att => {
                att.records.forEach(r => {
                    dayTotal++;
                    if (r.status === 'present') dayPresent++;
                });
            });

            // If no attendance taken, dayTotal is 0. 
            // Either skip or show 0.
            attendanceTrends.push({
                date: d.toISOString().split('T')[0],
                day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                percentage: dayTotal > 0 ? Math.round((dayPresent / dayTotal) * 100) : 0
            });
        }

        // 🔟 Top Performers (Based on recent Marks)
        // Fetch recent marks for all students of this teacher
        const Marks = require('../models/Marks');
        const allMarks = await Marks.find({ teacherId }).limit(100).sort({ date: -1 });

        // Calculate average per student
        const studentPerformance = {};
        allMarks.forEach(m => {
            const sid = m.studentId.toString();
            if (!studentPerformance[sid]) {
                studentPerformance[sid] = { total: 0, count: 0, name: '' };
            }
            const pct = m.percentage || (m.marksObtained / m.totalMarks) * 100;
            studentPerformance[sid].total += pct;
            studentPerformance[sid].count += 1;
        });

        // Resolve names (optimize later with populate)
        const topStudentIds = Object.keys(studentPerformance);
        const topStudentsDocs = await Student.find({ _id: { $in: topStudentIds } }).populate('userId', 'name');

        topStudentsDocs.forEach(s => {
            if (studentPerformance[s._id.toString()]) {
                studentPerformance[s._id.toString()].name = s.userId.name;
            }
        });

        const topPerformers = Object.values(studentPerformance)
            .map(s => ({
                name: s.name,
                average: s.count ? Math.round((s.total / s.count) * 10) / 10 : 0
            }))
            .sort((a, b) => b.average - a.average)
            .slice(0, 5); // Top 5

        // 11️⃣ Pending Marks (School Marks needs approval)
        const pendingMarksCount = await Marks.countDocuments({
            teacherId,
            type: 'School',
            status: 'Pending'
        });

        return {
            totalStudents,
            totalBatches,
            attendance: {
                present: presentCount,
                total: totalStudents,
                percentage: presentPercentage,
                trends: attendanceTrends
            },
            pendingFees: {
                count: pendingFeesCount,
                amount: pendingFeesAmount,
                defaultersCount: feeDefaultersCount
            },
            lowAttendanceCount,
            pendingMarksCount,
            revenue: {
                expected: monthlyExpectedRevenue,
                collected: collectedRevenue,
                pending: currentMonthPending
            },
            recentAnnouncements,
            topPerformers
        };
    },

    getSystemDashboard: async () => {

        const userDao = require('../dao/userDao');
        const Batch = require('../models/Batch'); // Direct model access for simplicity or create batchDao if preferred
        const { TEACHER_ROLE, STUDENT_ROLE, PARENT_ROLE } = require('../utility/userRoles');

        // Parallelize queries for performance
        const [
            totalTeachers,
            activeTeachers,
            totalStudents,
            totalParents,
            totalBatches,
            totalPaidFees
        ] = await Promise.all([
            userDao.countByRole(TEACHER_ROLE),
            userDao.countActiveByRole(TEACHER_ROLE),
            userDao.countByRole(STUDENT_ROLE),
            userDao.countByRole(PARENT_ROLE),
            Batch.countDocuments(),
            Fee.countDocuments({ status: 'paid' })
        ]);

        return {
            totalTeachers,
            activeTeachers,
            totalStudents,
            totalParents,
            totalBatches,
            totalPaidFees,
            systemHealth: {
                database: 'Connected',
                emailService: 'Operational', // Placeholder/Simulated
                lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000) // Simulated 2 hours ago
            }
        };
    }

};

module.exports = dashboardService;
