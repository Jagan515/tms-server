const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

require('dotenv').config();

mongoose.connect(process.env.MONGO_DB_CONNECTION_URL)
    .then(async () => {

        const existing = await User.findOne({ role: 'developer' });

        if (existing) {
            console.log('Developer already exists');
            process.exit();
        }

        const hashedPassword = await bcrypt.hash('123456', 10);

        await User.create({
            name: 'Main Developer',
            email: 'jaganp515@gmail.com',
            password: hashedPassword,
            role: 'developer',
            isActive: true
        });

        console.log('Developer created successfully');
        process.exit();
    })
    .catch(err => {
        console.log(err);
        process.exit(1);
    });
