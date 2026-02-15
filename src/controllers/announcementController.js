const announcementDao = require('../dao/announcementDao');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const emailService = require('../services/emailService');
const Announcement = require('../models/Announcement');

const announcementController = {
    getMine: async (request, response) => {
        try {
            const userId = request.user._id;
            const role = request.user.role;
            let query = {};

            if (role === 'teacher') {
                query = { teacherId: userId };
            } else if (role === 'student') {
                const student = await Student.findOne({ userId });
                if (!student) return response.status(200).json({ announcements: [] });
                query = {
                    teacherId: student.teacherId,
                    targetAudience: { $in: ['all', 'students'] }
                };
            } else if (role === 'parent') {
                const parent = await Parent.findOne({ userId });
                if (!parent || parent.studentIds.length === 0) return response.status(200).json({ announcements: [] });

                // Fetch teacher of the first child (assuming same teacher for siblings as per standard use case)
                const student = await Student.findById(parent.studentIds[0]);
                if (!student) return response.status(200).json({ announcements: [] });

                query = {
                    teacherId: student.teacherId,
                    targetAudience: { $in: ['all', 'parents'] }
                };
            }

            const page = parseInt(request.query.page) || 1;
            const limit = parseInt(request.query.limit) || 10;
            const skip = (page - 1) * limit;

            const total = await Announcement.countDocuments(query);
            const announcements = await Announcement.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            return response.status(200).json({
                announcements,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    create: async (request, response) => {
        try {
            const { title, content, targetAudience, sendEmail } = request.body;
            if (!title || !content) {
                return response.status(400).json({ message: 'Title and content are required' });
            }

            const teacherId = request.user._id;

            const announcement = await announcementDao.createAnnouncement({
                title,
                content,
                targetAudience: targetAudience || 'all',
                teacherId
            });

            // Handle Batch Email Notifications
            if (sendEmail) {
                const students = await Student.find({ teacherId }).populate('userId').populate({
                    path: 'parentId', populate: { path: 'userId' }
                });

                const recipients = new Set();

                students.forEach(s => {
                    if (targetAudience === 'students' || targetAudience === 'all') {
                        if (s.userId && s.userId.email && !s.userId.email.includes('@student.local')) {
                            recipients.add(s.userId.email);
                        }
                    }
                    if (targetAudience === 'parents' || targetAudience === 'all') {
                        if (s.parentId && s.parentId.userId && s.parentId.userId.email) {
                            recipients.add(s.parentId.userId.email);
                        }
                    }
                });

                const recipientList = Array.from(recipients);
                console.log(`[AnnouncementController] Sending emails to ${recipientList.length} recipients...`);

                recipientList.forEach(email => {
                    emailService.send(email, `New Announcement: ${title}`, content)
                        .catch(e => console.error(`Failed to send to ${email}:`, e.message));
                });
            }

            return response.status(201).json({
                message: 'Announcement broadcast successfully',
                announcement
            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    delete: async (request, response) => {
        try {
            const { id } = request.params;
            const teacherId = request.user._id;

            const announcement = await Announcement.findById(id);
            if (!announcement) return response.status(404).json({ message: 'Not found' });
            if (announcement.teacherId.toString() !== teacherId.toString()) {
                return response.status(403).json({ message: 'Permission denied' });
            }

            await Announcement.findByIdAndDelete(id);
            return response.status(200).json({ message: 'Announcement removed' });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    }
};

module.exports = announcementController;
