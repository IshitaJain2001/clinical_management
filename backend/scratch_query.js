const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const User = require('./models/User');
const Patient = require('./models/Patient');

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://curoxa:medicore@medicore.emltj84.mongodb.net/?appName=medicore');
    const appts = await Appointment.find({});
    console.log("ALL APPOINTMENTS IN DB (RAW):");
    console.log(JSON.stringify(appts, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
};
run();
