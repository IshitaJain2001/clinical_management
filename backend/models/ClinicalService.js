const mongoose = require('mongoose');

const clinicalServiceSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  serviceName: {
    type: String,
    required: true,
    trim: true
  },
  serviceCode: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    default: 'Dental',
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ClinicalService', clinicalServiceSchema);
