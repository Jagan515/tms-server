const nodemailer = require('nodemailer');

const emailClient = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GOOGLE_EMAIL,
        pass: process.env.GOOGLE_APP_PASSWORD
    }
});

const emailService = {

    send: async (to, subject, body) => {
        console.log(`[EmailService] Outgoing -> To: ${to} | Subject: ${subject}`);

        // Write to file for visual confirmation during testing
        try {
            const fs = require('fs');
            const path = require('path');
            const logPath = path.join(__dirname, '../../temp_email_log.txt');
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] To: ${to} | Subject: ${subject}\nBody: ${body}\n---\n`);
        } catch (e) {
            console.error('Failed to write email log:', e);
        }

        // Only attempt to send if credentials appear valid-ish
        if (process.env.GOOGLE_EMAIL && process.env.GOOGLE_APP_PASSWORD && process.env.GOOGLE_APP_PASSWORD.length > 8) {
            const mailOptions = {
                from: process.env.GOOGLE_EMAIL,
                to: to,
                subject: subject,
                text: body
            };
            // Note: We don't catch here, let the QueueService catch and retry
            await emailClient.sendMail(mailOptions);
        } else {
            console.log('[EmailService] Mocking send (Missing/Dev Credentials)');
            return true;
        }
    }
};

module.exports = emailService;
