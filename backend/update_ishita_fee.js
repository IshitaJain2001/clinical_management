const mongoose = require('mongoose');

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://curoxa:medicore@medicore.emltj84.mongodb.net/?appName=medicore');
    const result = await mongoose.connection.db.collection('users').updateOne(
      { name: 'Ishita' },
      { $set: { consultationFee: 1000 } }
    );
    console.log("UPDATE RESULT:", result);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
};
run();
