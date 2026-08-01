const mongoose = require('mongoose');

const superAdminSupportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  hospital: { type: String, required: true },
  contact: { type: String, default: '' },
  department: { type: String, default: 'Pharmacy' },
  priority: { type: String, default: 'Medium' }, // Low, Medium, High, Critical
  category: { type: String, default: 'Technical Issue' },
  assignedTo: { type: String, default: '' },
  createdOn: { type: String, default: '' },
  dueDate: { type: String, default: '' },
  status: { type: String, default: 'Open' }, // Open, Resolved, Closed
  slaStatus: { type: String, default: 'Within SLA' }, // Within SLA, Breached
  description: { type: String, default: '' },
  messages: [{
    sender: { type: String, default: '' },
    timestamp: { type: String, default: '' },
    text: { type: String, default: '' },
    isNote: { type: Boolean, default: false }
  }],
  timeline: [{
    action: { type: String, default: '' },
    date: { type: String, default: '' },
    actor: { type: String, default: '' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('SuperAdminSupport', superAdminSupportSchema);
