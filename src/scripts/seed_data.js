const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config({ path: '../../.env' });

const MONGO_URI = process.env.MONGO_DB_CONNECTION_URL;

async function seedData() {
    try {
        if (!MONGO_URI) {
            throw new Error('MONGO_DB_CONNECTION_URL is undefined');
        }
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Create Teacher
        const teacherEmail = 'teacher@test.com';
        const teacherPassword = 'password123';
        const salt = await bcrypt.genSalt(10);
        const hashedTeacherPassword = await bcrypt.hash(teacherPassword, salt);

        let teacher = await User.findOne({ email: teacherEmail });

        if (!teacher) {
            teacher = new User({
                name: 'Test Teacher',
                email: teacherEmail,
                password: hashedTeacherPassword,
                role: 'teacher',
                isActive: true
            });
            await teacher.save();
            console.log('Teacher created:', teacherEmail);
        } else {
            console.log('Teacher already exists:', teacherEmail);
            teacher.password = hashedTeacherPassword;
            await teacher.save();
            console.log('Teacher password updated.');
        }

        console.log('Setup complete.');
        process.exit(0);

    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
}

seedData();
