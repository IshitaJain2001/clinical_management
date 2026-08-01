const mongoose = require('mongoose');
require('dotenv').config();
const LeaveRequest = require('./models/LeaveRequest');
const User = require('./models/User');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Delete all leave requests for ishita jain
    const delRes = await LeaveRequest.deleteMany({ employeeName: 'ishita jain' });
    console.log("Deleted leaves for Ishita:", delRes);

    // Fetch doctors and their weeklyOff
    const doctors = await User.find({ role: 'doctor' });
    console.log("Doctors weeklyOff:", doctors.map(d => ({ name: d.name, weeklyOff: d.weeklyOff, staff_id: d.staff_id })));

    mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}
run();
