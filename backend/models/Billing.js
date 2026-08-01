const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'city_hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  items: [{
    description: { type: String, required: true },
    amount: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
  paymentMethod: { type: String },
  discountPercent: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  originalAmount: { type: Number },
  discountReason: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Billing', billingSchema);
