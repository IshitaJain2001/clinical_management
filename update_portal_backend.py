import sys, codecs

main_file = r'D:\rizwan\backend\routes\authRoutes.js'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the entire PATIENT PORTAL ROUTES section with the robust multi-provider version
find_start = "// ==========================================\n// PATIENT PORTAL ROUTES\n// =========================================="
start_idx = text.find(find_start)
end_idx = text.rfind("module.exports = router;")

new_patient_portal_code = """// ==========================================
// PATIENT PORTAL ROUTES
// ==========================================

// Helper function to dispatch OTP email across Brevo, SendGrid, Resend, and SMTP
async function sendPortalOtpEmail(targetEmail, otp) {
  const emailHtmlBody = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; text-align: center;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; text-align: left;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 26px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Curoxa Patient Portal</h1>
        </div>
        <div style="padding: 32px 24px; text-align: center;">
          <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 8px; font-size: 18px; font-weight: 700;">Your Verification Code</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
            Use the 6-digit One-Time Password (OTP) below to log into your Curoxa Patient Portal. This code is valid for <strong>10 minutes</strong>.
          </p>
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 24px; margin-bottom: 24px; display: inline-block;">
            <span style="font-size: 32px; font-weight: 800; color: #1e3a8a; letter-spacing: 6px; font-family: monospace;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            If you did not request this OTP, you can safely ignore this email.
          </p>
        </div>
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px; text-align: center;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; 2026 Curoxa Healthcare Systems. Confidential.</p>
        </div>
      </div>
    </div>
  `;

  let emailSent = false;

  // 1. Try Brevo
  if (process.env.BREVO_API_KEY) {
    try {
      const https = require("https");
      const payload = JSON.stringify({
        sender: { name: "Curoxa Security", email: process.env.SMTP_USER || "curoxatechnology@gmail.com" },
        to: [{ email: targetEmail }],
        subject: `Curoxa Patient Verification Code: ${otp}`,
        htmlContent: emailHtmlBody
      });
      const options = {
        hostname: 'api.brevo.com',
        port: 443,
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY.trim(),
          'Content-Length': Buffer.byteLength(payload)
        }
      };
      await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) resolve();
            else reject(new Error(`Brevo status ${res.statusCode}: ${data}`));
          });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
      });
      emailSent = true;
      console.log(`[PATIENT PORTAL] Email sent via Brevo to ${targetEmail}`);
    } catch (e) {
      console.warn("[PATIENT PORTAL] Brevo failed:", e.message);
    }
  }

  // 2. Try SendGrid
  if (!emailSent && process.env.SENDGRID_API_KEY) {
    try {
      const https = require("https");
      const payload = JSON.stringify({
        personalizations: [{ to: [{ email: targetEmail }] }],
        from: { email: process.env.SMTP_USER || "curoxatechnology@gmail.com", name: "Curoxa Security" },
        subject: `Curoxa Patient Verification Code: ${otp}`,
        content: [{ type: "text/html", value: emailHtmlBody }]
      });
      const options = {
        hostname: 'api.sendgrid.com',
        port: 443,
        path: '/v3/mail/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY.trim()}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      };
      await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) resolve();
            else reject(new Error(`SendGrid status ${res.statusCode}: ${data}`));
          });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
      });
      emailSent = true;
      console.log(`[PATIENT PORTAL] Email sent via SendGrid to ${targetEmail}`);
    } catch (e) {
      console.warn("[PATIENT PORTAL] SendGrid failed:", e.message);
    }
  }

  // 3. Try Resend
  if (!emailSent && process.env.RESEND_API_KEY) {
    try {
      const https = require("https");
      const payload = JSON.stringify({
        from: process.env.SMTP_FROM || "Curoxa <security@verification.curoxa.in>",
        to: [targetEmail],
        subject: `Curoxa Patient Verification Code: ${otp}`,
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
      await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) resolve();
            else reject(new Error(`Resend status ${res.statusCode}: ${data}`));
          });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
      });
      emailSent = true;
      console.log(`[PATIENT PORTAL] Email sent via Resend to ${targetEmail}`);
    } catch (e) {
      console.warn("[PATIENT PORTAL] Resend failed:", e.message);
    }
  }

  // 4. Try SMTP
  if (!emailSent && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.mailtrap.io",
        port: parseInt(process.env.SMTP_PORT, 10) || 2525,
        secure: process.env.SMTP_SECURE === "true" || parseInt(process.env.SMTP_PORT, 10) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Curoxa Security" <${process.env.SMTP_USER}>`,
        to: targetEmail,
        subject: `Curoxa Patient Verification Code: ${otp}`,
        html: emailHtmlBody
      });
      emailSent = true;
      console.log(`[PATIENT PORTAL] Email sent via SMTP to ${targetEmail}`);
    } catch (e) {
      console.warn("[PATIENT PORTAL] SMTP failed:", e.message);
    }
  }

  return emailSent;
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
    
    // Check if patient exists
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
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    if (user) {
      user.login_otp_code = otp;
      user.login_otp_expires_at = expiresAt;
      await user.save();
    }

    // Always store in RegistrationOtp for seamless verification fallback
    await RegistrationOtp.findOneAndUpdate(
      { email: input.toLowerCase() },
      { otp_code: otp, expires_at: expiresAt },
      { upsert: true, returnDocument: 'after' }
    );

    console.log(`[PATIENT PORTAL] Generated OTP for ${input}: ${otp}`);

    // Send email if input is an email or if user/patient has an email
    const targetEmail = (user && user.email) || (patient && patient.email) || (input.includes('@') ? input.toLowerCase() : null);
    if (targetEmail) {
      await sendPortalOtpEmail(targetEmail, otp);
    }

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
    const Patient = require('../models/Patient');
    const RegistrationOtp = require('../models/RegistrationOtp');
    const { getJwtSecret } = require('../config/env');

    let secretKey;
    try { secretKey = getJwtSecret(); } catch(e) { secretKey = process.env.JWT_SECRET || 'secret_key'; }

    // Check if user exists
    let user = await User.findOne({
      $or: [
        { staff_id: input },
        { email: input.toLowerCase() },
        { phone: input }
      ]
    }).select('+password_hash');

    let patientDoc = null;
    if (!user) {
      patientDoc = await Patient.findOne({
        $or: [
          { email: input.toLowerCase() },
          { contact: input }
        ]
      });
      if (patientDoc) {
        user = await User.findOne({ staff_id: patientDoc.contact }).select('+password_hash');
      }
    } else if (user.role === 'patient') {
      patientDoc = await Patient.findOne({
        $or: [
          { contact: user.staff_id },
          { email: user.email }
        ]
      });
    }

    // Verify OTP against User model or RegistrationOtp model
    let otpValid = false;
    if (user && user.login_otp_code === targetOtp && user.login_otp_expires_at >= new Date()) {
      otpValid = true;
    }

    if (!otpValid) {
      const regOtpRecord = await RegistrationOtp.findOne({ email: input.toLowerCase() });
      if (regOtpRecord && regOtpRecord.otp_code === targetOtp && regOtpRecord.expires_at >= new Date()) {
        otpValid = true;
        await RegistrationOtp.deleteOne({ _id: regOtpRecord._id }).catch(() => {});
      }
    }

    if (!otpValid) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    if (user) {
      user.login_otp_code = null;
      user.login_otp_expires_at = null;
      user.lastLogin = new Date();
      await user.save();

      const jwt = require('jsonwebtoken');
      const targetId = patientDoc ? patientDoc._id : user._id;

      const tokenPayload = {
        id: targetId,
        userId: user._id,
        staff_id: user.staff_id,
        role: user.role,
        tenantId: user.tenantId
      };
      const token = jwt.sign(tokenPayload, secretKey, { expiresIn: '24h' });

      return res.json({ 
        message: 'Login successful', 
        token, 
        user: { ...user.toObject(), id: targetId, password_hash: undefined },
        isNewUser: false
      });
    } else {
      // New patient registration token
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

"""

if start_idx != -1 and end_idx != -1:
    text = text[:start_idx] + new_patient_portal_code + text[end_idx:]
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced patient portal auth routes with robust multi-provider version!")
else:
    print(f"Could not locate markers: start_idx={start_idx}, end_idx={end_idx}")
