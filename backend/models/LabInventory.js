const mongoose = require('mongoose');

const labInventorySchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'city_hospital', index: true },
  name: { type: String, required: true },
  category: { type: String, required: true }, // 'Reagents', 'Consumables', 'Equipment'
  stock: { type: Number, required: true, default: 0 },
  unit: { type: String, required: true }, // 'L', 'units', 'boxes'
  threshold: { type: Number, required: true, default: 20 },
  lastRestock: { type: String, default: '--' },
  status: { type: String, enum: ['Healthy', 'Low Stock', 'Out of Stock'], default: 'Healthy' }
}, { timestamps: true });

// Pre-save middleware to automatically calculate item status
labInventorySchema.pre('save', function() {
  if (this.stock === 0) {
    this.status = 'Out of Stock';
  } else if (this.stock <= this.threshold) {
    this.status = 'Low Stock';
  } else {
    this.status = 'Healthy';
  }
});

module.exports = mongoose.model('LabInventory', labInventorySchema);
