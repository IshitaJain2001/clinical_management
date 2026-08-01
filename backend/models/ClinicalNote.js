const mongoose = require('mongoose');

const clinicalNoteSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'city_hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjective: { type: String, default: '' },
  objective: { type: String, default: '' },
  assessment: [{ type: String }], // List of diagnoses (e.g. Essential Hypertension)
  plan: { type: String, default: '' },
  voiceDictationUrl: { type: String, default: '' },
  isDraft: { type: Boolean, default: true },
  digitalSignature: { type: String, default: '' },
  history: [{
    subjective: String,
    objective: String,
    assessment: [String],
    plan: String,
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

clinicalNoteSchema.index({ tenantId: 1, patientId: 1, createdAt: -1 });

module.exports = mongoose.model('ClinicalNote', clinicalNoteSchema);
