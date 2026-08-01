const mongoose = require('mongoose');

const procedureSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'city_hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' },
  procedureName: { type: String, required: true },
  preOpNotes: { type: String, default: '' },
  postOpNotes: { type: String, default: '' },
  anesthesiaDetails: { type: String, default: '' },
  implants: { type: String, default: '' },
  consentFormUrl: { type: String, default: '' },
  charges: { type: Number, default: 0 },
  status: { type: String, enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'], default: 'Scheduled' }
}, { timestamps: true });

procedureSchema.index({ tenantId: 1, patientId: 1, createdAt: -1 });

module.exports = mongoose.model('Procedure', procedureSchema);
