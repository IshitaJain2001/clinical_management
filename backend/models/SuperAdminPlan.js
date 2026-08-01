const mongoose = require('mongoose');

const superAdminPlanSchema = new mongoose.Schema({
  tier: { type: String, required: true },
  matchKey: { type: String, required: true },
  monthlyPrice: { type: Number, required: true },
  annualPrice: { type: Number, required: true },
  docs: { type: Number, required: true },
  staff: { type: Number, required: true },
  storage: { type: String, required: true },
  features: [{
    name: { type: String, required: true },
    included: { type: Boolean, required: true }
  }],
  modules: [{ type: String }] // Included module IDs e.g. ['reception', 'doctor', 'pharmacy']
}, { timestamps: true });

module.exports = mongoose.model('SuperAdminPlan', superAdminPlanSchema);
