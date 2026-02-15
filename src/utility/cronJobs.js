const cron = require('node-cron');
const AuditLog = require('../models/AuditLog');
const AttendanceRecord = require('../models/AttendanceRecord');
const Announcement = require('../models/Announcement');

/**
 * Initializes scheduled tasks for the system.
 */
const initCronJobs = () => {
    // Schedule: Every 5 minutes (*/5 * * * *)
    // Task: Delete audit logs older than 1 hour to keep database light
    cron.schedule('*/5 * * * *', async () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        // console.log(`[CRON] Purging audit logs older than ${oneHourAgo.toISOString()}...`); // Reduced verbosity
        try {
            await AuditLog.deleteMany({ createdAt: { $lt: oneHourAgo } });
        } catch (error) {
            console.error('[CRON] Failed to purge audit logs:', error.message);
        }
    });

    // Schedule: At 00:00 on day-of-month 1 (Monthly Reset)
    // Task: Reset attendance and clear announcements
    cron.schedule('0 0 1 * *', async () => {
        console.log(`[CRON] Starting Monthly System Reset...`);
        try {
            // 1. Archive current attendance stats to Student profile before deletion
            // This ensures aggregate attendance remains accurate even after details are wiped
            const attendanceStats = await AttendanceRecord.aggregate([
                {
                    $group: {
                        _id: '$studentId',
                        totalSessions: { $sum: 1 },
                        presentSessions: {
                            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
                        }
                    }
                }
            ]);

            if (attendanceStats.length > 0) {
                const bulkOps = attendanceStats.map(stat => ({
                    updateOne: {
                        filter: { _id: stat._id },
                        update: {
                            $inc: {
                                'archivedAttendance.totalSessions': stat.totalSessions,
                                'archivedAttendance.presentSessions': stat.presentSessions
                            }
                        }
                    }
                }));

                const Student = require('../models/Student');
                await Student.bulkWrite(bulkOps);
                console.log(`[CRON] Archived attendance stats for ${attendanceStats.length} students.`);
            }

            // 2. Clear all attendance records (Monthly Reset)
            const attendanceResult = await AttendanceRecord.deleteMany({});
            console.log(`[CRON] Monthly Reset: Deleted ${attendanceResult.deletedCount} attendance records.`);

            // 3. Clear all announcements
            const announcementResult = await Announcement.deleteMany({});
            console.log(`[CRON] Monthly Reset: Deleted ${announcementResult.deletedCount} announcements.`);

        } catch (error) {
            console.error('[CRON] Monthly Reset Failed:', error.message);
        }
    });

    console.log('[CRON] System maintenance tasks initialized: Audit logs (1h window) & Monthly Reset (1st of month).');
};

module.exports = initCronJobs;
