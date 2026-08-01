const mongoose = require('mongoose');

const superAdminAuditSchema = new mongoose.Schema({
  user: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String, default: '' },
  ip: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('SuperAdminAudit', superAdminAuditSchema);
