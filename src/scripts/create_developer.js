const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_DB_CONNECTION_URL;

async function createDeveloper() {
    try {
        if (!MONGO_URI) {
            throw new Error('MONGO_DB_CONNECTION_URL is undefined');
        }
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'dev@test.com';
        const password = 'password123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let user = await User.findOne({ email });

        if (!user) {
            user = new User({
                name: 'Test Developer',
                email,
                password: hashedPassword,
                role: 'developer',
                isActive: true
            });
            await user.save();
            console.log('Developer created:', email);
        } else {
            console.log('Developer already exists:', email);
            user.role = 'developer'; // Ensure role is developer
            user.password = hashedPassword;
            await user.save();
            console.log('Developer updated.');
        }

        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createDeveloper();
