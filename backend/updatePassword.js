const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

mongoose.connect('mongodb://127.0.0.1:27017/medicore')
  .then(async () => {
    try {
      const users = await User.find({ role: { $in: ['superadmin', 'super_admin', 'platform_admin'] } });
      console.log(`Found ${users.length} superadmins.`);
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('Superadmin@123', salt);
      for (const user of users) {
        user.password_hash = hash;
        user.hasSetPassword = true;
        await user.save();
        console.log(`Updated password for ${user.staff_id} to Superadmin@123`);
      }
      
      // Also check for specific super.admin@curoxa.com if it doesn't have role superadmin
      const specificUser = await User.findOne({ staff_id: 'super.admin@curoxa.com' });
      if (specificUser && !users.find(u => u._id.equals(specificUser._id))) {
        specificUser.password_hash = hash;
        specificUser.hasSetPassword = true;
        await specificUser.save();
        console.log(`Updated password for specific user super.admin@curoxa.com`);
      }
      
      console.log("Done");
    } catch(e) {
      console.error(e);
    }
    mongoose.disconnect();
  });
