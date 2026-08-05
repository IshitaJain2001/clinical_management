const mongoose = require('mongoose');

const pharmacyTicketSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  alertId: { type: String, required: true },
  medicineId: { type: String, required: true },
  medicineName: { type: String, required: true },
  currentStock: { type: Number, required: true },
  status: { type: String, default: 'Open', enum: ['Open', 'Resolved'] },
  adminComment: { type: String, default: '' },
  pharmacyReason: { type: String, default: '' },
  resolvedBy: { type: String, default: '' },
  resolvedAt: { type: Date }
}, { timestamps: true });

pharmacyTicketSchema.index({ tenantId: 1, alertId: 1 });

module.exports = mongoose.model('PharmacyTicket', pharmacyTicketSchema);
