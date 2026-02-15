const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const Student = require('../models/Student');
const emailQueueService = require('./emailQueueService');
const DOMPurify = require('isomorphic-dompurify');

const announcementService = {

    create: async (data, teacherUserId) => {
        const { title, message, targetAudience, emailEnabled } = data;

        // XSS Sanitization
        const sanitizedTitle = DOMPurify.sanitize(title);
        const sanitizedMessage = DOMPurify.sanitize(message);

        // 1. Save Announcement
        const announcement = new Announcement({
            teacherId: teacherUserId,
            title: sanitizedTitle,
            message: sanitizedMessage,
            targetAudience,
            emailEnabled
        });
        await announcement.save();

        // 2. Identify Recipients (Students and/or Parents)
        const students = await Student.find({ teacherId: teacherUserId }).populate('userId parentId');

        const recipientUserIds = new Set();
        const emailJobs = [];

        for (const student of students) {
            // Recipient Logic
            if (targetAudience === 'students' || targetAudience === 'both') {
                if (student.userId) {
                    recipientUserIds.add(student.userId._id.toString());
                    if (emailEnabled && student.userId.email) {
                        emailJobs.push({
                            recipientEmail: student.userId.email,
                            subject: title,
                            body: message
                        });
                    }
                }
            }

            if (targetAudience === 'parents' || targetAudience === 'both') {
                if (student.parentId && student.parentId.userId) {
                    recipientUserIds.add(student.parentId.userId.toString());
                    if (emailEnabled && student.parentId.userId.email) {
                        emailJobs.push({
                            recipientEmail: student.parentId.userId.email,
                            subject: title,
                            body: message
                        });
                    }
                }
            }
        }

        // 3. Create In-App Notifications
        const notificationRecords = Array.from(recipientUserIds).map(userId => ({
            userId,
            type: 'announcement',
            referenceId: announcement._id,
            message: `New Announcement: ${title}`
        }));

        if (notificationRecords.length > 0) {
            await Notification.insertMany(notificationRecords);
        }

        // 4. Queue Emails (Non-blocking)
        if (emailEnabled && emailJobs.length > 0) {
            // Deduplicate emails just in case
            const uniqueEmails = Array.from(new Map(emailJobs.map(item => [item.recipientEmail, item])).values());
            await emailQueueService.queueBulk(uniqueEmails);
        }

        return announcement;
    },

    getTeacherAnnouncements: async (teacherId) => {
        return await Announcement.find({ teacherId }).sort({ createdAt: -1 });
    },

    getStudentAnnouncements: async (userId) => {
        // Find announcements where targetAudience is 'students' or 'both'
        // and ideally filter by teacherId if we have the link
        const student = await Student.findOne({ userId });
        if (!student) return [];

        return await Announcement.find({
            teacherId: student.teacherId,
            targetAudience: { $in: ['students', 'both'] }
        }).sort({ createdAt: -1 });
    }
};

module.exports = announcementService;
