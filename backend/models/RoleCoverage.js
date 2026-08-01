const mongoose = require('mongoose');

const roleCoverageSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    default: 'city_hospital'
  },
  state: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

// Ensure unique document per tenant
roleCoverageSchema.index({ tenantId: 1 }, { unique: true });
// Compound index for fast permission lookups by staff
roleCoverageSchema.index({ tenantId: 1, 'state.staffId': 1 });

module.exports = mongoose.model('RoleCoverage', roleCoverageSchema);
