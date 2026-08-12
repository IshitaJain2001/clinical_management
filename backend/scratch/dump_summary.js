const mongoose = require('mongoose');

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://curoxa:medicore@medicore.emltj84.mongodb.net/?appName=medicore');
    
    const db = mongoose.connection.db;
    
    const hospitals = await db.collection('superadminhospitals').find({}).toArray();
    console.log("=== HOSPITALS ===");
    console.log(hospitals.map(h => ({
      _id: h._id,
      name: h.name,
      code: h.code,
      status: h.status,
      gst: h.gst,
      license: h.license
    })));

    const onboardings = await db.collection('superadminonboardings').find({}).toArray();
    console.log("\n=== ONBOARDINGS ===");
    console.log(onboardings.map(o => ({
      _id: o._id,
      name: o.name,
      status: o.status,
      gstin: o.gstin,
      drugLicense: o.drugLicense,
      adminPhone: o.adminPhone,
      adminEmail: o.adminEmail
    })));

    const users = await db.collection('users').find({}).toArray();
    console.log("\n=== USERS (ALL) ===");
    console.log(users.map(u => ({
      _id: u._id,
      tenantId: u.tenantId,
      staff_id: u.staff_id,
      phone: u.phone,
      role: u.role,
      name: u.name,
      email: u.email
    })));

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
};

run();
