const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    default: 'city_hospital',
    index: true
  },
  assetName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  serialNumber: {
    type: String,
    required: true
  },
  assignedTo: {
    type: String,
    default: ''
  },
  assignedDate: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    required: true,
    enum: ['Active', 'Under Maintenance', 'Retired'],
    default: 'Active'
  },
  value: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);
