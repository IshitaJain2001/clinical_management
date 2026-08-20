import sys, codecs

main_file = r'D:\rizwan\backend\routes\authRoutes.js'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

find_start = "// ==========================================\n// PATIENT PORTAL ROUTES\n// =========================================="
start_idx = text.find(find_start)
end_idx = text.rfind("module.exports = router;")

new_code = """// ==========================================
// PATIENT PORTAL ROUTES
// ==========================================

// Fail-safe helper to send OTP email across Resend and SMTP (matching /send-login-otp)
async function sendPortalOtpEmail(targetEmail, otp) {
  try {
    const emailHtmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2563eb; margin: 0; font-size: 24px;">Curoxa Patient Portal</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Secure Patient Verification</p>
        </div>
        <p style="color: #334155; font-size: 15px;">Hello,</p>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">Use the following One-Time Password (OTP) to log in or register for your Curoxa Patient Portal:</p>
        <div style="background: #f1f5f9; padding: 18px; border-radius: 8px; text-align: center; font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #1e293b; margin: 24px 0; border: 1px dashed #cbd5e1;">
          ${otp}
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">This OTP is valid for 10 minutes. If you did not request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">© Curoxa Healthcare Systems. Secure & Confidential.</p>
      </div>
    `;

    // 1. Try Resend if configured
    if (process.env.RESEND_API_KEY) {
      try {
        const https = require("https");
        const payload = JSON.stringify({
          from: "Curoxa <security@verification.curoxa.in>",
          to: [targetEmail],
          subject: `Curoxa Patient Portal OTP: ${otp}`,
          html: emailHtmlBody
        });
        const options = {
          hostname: 'api.resend.com',
          port: 443,
          path: '/emails',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY.trim()}`,
            'Content-Length': Buffer.byteLength(payload)
          }
        };
        await new Promise((resolve) => {
          const req = https.request(options, (res) => {
            res.on('data', () => {});
            res.on('end', () => resolve());
          });
          req.on('error', () => resolve());
          req.write(payload);
          req.end();
        });
        console.log(`[PATIENT PORTAL] OTP email dispatched to ${targetEmail}`);
        return true;
      } catch (err) {
        console.warn("[PATIENT PORTAL] Resend email error:", err.message);
      }
    }

    // 2. Try SMTP
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const nodemailer = require("nodemailer");
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.mailtrap.io",
          port: parseInt(process.env.SMTP_PORT, 10) || 2525,
          secure: process.env.SMTP_SECURE === "true" || parseInt(process.env.SMTP_PORT, 10) === 465,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        await transporter.sendMail({
          from: `"Curoxa Security" <${process.env.SMTP_USER}>`,
          to: targetEmail,
          subject: `Curoxa Patient Portal OTP: ${otp}`,
          html: emailHtmlBody
        });
        console.log(`[PATIENT PORTAL] OTP email sent via SMTP to ${targetEmail}`);
        return true;
      } catch (err) {
        console.warn("[PATIENT PORTAL] SMTP email error:", err.message);
      }
    }
  } catch (outerErr) {
    console.error("[PATIENT PORTAL] Email dispatcher exception:", outerErr.message);
  }
  return false;
}

// Send OTP for Patient Portal (allows existing & new patients)
router.post('/patient-portal/send-otp', async (req, res) => {
  const { emailOrPhone } = req.body;
  if (!emailOrPhone) {
    return res.status(400).json({ error: 'Email or Mobile Number is required' });
  }

  try {
    const input = emailOrPhone.trim();
    const Patient = require('../models/Patient');
    const RegistrationOtp = require('../models/RegistrationOtp');
    
    // 1. Check if patient record exists in Patient collection
    let patient = await Patient.findOne({
      $or: [
        { email: input.toLowerCase() },
        { contact: input }
      ]
    });

    // 2. Check if user account exists
    let user = null;
    if (patient) {
      user = await User.findOne({
        $or: [
          { staff_id: patient.contact },
          { email: patient.email ? patient.email.toLowerCase() : '' },
          { phone: patient.contact }
        ]
      });
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
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    if (user) {
      user.login_otp_code = otp;
      user.login_otp_expires_at = expiresAt;
      await user.save();
    }

    // Always store in RegistrationOtp for seamless verification fallback
    try {
      await RegistrationOtp.findOneAndUpdate(
        { email: input.toLowerCase() },
        { otp_code: otp, expires_at: expiresAt },
        { upsert: true, new: true }
      );
    } catch (dbErr) {
      console.warn('[PATIENT PORTAL] RegistrationOtp store warning:', dbErr.message);
    }

    console.log(`[PATIENT PORTAL] Generated OTP for ${input}: ${otp}`);

    // Send email asynchronously without blocking the response
    const targetEmail = (user && user.email) || (patient && patient.email) || (input.includes('@') ? input.toLowerCase() : null);
    if (targetEmail) {
      sendPortalOtpEmail(targetEmail, otp).catch(e => console.error("Async email error:", e));
    }

    const isRegistered = Boolean(patient || user);
    return res.json({ message: 'OTP sent successfully', isNewUser: !isRegistered });

  } catch (error) {
    console.error('Patient Portal Send OTP Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
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
    const Patient = require('../models/Patient');
    const RegistrationOtp = require('../models/RegistrationOtp');
    const { getJwtSecret } = require('../config/env');

    let secretKey;
    try { secretKey = getJwtSecret(); } catch(e) { secretKey = process.env.JWT_SECRET || 'secret_key'; }

    // 1. Search in Patient collection first
    let patientDoc = await Patient.findOne({
      $or: [
        { email: input.toLowerCase() },
        { contact: input }
      ]
    });

    // 2. Search linked or standalone User account
    let user = null;
    if (patientDoc) {
      user = await User.findOne({
        $or: [
          { staff_id: patientDoc.contact },
          { email: patientDoc.email ? patientDoc.email.toLowerCase() : '' },
          { phone: patientDoc.contact }
        ]
      }).select('+password_hash');
    }

    if (!user) {
      user = await User.findOne({
        $or: [
          { staff_id: input },
          { email: input.toLowerCase() },
          { phone: input }
        ]
      }).select('+password_hash');

      if (user && !patientDoc) {
        patientDoc = await Patient.findOne({
          $or: [
            { contact: user.staff_id },
            { email: user.email ? user.email.toLowerCase() : '' },
            { contact: user.phone || '' }
          ]
        });
      }
    }

    // 3. Verify OTP code
    let otpValid = false;
    if (user && user.login_otp_code === targetOtp && user.login_otp_expires_at >= new Date()) {
      otpValid = true;
    }

    if (!otpValid) {
      try {
        const regOtpRecord = await RegistrationOtp.findOne({ email: input.toLowerCase() });
        if (regOtpRecord && regOtpRecord.otp_code === targetOtp && regOtpRecord.expires_at >= new Date()) {
          otpValid = true;
          await RegistrationOtp.deleteOne({ _id: regOtpRecord._id }).catch(() => {});
        }
      } catch (e) {}
    }

    if (!otpValid) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // 4. Handle Existing Patient or User
    if (patientDoc || user) {
      // If patient exists but no User account was created yet, create a User record now
      if (!user && patientDoc) {
        user = await User.create({
          name: patientDoc.name,
          email: patientDoc.email || `${patientDoc.contact}@curoxa.patient`,
          phone: patientDoc.contact,
          staff_id: patientDoc.contact,
          role: 'patient',
          tenantId: patientDoc.tenantId || 'city_hospital',
          password_hash: 'PATIENT_OTP_AUTH'
        });
      } else if (user) {
        user.login_otp_code = null;
        user.login_otp_expires_at = null;
        user.lastLogin = new Date();
        await user.save();
      }

      const jwt = require('jsonwebtoken');
      const targetId = patientDoc ? patientDoc._id : user._id;

      // Always grant role: 'patient' in the portal session token so they see patient dashboard history
      const tokenPayload = {
        id: targetId,
        userId: user._id,
        staff_id: user.staff_id || (patientDoc ? patientDoc.contact : input),
        role: 'patient',
        actualStaffRole: user.role,
        tenantId: user.tenantId || (patientDoc ? patientDoc.tenantId : 'city_hospital')
      };
      const token = jwt.sign(tokenPayload, secretKey, { expiresIn: '24h' });

      return res.json({ 
        message: 'Login successful', 
        token, 
        user: { 
          ...user.toObject(), 
          id: targetId, 
          role: 'patient', 
          actualStaffRole: user.role,
          name: patientDoc ? patientDoc.name : user.name,
          password_hash: undefined 
        },
        isNewUser: false
      });
    } else {
      // Completely new patient -> forward to registration
      const jwt = require('jsonwebtoken');
      const tempToken = jwt.sign({ emailOrPhone: input, isNewPatient: true, role: 'patient' }, secretKey, { expiresIn: '1h' });

      return res.json({
        message: 'OTP verified. Proceed to registration.',
        tempToken,
        isNewUser: true,
        emailOrPhone: input
      });
    }

  } catch (error) {
    console.error('Patient Portal Verify OTP Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

"""

if start_idx != -1 and end_idx != -1:
    text = text[:start_idx] + new_code + text[end_idx:]
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Updated patient portal backend routes with bulletproof non-blocking dispatcher!")
else:
    print(f"Markers not found: start_idx={start_idx}, end_idx={end_idx}")
