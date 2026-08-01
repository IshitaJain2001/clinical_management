const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'city_hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: String, required: true },
  type: { type: String, enum: ['OPD', 'IPD', 'Emergency', 'Teleconsultation', 'Home Visit'], required: true },
  arrivalTimestamp: { type: Date, default: Date.now },
  chiefComplaint: { type: String },
  priority: { type: String, enum: ['Red', 'Yellow', 'Green'], default: 'Green' },
  queuePosition: { type: Number },
  status: { type: String, enum: ['Checked-in', 'In Consultation', 'Completed', 'Cancelled'], default: 'Checked-in' }
}, { timestamps: true });

visitSchema.index({ tenantId: 1, patientId: 1, createdAt: -1 });

module.exports = mongoose.model('Visit', visitSchema);
