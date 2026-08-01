const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'city_hospital', index: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    medicine: { type: String, required: true },
    dosage: { type: String, required: true },
    duration: { type: String, required: true },
    instructions: { type: String },
    quantity: { type: Number, default: 1 }
  }],
  status: { type: String, enum: ['Pending', 'Pending Pharmacy Dispatch', 'Direct Patient', 'In Progress', 'Dispensed', 'Dispensed by Pharmacy'], default: 'Pending' }
}, { timestamps: true });

// Compound indexes for fast per-tenant queue lookups (real-time pharmacy polling)
prescriptionSchema.index({ tenantId: 1, status: 1 });
prescriptionSchema.index({ tenantId: 1, patientId: 1, createdAt: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
