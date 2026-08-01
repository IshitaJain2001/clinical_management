const mongoose = require('mongoose');

const registrationOtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp_code: {
    type: String,
    required: true
  },
  expires_at: {
    type: Date,
    required: true
  }
}, { timestamps: true });

registrationOtpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
registrationOtpSchema.index({ email: 1 });

module.exports = mongoose.model('RegistrationOtp', registrationOtpSchema);
