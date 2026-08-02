const mongoose = require('mongoose');

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://curoxa:medicore@medicore.emltj84.mongodb.net/?appName=medicore');
    const patients = await mongoose.connection.db.collection('patients').find({}).toArray();
    console.log("ALL PATIENTS IN DB:");
    console.log(JSON.stringify(patients.map(p => ({
      _id: p._id,
      tenantId: p.tenantId,
      name: p.name,
      contact: p.contact,
      email: p.email
    })), null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
};
run();
