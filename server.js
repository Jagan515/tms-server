require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const initCronJobs = require('./src/utility/cronJobs');

// Initialize Cron Jobs
initCronJobs();

// Route Imports
const authRoutes = require('./src/routes/authRoutes');
const batchRoutes = require('./src/routes/batchRoutes');
const studentRoutes = require('./src/routes/studentRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const marksRoutes = require('./src/routes/marksRoutes');
const feeRoutes = require('./src/routes/feeRoutes');
const developerRoutes = require('./src/routes/developerRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const parentRoutes = require('./src/routes/parentRoutes');
const studentViewRoutes = require('./src/routes/studentViewRoutes');
const announcementRoutes = require('./src/routes/announcementRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');

const app = express();

// Database Connection

let isConnected = false;

async function connectDB() {
    if (isConnected) {
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_DB_CONNECTION_URL);
        isConnected = true;
        console.log('MongoDB Connected successfully');
    } catch (error) {
        console.log('Database Connection Error:', error);
    }
}

app.use((request, response, next) => {

    if (!isConnected) {
        connectDB();
    }
    next();
})

// Middleware Configuration
const allowedOrigins = [
    process.env.CLIENT_URL
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Check if origin is localhost (any port)
        const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');

        if (allowedOrigins.indexOf(origin) !== -1 || isLocalhost) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Route Mounting
app.use('/auth', authRoutes);
app.use('/batches', batchRoutes);
app.use('/students', studentRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/marks', marksRoutes);
app.use('/fees', feeRoutes);
app.use('/developer', developerRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/parent', parentRoutes);
app.use('/parent-view', require('./src/routes/parentViewRoutes'));
app.use('/student-view', studentViewRoutes);
app.use('/announcements', announcementRoutes);
app.use('/notifications', notificationRoutes);

// Health Check
app.get('/health', (req, res) => res.status(200).json({ status: 'active', timestamp: new Date() }));

// const PORT = process.env.PORT || 5001;
// app.listen(PORT, () => {
//     console.log(`TMS Server running on port ${PORT}`);
// });

module.exports = app;

