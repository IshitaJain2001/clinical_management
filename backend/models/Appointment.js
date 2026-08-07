const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'city_hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Completed', 'Cancelled', 'Paid'], 
    default: 'Pending' 
  },
  source: {
    type: String,
    enum: ['Walk-In', 'Online'],
    default: 'Walk-In'
  },
  reason: { type: String, required: true },
  notes: { type: String },
  diagnosis: { type: String },
  regNo: { type: String },
  createdAt: {type: Date, default: Date.now},
}, { timestamps: true });

// Compound indexes for fast per-tenant date/status lookups (real-time polling)
appointmentSchema.index({ tenantId: 1, date: 1 });
appointmentSchema.index({ tenantId: 1, status: 1 });
appointmentSchema.index({ tenantId: 1, doctorId: 1, date: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
