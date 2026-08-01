const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'city_hospital', index: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  type: { type: String, default: 'Medicine' },
  contactPerson: { type: String },
  gstNumber: { type: String },
  status: { type: String, default: 'Active' },
  attachments: [{ type: String }],
  panNumber: { type: String },
  licenseNumber: { type: String },
  zipCode: { type: String },
  paymentTerms: { type: String },
  creditLimit: { type: Number },
  bankName: { type: String },
  accountNumber: { type: String },
  ifscCode: { type: String },
  notes: { type: String },
  alternatePhone: { type: String },
  creditDays: { type: Number, default: 30 },
  paymentMethod: { type: String, default: 'NEFT' },
  
  // New Fields from Store Supplier Master
  supplierCategory: { type: String },
  organizationType: { type: String },
  houseNo: { type: String },
  street: { type: String },
  country: { type: String },
  pinCode: { type: String },
  landline: { type: String },
  faxNo: { type: String },
  website: { type: String },
  primaryContactPerson: { type: String },
  primaryContactPersonDesignation: { type: String },
  primaryContactPersonMobileNo: { type: String },
  primaryContactPersonEmailId: { type: String },
  secondaryContactPerson: { type: String },
  secondaryContactPersonDesignation: { type: String },
  secondaryContactPersonMobileNo: { type: String },
  secondaryContactPersonEmailId: { type: String },
  cinNo: { type: String },
  pfRegistrationNo: { type: String },
  nameOnPanCard: { type: String },
  panCardNo: { type: String },
  rocNo: { type: String },
  esiRegistrationNo: { type: String },
  isoCertificationNo: { type: String },
  isoValidUpto: { type: String },
  pollutionControlBoardCertificationNo: { type: String },
  pollutionValidUpto: { type: String },
  bank1Name: { type: String },
  bank1Branch: { type: String },
  bank1AccountNumber: { type: String },
  bank1IfscCode: { type: String },
  bank1Address: { type: String },
  taxes: { type: String },
  deliveryTerms: { type: String },
  isMsmeRegistration: { type: String, default: 'No' },
  msmeRegistrationNo: { type: String },
  msmeRegistrationType: { type: String },

  medicines: [{
    name: { type: String, required: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true },
    gst: { type: Number, default: 12 },
    available: { type: Boolean, default: true }
  }],
  purchaseHistory: [{
    poId: { type: String },
    date: { type: Date, default: Date.now },
    amount: { type: Number },
    status: { type: String }
  }]
}, { timestamps: true });

// Index for compound uniqueness of vendor code inside each tenant
vendorSchema.index({ tenantId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Vendor', vendorSchema);
