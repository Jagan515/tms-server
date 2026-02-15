const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');
const User = require('../models/User');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
// const connectDB = require('../config/db'); // Removed

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_DB_CONNECTION_URL;

const seedParent = async () => {
    try {
        if (!MONGO_URI) {
            throw new Error('MONGO_DB_CONNECTION_URL is undefined');
        }
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Find Existing Student
        const studentUser = await User.findOne({ email: 'student@test.com' });
        if (!studentUser) {
            console.error('Test Student not found. Please run seed_student.js first.');
            process.exit(1);
        }

        const studentProfile = await Student.findOne({ userId: studentUser._id });
        if (!studentProfile) {
            console.error('Student Profile not found.');
            process.exit(1);
        }

        // 2. Create Parent User
        let parentUser = await User.findOne({ email: 'parent@test.com' });
        if (!parentUser) {
            const hashedPassword = await bcrypt.hash('password123', 10);
            parentUser = await User.create({
                name: 'Parent Kumar',
                email: 'parent@test.com',
                password: hashedPassword,
                role: 'parent',
                isActive: true
            });
            console.log('Parent User created');
        } else {
            console.log('Parent User already exists. Updating password...');
            const hashedPassword = await bcrypt.hash('password123', 10);
            parentUser.password = hashedPassword;
            await parentUser.save();
            console.log('Parent password reset to password123');
        }

        // 3. Create Parent Profile
        let parentProfile = await Parent.findOne({ userId: parentUser._id });
        if (!parentProfile) {
            parentProfile = await Parent.create({
                userId: parentUser._id,
                phone: '9876543210',
                address: '123 Test St, Test City',
                occupation: 'Engineer'
            });
            console.log('Parent Profile created');
        } else {
            console.log('Parent Profile already exists');
        }

        // 4. Link Student to Parent
        studentProfile.parentId = parentProfile._id;
        await studentProfile.save();
        console.log('Student linked to Parent');

        console.log('Seeding complete.');
        console.log('Credentials -> Email: parent@test.com, Password: password123');
        process.exit(0);

    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedParent();
