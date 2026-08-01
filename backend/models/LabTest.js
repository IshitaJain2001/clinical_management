const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'city_hospital', index: true },
  testCode: { type: String, required: true },
  testName: { type: String, required: true },
  category: { type: String, default: 'General' },
  price: { type: Number, required: true, default: 0 },
  sampleType: { type: String, default: 'Blood' },
  turnaroundTime: { type: String, default: '24 Hours' },
  normalRange: { type: String, default: '' },
  unit: { type: String, default: '' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Compound indexes for fast tenant catalog lookups
labTestSchema.index({ tenantId: 1, isActive: 1 });
labTestSchema.index({ tenantId: 1, testCode: 1 }, { unique: true });

module.exports = mongoose.model('LabTest', labTestSchema);
