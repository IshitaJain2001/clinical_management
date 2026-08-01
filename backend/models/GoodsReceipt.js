const mongoose = require('mongoose');

const goodsReceiptSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'city_hospital', index: true },
  grnId: { type: String, required: true },
  poId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  poNumber: { type: String }, // optional human-readable poId
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  vendorName: { type: String, required: true },
  status: { type: String, enum: ['Draft', 'Submitted', 'Verified/Completed'], default: 'Draft' },
  items: [{
    name: { type: String, required: true },
    sku: { type: String, required: true },
    qtyOrdered: { type: Number, default: 0 },
    qtyReceived: { type: Number, required: true },
    price: { type: Number, required: true },
    gst: { type: Number, default: 12 },
    batchNumber: { type: String },
    expiryDate: { type: Date },
    mfgDate: { type: Date }
  }],
  invoiceUrl: { type: String }, // Required only if poId is empty (Direct purchase)
  notes: { type: String },
  receivedBy: { type: String },
  receivedDate: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound unique index for local uniqueness within each tenant
goodsReceiptSchema.index({ tenantId: 1, grnId: 1 }, { unique: true });

module.exports = mongoose.model('GoodsReceipt', goodsReceiptSchema);
