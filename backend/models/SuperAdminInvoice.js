const mongoose = require('mongoose');

const superAdminInvoiceSchema = new mongoose.Schema({
  invoiceNum: { type: String, required: true, unique: true },
  hospital: { type: String, required: true },
  subscription: { type: String, default: 'Standard Basic' },
  invoiceDate: { type: String, default: '' },
  dueDate: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  gst: { type: Number, default: 0 },
  status: { type: String, default: 'Unpaid' }, // Paid, Unpaid, Overdue
  billingCycle: { type: String, default: 'Monthly' },
  billingPeriod: { type: String, default: '' },
  address: { type: String, default: '' },
  gstin: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('SuperAdminInvoice', superAdminInvoiceSchema);
