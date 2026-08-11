const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://curoxa:medicore@medicore.emltj84.mongodb.net/?appName=medicore');
    console.log("Connected to MongoDB.");
    
    const totalCount = await Vendor.countDocuments({});
    console.log("Total vendors in database:", totalCount);
    
    // Find one to see its size/structure
    const first = await Vendor.findOne({});
    if (first) {
      console.log("First vendor:", first.name);
      console.log("Number of medicines on first vendor:", first.medicines?.length);
      console.log("First vendor document size approx:", JSON.stringify(first).length, "chars");
    }
    
    // Get average size by sampling
    const sample = await Vendor.find({}).limit(10);
    const totalLen = sample.reduce((acc, v) => acc + JSON.stringify(v).length, 0);
    console.log("Average vendor document size in sample:", totalLen / sample.length, "chars");

    // Check indexes
    const indexes = await mongoose.connection.db.collection('vendors').indexes();
    console.log("Indexes on vendors collection:", indexes);

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
};
run();
