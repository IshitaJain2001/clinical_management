const mongoose = require('mongoose');

const returnLogSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'city_hospital', index: true },
  returnId: { type: String, required: true },
  returnType: { type: String, enum: ['Prescription-Linked', 'Walk-in / Offline'], required: true },
  patientName: { type: String, required: true },
  patientPhone: { type: String },
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
  prescriptionCode: { type: String },
  items: [{
    medicineName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    reason: { type: String, required: true },
    action: { type: String, enum: ['Restocked', 'Discarded'], default: 'Restocked' }
  }],
  totalRefund: { type: Number, required: true },
  loggedBy: { type: String, default: 'Pharmacist' }
}, { timestamps: true });

module.exports = mongoose.model('ReturnLog', returnLogSchema);
