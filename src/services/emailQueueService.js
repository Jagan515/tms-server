const EmailQueue = require('../models/EmailQueue');
const emailService = require('./emailService');

const emailQueueService = {

    /**
     * Add an email to the queue for background processing
     */
    queueEmail: async (recipientEmail, subject, body) => {
        try {
            return await EmailQueue.create({ recipientEmail, subject, body });
        } catch (error) {
            console.error('[EmailQueueService] Error adding to queue:', error.message);
        }
    },

    /**
     * Batch add emails
     */
    queueBulk: async (emails) => {
        try {
            // emails: [{ recipientEmail, subject, body }]
            if (emails.length === 0) return;
            return await EmailQueue.insertMany(emails);
        } catch (error) {
            console.error('[EmailQueueService] Bulk queue error:', error.message);
        }
    },

    /**
     * The Worker logic - should be called by a cron or a continuous loop
     */
    processQueue: async (limit = 20) => {
        const pendingEmails = await EmailQueue.find({
            status: { $in: ['pending', 'failed'] },
            retryCount: { $lt: 3 }
        }).limit(limit);

        for (const emailRecord of pendingEmails) {
            try {
                // Real send
                await emailService.send(emailRecord.recipientEmail, emailRecord.subject, emailRecord.body);

                emailRecord.status = 'sent';
                emailRecord.sentAt = new Date();
                await emailRecord.save();
            } catch (error) {
                emailRecord.retryCount += 1;
                emailRecord.status = 'failed';
                emailRecord.error = error.message;
                await emailRecord.save();
                console.error(`[EmailQueueService] Fail for ${emailRecord.recipientEmail}:`, error.message);
            }
        }
    }
};

module.exports = emailQueueService;
