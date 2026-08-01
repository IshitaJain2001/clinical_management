const mongoose = require('mongoose');

const superAdminReportSchema = new mongoose.Schema({
  name: { type: String, required: true },
  source: { type: String, default: 'Invoices' },
  field: { type: String, default: '' },
  date: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('SuperAdminReport', superAdminReportSchema);
