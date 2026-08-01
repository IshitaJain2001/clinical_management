const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'city_hospital', index: true },
  poId: { type: String, required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  vendorName: { type: String, required: true },
  items: [{
    name: { type: String, required: true },
    sku: { type: String, required: true },
    requiredQty: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true },
    tax: { type: Number, default: 12 },
    total: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  status: { type: String, default: 'Draft', index: true },
  expectedDelivery: { type: Date },
  requestedBy: { type: String, required: true }
}, { timestamps: true });

// Compound unique index for local uniqueness within each tenant
purchaseOrderSchema.index({ tenantId: 1, poId: 1 }, { unique: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
