const mongoose = require('mongoose');

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://curoxa:medicore@medicore.emltj84.mongodb.net/?appName=medicore');
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log("ALL USERS IN DB:");
    console.log(users.map(u => ({
      _id: u._id,
      name: u.name,
      role: u.role,
      specialty: u.specialty,
      weeklyOff: u.weeklyOff
    })));
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
};
run();
