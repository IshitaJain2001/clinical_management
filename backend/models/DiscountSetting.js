const mongoose = require('mongoose');

const discountSettingSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'city_hospital', index: true },
  allowedDiscountPercent: { type: Number, required: true, default: 10 }
}, { timestamps: true });

module.exports = mongoose.model('DiscountSetting', discountSettingSchema);
