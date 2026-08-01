const mongoose = require('mongoose');

const superAdminLeadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  city: { type: String, default: '' },
  source: { type: String, default: 'Direct Sales' },
  stage: { type: String, default: 'Lead' }, // Lead, Demo, Quotation, Agreement, Closed Won, Closed Lost
  revenue: { type: String, default: '' },
  nextFollow: { type: String, default: '' },
  status: { type: String, default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('SuperAdminLead', superAdminLeadSchema);
