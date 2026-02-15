const mongoose = require('mongoose');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const User = require('../models/User'); // Required for populating if needed or creating new user
const bcrypt = require('bcryptjs'); // If creating a new user
require('dotenv').config();

const seedSecondChild = async () => {
    try {
        const MONGO_URI = process.env.MONGO_DB_CONNECTION_URL;
        if (!MONGO_URI) throw new Error('MONGO_DB_CONNECTION_URL is undefined');

        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Find the Parent
        const parentUser = await User.findOne({ email: 'parent@test.com' });
        if (!parentUser) throw new Error('Parent user not found');

        const parentProfile = await Parent.findOne({ userId: parentUser._id });
        if (!parentProfile) throw new Error('Parent profile not found');

        // 2. Find a Teacher
        const teacherUser = await User.findOne({ role: 'teacher' });
        if (!teacherUser) throw new Error('No teacher found to link student to');

        // 3. Check if second child exists
        const secondChildEmail = 'priya@test.com'; // From user requirements example
        let secondChildUser = await User.findOne({ email: secondChildEmail });

        if (!secondChildUser) {
            const hashedPassword = await bcrypt.hash('password123', 10);
            secondChildUser = await User.create({
                name: 'Priya Kumar',
                email: secondChildEmail,
                password: hashedPassword,
                role: 'student',
                isActive: true
            });
            console.log('Created second child user');
        }

        let secondChildProfile = await Student.findOne({ userId: secondChildUser._id });
        if (!secondChildProfile) {
            secondChildProfile = await Student.create({
                userId: secondChildUser._id,
                registrationNumber: '012520',
                department: 'High School',
                section: 'A',
                class: '6th',
                batch: '6th Combined',
                dob: new Date('2013-05-15'),
                gender: 'Female',
                phone: '9876543210',
                address: '123 Main St',
                parentId: parentProfile._id, // LINK TO PARENT
                school: 'Greenwood High',
                teacherId: teacherUser._id, // LINK TO TEACHER
                monthlyFee: 1000, // Required field
                year: 2025 // Required field
            });
            console.log('Created second child profile and linked to parent');
        } else {
            console.log('Second child profile already exists, updating parent link just in case');
            secondChildProfile.parentId = parentProfile._id;
            await secondChildProfile.save();
        }

        console.log('Seeding second child completed successfully');

    } catch (error) {
        console.error('Error seeding second child:', error);
    } finally {
        await mongoose.disconnect();
    }
};

seedSecondChild();
