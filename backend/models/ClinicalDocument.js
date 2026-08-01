const mongoose = require('mongoose');

const clinicalDocumentSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'city_hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  title: { type: String, required: true },
  category: { type: String, enum: ['Referral', 'Scan', 'Discharge', 'PrescriptionScan', 'LabReport', 'Other'], default: 'Other' },
  fileUrl: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

clinicalDocumentSchema.index({ tenantId: 1, patientId: 1, createdAt: -1 });

module.exports = mongoose.model('ClinicalDocument', clinicalDocumentSchema);
