const mongoose = require('mongoose');

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://curoxa:medicore@medicore.emltj84.mongodb.net/?appName=medicore');
    const result = await mongoose.connection.db.collection('superadminhospitals').updateOne(
      { code: "med-hospi-757" },
      { $set: { "modules.doctor.enabled": true } }
    );
    console.log("Database update result:", result);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
};
run();
