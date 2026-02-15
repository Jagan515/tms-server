const Student = require('../models/Student');

const generateRegistrationNumber = async (joiningDate = new Date()) => {
    const date = new Date(joiningDate);
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // MM
    const year = date.getFullYear().toString().slice(-2); // YY

    // Find the latest student registered in this specific month/year
    // Regex matches starts with MMYY
    const pattern = new RegExp(`^${month}${year}`);

    // Find the last registration number matching this pattern
    // Sorting by registrationNumber descending to get the highest one
    const lastStudent = await Student.findOne({ registrationNumber: pattern })
        .sort({ registrationNumber: -1 })
        .select('registrationNumber');

    let sequence = 1;

    if (lastStudent && lastStudent.registrationNumber) {
        // Extract the last 2 digits (XX)
        const lastSequence = parseInt(lastStudent.registrationNumber.slice(-2));
        if (!isNaN(lastSequence)) {
            sequence = lastSequence + 1;
        }
    }

    // Format XX with leading zero
    const sequenceStr = sequence.toString().padStart(2, '0');

    console.log(`[RegNum] Generating for ${month}/${year}. Sequence: ${sequenceStr}`);

    return `${month}${year}${sequenceStr}`;
};

module.exports = generateRegistrationNumber;
