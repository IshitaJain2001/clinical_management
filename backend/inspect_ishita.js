const mongoose = require('mongoose');

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://curoxa:medicore@medicore.emltj84.mongodb.net/?appName=medicore');
    const doctor = await mongoose.connection.db.collection('users').findOne({ name: 'Ishita' });
    console.log("ISHITA DOCTOR RECORD:");
    console.log(JSON.stringify(doctor, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
};
run();
