import re

main_file = r'D:\rizwan\backend\routes\authRoutes.js'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.rfind('module.exports')

new_routes = """
// ==========================================
// PATIENT PORTAL ROUTES
// ==========================================

// Send OTP for Patient Portal (allows new patients)
router.post('/patient-portal/send-otp', async (req, res) => {
  const { emailOrPhone, tenantId = 'city_hospital' } = req.body;
  if (!emailOrPhone) {
    return res.status(400).json({ error: 'Email or Mobile Number is required' });
  }

  try {
    const input = emailOrPhone.trim();
    
    // Check if user exists
    const Patient = require('../models/Patient');
    let patient = await Patient.findOne({
      $or: [
        { email: input.toLowerCase() },
        { contact: input }
      ]
    });

    let user = null;
    if (patient) {
      user = await User.findOne({ staff_id: patient.contact });
    } else {
      user = await User.findOne({
        $or: [
          { staff_id: input },
          { email: input.toLowerCase() },
          { phone: input }
        ]
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 mins

    if (user) {
      // Existing user
      user.login_otp_code = otp;
      user.login_otp_expires_at = expiresAt;
      await user.save();
    } else {
      // New user - store OTP in memory for now using a quick model
      const mongoose = require('mongoose');
      let TempPatientOTP;
      if (mongoose.models.TempPatientOTP) {
        TempPatientOTP = mongoose.models.TempPatientOTP;
      } else {
        TempPatientOTP = mongoose.model('TempPatientOTP', new mongoose.Schema({
          emailOrPhone: { type: String, required: true },
          otp: { type: String, required: true },
          expiresAt: { type: Date, required: true }
        }));
      }
      
      await TempPatientOTP.findOneAndUpdate(
        { emailOrPhone: input },
        { otp, expiresAt },
        { upsert: true, new: true }
      );
    }

    console.log(`[PATIENT PORTAL] OTP for ${input} is ${otp}`);

    res.json({ message: 'OTP sent successfully', isNewUser: !user });

  } catch (error) {
    console.error('Patient Portal Send OTP Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP for Patient Portal
router.post('/patient-portal/verify-otp', async (req, res) => {
  const { emailOrPhone, otp } = req.body;
  if (!emailOrPhone || !otp) {
    return res.status(400).json({ error: 'Email/Mobile and OTP are required' });
  }

  try {
    const input = emailOrPhone.trim();
    const targetOtp = otp.trim();

    // Check if user exists
    const Patient = require('../models/Patient');
    let user = await User.findOne({
      $or: [
        { staff_id: input },
        { email: input.toLowerCase() },
        { phone: input }
      ]
    }).select('+password_hash');

    if (!user) {
      const patient = await Patient.findOne({
        $or: [
          { email: input.toLowerCase() },
          { contact: input }
        ]
      });
      if (patient) {
        user = await User.findOne({ staff_id: patient.contact }).select('+password_hash');
      }
    }

    if (user) {
      if (!user.login_otp_code || user.login_otp_code !== targetOtp || user.login_otp_expires_at < new Date()) {
        return res.status(401).json({ error: 'Invalid or expired OTP' });
      }
      
      user.login_otp_code = null;
      user.login_otp_expires_at = null;
      user.lastLogin = new Date();
      await user.save();

      const jwt = require('jsonwebtoken');
      const tokenPayload = {
        id: user._id,
        staff_id: user.staff_id,
        role: user.role,
        tenantId: user.tenantId
      };
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'secret_key', { expiresIn: '24h' });

      return res.json({ 
        message: 'Login successful', 
        token, 
        user: { ...user.toObject(), password_hash: undefined },
        isNewUser: false
      });
    } else {
      const mongoose = require('mongoose');
      let TempPatientOTP;
      if (mongoose.models.TempPatientOTP) {
        TempPatientOTP = mongoose.models.TempPatientOTP;
      } else {
        TempPatientOTP = mongoose.model('TempPatientOTP', new mongoose.Schema({
          emailOrPhone: { type: String, required: true },
          otp: { type: String, required: true },
          expiresAt: { type: Date, required: true }
        }));
      }

      const record = await TempPatientOTP.findOne({ emailOrPhone: input });
      if (!record || record.otp !== targetOtp || record.expiresAt < new Date()) {
        return res.status(401).json({ error: 'Invalid or expired OTP' });
      }

      await TempPatientOTP.deleteOne({ emailOrPhone: input });

      const jwt = require('jsonwebtoken');
      const tempToken = jwt.sign({ emailOrPhone: input, isNewPatient: true }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1h' });

      return res.json({
        message: 'OTP verified. Proceed to registration.',
        tempToken,
        isNewUser: true,
        emailOrPhone: input
      });
    }

  } catch (error) {
    console.error('Patient Portal Verify OTP Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

"""

if idx != -1:
    text = text[:idx] + new_routes + text[idx:]
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print('Added patient portal auth routes')
else:
    print('Could not find module.exports')
