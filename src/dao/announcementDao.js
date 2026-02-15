const Announcement = require('../models/Announcement');

const announcementDao = {
    createAnnouncement: async (data) => {
        const newAnnouncement = new Announcement(data);
        return await newAnnouncement.save();
    },

    getAnnouncementsByTeacher: async (teacherId, limit = 10) => {
        return await Announcement.find({ teacherId })
            .sort({ createdAt: -1 })
            .limit(limit);
    },

    updateAnnouncement: async (id, data) => {
        return await Announcement.findByIdAndUpdate(id, data, { new: true });
    },

    deleteAnnouncement: async (id) => {
        return await Announcement.findByIdAndDelete(id);
    }
};

module.exports = announcementDao;
