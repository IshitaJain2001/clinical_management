const mongoose = require('mongoose');

const superAdminMeetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  time: { type: String, required: true }, // e.g., '10:00 AM'
  date: { type: String, required: true }, // e.g., '2026-07-16'
  isCompleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('SuperAdminMeeting', superAdminMeetingSchema);
