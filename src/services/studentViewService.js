const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const Fee = require('../models/Fee');
const Announcement = require('../models/Announcement');
const Student = require('../models/Student');
const User = require('../models/User');

const studentViewService = {

    getDashboardData: async (userId) => {
        const studentProfile = await Student.findOne({ userId })
            .populate('teacherId', 'name email phone')
            .populate('batchId', 'name');

        if (!studentProfile) throw new Error('Student profile not found');
        const studentId = studentProfile._id;

        const [sessions, tuitionMarks, schoolMarks, fees, announcements] = await Promise.all([
            Attendance.find({ 'records.studentId': studentId }).sort({ date: -1 }),
            Marks.find({ studentId, category: 'tuition' }).sort({ examDate: -1 }),
            Marks.find({ studentId, category: 'school' }).sort({ examDate: -1 }),
            Fee.find({ studentId }).sort({ year: -1, month: -1 }),
            Announcement.find({
                teacherId: studentProfile.teacherId?._id,
                $or: [
                    { targetAudience: 'all' },
                    { targetAudience: 'students' },
                    { targetAudience: 'both' }
                ]
            }).sort({ createdAt: -1 }).limit(10)
        ]);

        // --- Attendance Calculations ---
        const validRecords = sessions.map(s => {
            const record = s.records.find(r => r.studentId.toString() === studentId.toString());
            return {
                status: record?.status,
                date: s.date,
                remarks: record?.remarks,
                _id: s._id
            };
        }).filter(r => r.status != null);

        // Live Data (Current Month/Period)
        const currentTotal = validRecords.length;
        const currentPresent = validRecords.filter(r => r.status === 'present').length;

        // Archived Data (Historical)
        const archivedTotal = studentProfile.archivedAttendance?.totalSessions || 0;
        const archivedPresent = studentProfile.archivedAttendance?.presentSessions || 0;

        // Grand Totals for Aggregate Percentage
        const grandTotal = currentTotal + archivedTotal;
        const grandPresent = currentPresent + archivedPresent;

        const overallPercentage = grandTotal ? Math.round((grandPresent / grandTotal) * 100) : 0;

        // Current Month Stats (Reset Monthly)
        const now = new Date();
        const currentMonthRecords = validRecords.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const currentMonthTotal = currentMonthRecords.length;
        const currentMonthPresent = currentMonthRecords.filter(r => r.status === 'present').length;
        const currentMonthPercentage = currentMonthTotal ? Math.round((currentMonthPresent / currentMonthTotal) * 100) : 0;

        // --- Fee Calculations ---
        const pendingFees = fees.filter(f => f.status === 'unpaid').reduce((acc, curr) => acc + curr.amount, 0);

        const userData = await User.findById(userId);

        return {
            student: {
                _id: studentProfile._id,
                name: userData?.name || "Scholar",
                regNo: studentProfile.registrationNumber, // Mapped for frontend
                registrationNumber: studentProfile.registrationNumber,
                class: studentProfile.class,
                batchName: studentProfile.batchId?.name || 'Unassigned',
                monthlyFee: studentProfile.monthlyFee,
                attendance: overallPercentage, // Added for StudentStats
                pendingFees: pendingFees,       // Added for StudentStats
                teacherName: studentProfile.teacherId?.name, // Added for StudentProfile
                teacherEmail: studentProfile.teacherId?.email, // Added for StudentProfile
                school: studentProfile.school, // Added for StudentProfile
                createdAt: studentProfile.createdAt // Added for StudentProfile
            },
            attendance: {
                history: validRecords.map(r => {
                    const dateObj = new Date(r.date);
                    return {
                        _id: r._id,
                        date: r.date,
                        day: dateObj.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }),
                        status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
                        remarks: r.remarks
                    };
                }),
                stats: {
                    overallPct: overallPercentage,
                    thisMonthPct: currentMonthPercentage,
                    thisMonth: `${currentMonthPresent}/${currentMonthTotal}`
                }
            },
            marks: {
                school: schoolMarks,
                tuition: tuitionMarks
            },
            fees: {
                history: fees,
                pending: pendingFees
            },
            announcements: announcements
        };
    },

    submitSchoolMarks: async (userId, data) => {
        const student = await Student.findOne({ userId });
        if (!student) throw new Error('Student profile not found');
        if (!student.teacherId) throw new Error('You are not assigned to a teacher. Marks cannot be submitted.');

        const marksData = Array.isArray(data) ? data : [data];

        const marksDocs = marksData.map(item => {
            const marksObtained = parseFloat(item.marksObtained);
            const totalMarks = parseFloat(item.totalMarks);

            if (isNaN(marksObtained) || isNaN(totalMarks) || totalMarks <= 0) {
                throw new Error(`Invalid marks for subject: ${item.subject}`);
            }

            return {
                studentId: student._id,
                teacherId: student.teacherId,
                subject: item.subject,
                unitName: item.unitName,
                totalMarks: totalMarks,
                marksObtained: marksObtained,
                percentage: parseFloat(((marksObtained / totalMarks) * 100).toFixed(2)),
                examDate: item.examDate ? new Date(item.examDate) : new Date(),
                category: 'school',
                status: 'pending',
                submittedBy: userId
            };
        });

        return await Marks.insertMany(marksDocs);
    },

    getMyAttendance: async (userId, page = 1, limit = 10) => {
        const student = await Student.findOne({ userId }).populate('batchId');
        if (!student) throw new Error('Student profile not found');

        const joinDate = new Date(student.createdAt);
        joinDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate total days from joining to today (inclusive)
        const diffTime = Math.max(0, today - joinDate);
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const skip = (page - 1) * limit;

        // Generate the specific date range for this page (descending)
        const pageDates = [];
        for (let i = 0; i < limit; i++) {
            const index = skip + i;
            if (index < totalDays) {
                const targetDate = new Date(today);
                targetDate.setDate(targetDate.getDate() - index);
                pageDates.push(targetDate.toISOString().split('T')[0]);
            }
        }

        // Find all sessions for these dates matching the student's batch
        const sessions = await Attendance.find({
            date: { $in: pageDates.map(d => new Date(d)) },
            batchId: student.batchId?._id
        }).populate('teacherId', 'name');

        const mappedHistory = pageDates.map(pDate => {
            const session = sessions.find(s => s.date.toISOString().split('T')[0] === pDate);
            const record = session ? session.records.find(r => r.studentId.toString() === student._id.toString()) : null;
            const dateObj = new Date(pDate);

            return {
                date: pDate,
                day: dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }),
                status: record ? (record.status.charAt(0).toUpperCase() + record.status.slice(1)) : 'Not Marked',
                markedBy: session?.teacherId?.name || 'N/A',
                remarks: record?.remarks || (session ? 'Session conducted, no specific notes.' : 'No active session recorded for this date.')
            };
        });

        return {
            records: mappedHistory,
            pagination: {
                total: totalDays,
                page: page,
                limit: limit,
                pages: Math.ceil(totalDays / limit)
            }
        };
    },

    getMyMarks: async (userId) => {
        const student = await Student.findOne({ userId });
        const marks = await Marks.find({ studentId: student._id });
        return marks;
    },

    getStudentDashboard: async (studentId) => {
        const student = await Student.findById(studentId);
        if (!student) throw new Error('Student not found');
        return await studentViewService.getDashboardData(student.userId);
    }
};

module.exports = studentViewService;
