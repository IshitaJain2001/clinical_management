const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');
const SuperAdminHospital = require('../models/SuperAdminHospital');

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://curoxa:medicore@medicore.emltj84.mongodb.net/?appName=medicore');
    
    console.log("1. Distinct user tenants...");
    const userTenants = await User.distinct('tenantId', { role: { $nin: ['superadmin', 'super_admin'] } });
    console.log("User tenants:", userTenants);

    console.log("2. Distinct patient tenants...");
    const patientTenants = await Patient.distinct('tenantId');
    console.log("Patient tenants:", patientTenants);

    console.log("3. Fetching hospitals...");
    const hospitals = await SuperAdminHospital.find({});
    console.log("Found hospitals count:", hospitals.length);

    const result = [];
    for (let hospital of hospitals) {
      console.log(`Processing hospital: ${hospital.name} (${hospital.code})`);
      const doctorsCount = await User.countDocuments({ tenantId: hospital.code, role: 'doctor' });
      const staffCount = await User.countDocuments({ tenantId: hospital.code, role: { $nin: ['doctor', 'patient', 'admin'] } });
      console.log(`Doctors: ${doctorsCount}, Staff: ${staffCount}`);

      const adminUser = await User.findOne({ tenantId: hospital.code, role: 'admin' });
      console.log("Admin user found:", !!adminUser);
    }
    console.log("All success!");
  } catch (err) {
    console.error("ERROR DETECTED:", err);
  } finally {
    mongoose.connection.close();
  }
};

run();
