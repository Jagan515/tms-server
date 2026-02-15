require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const initCronJobs = require('./src/utility/cronJobs');

const app = express();

// Database Connection
mongoose
    .connect(process.env.MONGO_DB_CONNECTION_URL)
    .then(() => {
        console.log('MongoDB Connected successfully');

        // Start cron only after DB is ready
        initCronJobs();
    })
    .catch((error) => console.log('Database Connection Error:', error));

// Middleware Configuration
const allowedOrigins = [process.env.CLIENT_URL];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const isLocalhost =
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:');

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

// Routes
app.use('/auth', require('./src/routes/authRoutes'));
app.use('/batches', require('./src/routes/batchRoutes'));
app.use('/students', require('./src/routes/studentRoutes'));
app.use('/attendance', require('./src/routes/attendanceRoutes'));
app.use('/marks', require('./src/routes/marksRoutes'));
app.use('/fees', require('./src/routes/feeRoutes'));
app.use('/developer', require('./src/routes/developerRoutes'));
app.use('/dashboard', require('./src/routes/dashboardRoutes'));
app.use('/parent', require('./src/routes/parentRoutes'));
app.use('/parent-view', require('./src/routes/parentViewRoutes'));
app.use('/student-view', require('./src/routes/studentViewRoutes'));
app.use('/announcements', require('./src/routes/announcementRoutes'));
app.use('/notifications', require('./src/routes/notificationRoutes'));

app.get('/health', (req, res) =>
    res.status(200).json({ status: 'active', timestamp: new Date() })
);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`TMS Server running on port ${PORT}`);
});
