const mongoose = require('mongoose');

const superAdminBackupSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  size: { type: String, default: '' },
  date: { type: String, default: '' },
  type: { type: String, default: 'Auto-Scheduled' }, // Auto-Scheduled, Manual
  status: { type: String, default: 'Success' }
}, { timestamps: true });

module.exports = mongoose.model('SuperAdminBackup', superAdminBackupSchema);
