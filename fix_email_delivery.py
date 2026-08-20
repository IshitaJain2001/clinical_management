import sys, codecs

main_file = r'D:\rizwan\backend\routes\authRoutes.js'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

find_code = """    console.log(`[PATIENT PORTAL] OTP for ${input} is ${otp}`);

    res.json({ message: 'OTP sent successfully', isNewUser: !user });"""

replace_code = """    console.log(`[PATIENT PORTAL] OTP for ${input} is ${otp}`);

    // Send email to target email
    const targetEmail = (user && user.email) || (patient && patient.email) || (input.includes('@') ? input : null);
    if (targetEmail) {
      const emailHtmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #2563eb; margin: 0; font-size: 24px;">Curoxa Patient Portal</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Secure Patient Verification</p>
          </div>
          <p style="color: #334155; font-size: 15px;">Hello,</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Use the following One-Time Password (OTP) to sign in or register for your Curoxa Patient Portal:</p>
          <div style="background: #f1f5f9; padding: 18px; border-radius: 8px; text-align: center; font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #1e293b; margin: 24px 0; border: 1px dashed #cbd5e1;">
            ${otp}
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">This OTP is valid for 10 minutes. If you did not request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">© Curoxa Healthcare Systems. Secure & Confidential.</p>
        </div>
      `;

      let sentViaResend = false;
      if (process.env.RESEND_API_KEY) {
        try {
          const https = require("https");
          const payload = JSON.stringify({
            from: "Curoxa <security@verification.curoxa.in>",
            to: [targetEmail],
            subject: `Your Curoxa Patient Portal OTP: ${otp}`,
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
            const request = https.request(options, (res) => {
              let data = '';
              res.on('data', (chunk) => { data += chunk; });
              res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) resolve();
                else reject(new Error(`Resend API status ${res.statusCode}: ${data}`));
              });
            });
            request.on('error', reject);
            request.write(payload);
            request.end();
          });
          sentViaResend = true;
          console.log(`[PATIENT PORTAL] OTP email successfully sent via Resend to ${targetEmail}`);
        } catch (resendErr) {
          console.error("[PATIENT PORTAL] Resend email failed:", resendErr.message);
        }
      }

      if (!sentViaResend) {
        try {
          const { sendEmail } = require('../utils/emailService');
          await sendEmail({
            to: targetEmail,
            subject: `Your Curoxa Patient Portal OTP: ${otp}`,
            text: `Your Curoxa Patient Portal OTP is ${otp}. Valid for 10 minutes.`,
            html: emailHtmlBody
          });
        } catch (serviceErr) {
          console.error("[PATIENT PORTAL] emailService failed:", serviceErr.message);
        }
      }
    }

    res.json({ message: 'OTP sent successfully', isNewUser: !user });"""

if find_code in text:
    text = text.replace(find_code, replace_code)
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print('Updated authRoutes.js with email sending!')
else:
    print('Could not find injection point in authRoutes.js')
