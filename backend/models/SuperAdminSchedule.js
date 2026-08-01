const mongoose = require('mongoose');

const superAdminScheduleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  frequency: { type: String, default: 'Weekly' }, // Daily, Weekly, Monthly
  format: { type: String, default: 'PDF' }, // PDF, Excel, CSV
  recipients: { type: String, default: '' },
  status: { type: String, default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('SuperAdminSchedule', superAdminScheduleSchema);
