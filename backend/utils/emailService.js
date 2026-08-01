const nodemailer = require("nodemailer");

/**
 * Sends an email using SMTP or Brevo API fallback.
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML email content
 */
async function sendEmail({ to, subject, text, html }) {
  const recipients = Array.isArray(to) ? to : [to];
  
  for (const recipient of recipients) {
    let emailSent = false;

    // 1. Try SMTP first
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const smtpConfig = {
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_PORT, 10) || 465,
          secure: process.env.SMTP_SECURE === "true" || parseInt(process.env.SMTP_PORT, 10) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 10000
        };
        const transporter = nodemailer.createTransport(smtpConfig);
        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"Curoxa Platform" <${process.env.SMTP_USER}>`,
          to: recipient,
          subject,
          text,
          html
        });
        emailSent = true;
        console.log(`[EMAIL] Email successfully sent via SMTP to ${recipient}`);
      } catch (smtpError) {
        console.error(`[EMAIL] SMTP failed for ${recipient}:`, smtpError.message);
      }
    }

    // 2. Try Brevo fallback if SMTP failed or not configured
    if (!emailSent && process.env.BREVO_API_KEY) {
      try {
        const https = require("https");
        const payload = JSON.stringify({
          sender: { 
            name: "Curoxa Platform", 
            email: process.env.SMTP_USER || "curoxatechnology@gmail.com" 
          },
          to: [{ email: recipient }],
          subject,
          textContent: text,
          htmlContent: html
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
              else reject(new Error(`Brevo API status ${res.statusCode}: ${data}`));
            });
          });
          req.on('error', reject);
          req.write(payload);
          req.end();
        });
        emailSent = true;
        console.log(`[EMAIL] Email successfully sent via Brevo to ${recipient}`);
      } catch (brevoError) {
        console.error(`[EMAIL] Brevo failed for ${recipient}:`, brevoError.message);
      }
    }

    if (!emailSent) {
      console.warn(`[EMAIL] Failed to send email to ${recipient} (no working service)`);
    }
  }
}

module.exports = { sendEmail };
