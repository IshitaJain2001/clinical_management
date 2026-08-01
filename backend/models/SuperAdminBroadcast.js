const mongoose = require('mongoose');

const SuperAdminBroadcastSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  audience: {
    type: String,
    enum: ['All Hospital Administrators', 'Only Active Tiers', 'Only Under-maintenance Tiers'],
    default: 'All Hospital Administrators'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SuperAdminBroadcast', SuperAdminBroadcastSchema);
