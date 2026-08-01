const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'city_hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  purposes: {
    treatment: { type: Boolean, default: true },
    insurance: { type: Boolean, default: true },
    research: { type: Boolean, default: false }
  },
  status: { type: String, enum: ['Active', 'Withdrawn'], default: 'Active' },
  signature: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  expiresAt: { type: Date },
  history: [{
    purposes: {
      treatment: Boolean,
      insurance: Boolean,
      research: Boolean
    },
    status: String,
    ipAddress: String,
    userAgent: String,
    actionTimestamp: { type: Date, default: Date.now }
  }],
  dpdpRequests: [{
    requestType: { type: String, enum: ['Correction', 'Deletion'], required: true },
    details: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Hold'], default: 'Pending' },
    resolutionNotes: { type: String, default: '' },
    requestedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date }
  }]
}, { timestamps: true });

consentSchema.index({ tenantId: 1, patientId: 1 });

module.exports = mongoose.model('Consent', consentSchema);
