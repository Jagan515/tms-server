const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_DB_CONNECTION_URL;

async function seedStudent() {
    try {
        if (!MONGO_URI) {
            throw new Error('MONGO_DB_CONNECTION_URL is undefined');
        }
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Create/Find Teacher
        const teacherEmail = 'teacher@test.com';
        const passwordHash = await bcrypt.hash('password123', 10);

        let teacher = await User.findOne({ email: teacherEmail });
        if (!teacher) {
            teacher = await User.create({
                name: 'Test Teacher',
                email: teacherEmail,
                password: passwordHash,
                role: 'teacher',
                isActive: true
            });
            console.log('Teacher created');
        }

        // 2. Create/Find Batch
        let batch = await Batch.findOne({ teacherId: teacher._id, name: 'Class 10A' });
        if (!batch) {
            batch = await Batch.create({
                teacherId: teacher._id,
                name: 'Class 10A',
                class: '10th',
                year: 2025
            });
            console.log('Batch created');
        }

        // 3. Create Student User
        const studentEmail = 'student@test.com';
        let studentUser = await User.findOne({ email: studentEmail });

        if (!studentUser) {
            studentUser = await User.create({
                name: 'Rahul Kumar',
                email: studentEmail,
                password: passwordHash,
                role: 'student',
                isActive: true
            });
            console.log('Student User created:', studentEmail);
        } else {
            // Update password just in case
            studentUser.password = passwordHash;
            await studentUser.save();
            console.log('Student User exists, password reset.');
        }

        // 4. Create Student Profile
        let studentProfile = await Student.findOne({ userId: studentUser._id });
        if (!studentProfile) {
            studentProfile = await Student.create({
                userId: studentUser._id,
                teacherId: teacher._id,
                batchId: batch._id,
                registrationNumber: 'REG2025001',
                class: '10th',
                school: 'Public School',
                year: 2025,
                monthlyFee: 1000,
                contacts: [{ name: 'Parent', email: 'parent@test.com', phone: '9876543210' }]
            });
            console.log('Student Profile created');
        } else {
            console.log('Student Profile already exists');
        }

        // 5. Create Sample Data
        const Attendance = require('../models/Attendance');
        const Marks = require('../models/Marks');
        const Fee = require('../models/Fee');
        const Announcement = require('../models/Announcement');

        // Attendance
        await Attendance.deleteMany({ 'records.studentId': studentProfile._id });
        await Attendance.create({
            teacherId: teacher._id,
            date: new Date(),
            batchId: batch._id,
            records: [{ studentId: studentProfile._id, status: 'present' }]
        });
        console.log('Attendance seeded');

        // Marks (Tuition)
        await Marks.deleteMany({ studentId: studentProfile._id });
        await Marks.create({
            teacherId: teacher._id,
            studentId: studentProfile._id,
            type: 'exam',
            title: 'Maths Unit Test',
            subject: 'Mathematics',
            marksObtained: 45,
            totalMarks: 50,
            date: new Date(),
            status: 'Approved'
        });

        // Marks (School)
        await Marks.create({
            teacherId: teacher._id,
            studentId: studentProfile._id,
            type: 'School',
            title: 'Mid Term',
            subject: 'Science',
            marksObtained: 85,
            totalMarks: 100,
            date: new Date(),
            status: 'Pending'
        });
        console.log('Marks seeded');

        // Fees
        await Fee.deleteMany({ studentId: studentProfile._id });
        await Fee.create({
            teacherId: teacher._id,
            studentId: studentProfile._id,
            amount: 1000,
            month: new Date().getMonth() + 1, // 1-12
            year: new Date().getFullYear(),
            status: 'paid',
            paymentDate: new Date(),
            paymentMode: 'cash'
        });
        console.log('Fees seeded');

        // Announcements
        await Announcement.deleteMany({ teacherId: teacher._id });
        await Announcement.create({
            teacherId: teacher._id,
            title: 'Holiday Notice',
            message: 'Class is off tomorrow due to public holiday.',
            targetAudience: 'All',
            targetRole: 'student', // Added targetRole
            priority: 'Normal'
        });
        console.log('Announcements seeded');

        console.log('Seeding complete.');
        console.log('Credentials -> Email: student@test.com, Password: password123');
        process.exit(0);

    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedStudent();
