const nodemailer = require('nodemailer');

// From address configuration
const mailFromAddress = process.env.MAIL_FROM_ADDRESS || 'donotreply@legacyclinics.rw';
const mailFromName = process.env.MAIL_FROM_NAME || 'Legacy Clinics';
const mailFrom = `"${mailFromName}" <${mailFromAddress}>`;

const port = parseInt(process.env.SMTP_PORT || '465', 10);
const isSecure = port === 465;

// SMTP transporter configuration for mail.legacyclinics.rw (SSL Port 465 / TLS Port 587)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.legacyclinics.rw',
  port: port,
  secure: isSecure, // true for 465, false for 587 or other ports
  auth: {
    user: process.env.SMTP_USER || 'donotreply@legacyclinics.rw',
    pass: process.env.SMTP_PASS || 'AMAhamba@2110',
  },
  tls: {
    rejectUnauthorized: false // Ensures smooth SSL handshake without certificate mismatch errors
  }
});

// Verify connection on startup gracefully
transporter.verify((error, success) => {
  if (error) {
    console.warn('⚠️ SMTP Connection Warning:', error.message);
  } else {
    console.log(`📧 SMTP Email Service Connected: mail.legacyclinics.rw (Port ${port})`);
  }
});

/**
 * Generic email sender
 */
const sendEmail = async ({ to, subject, html, text, attachments }) => {
  const mailOptions = {
    from: mailFrom,
    to,
    subject,
    html,
    text,
    attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${to} [ID: ${info.messageId}]`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send user credentials email (new account, password reset, etc.)
 */
const sendUserCredentials = async (email, username, password, subject = 'Your Account Credentials') => {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background-color: #1e3a8a; padding: 24px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 700;">Legacy Clinics & Diagnostics</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Lumina Portal Login Credentials</p>
      </div>
      <div style="padding: 24px; background-color: #ffffff; color: #334155;">
        <p style="margin-top: 0;">Dear User,</p>
        <p>Your account has been configured. Here are your credentials to log in to the Lumina Portal:</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Username:</strong> ${username}</p>
          <p style="margin: 4px 0;"><strong>Password:</strong> ${password}</p>
        </div>
        <p style="color: #64748b; font-size: 13px;">
          <strong>Security Note:</strong> Please log in and update your password immediately to protect your account.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          This is an automated message from Legacy Clinics — Lumina Portal. Please do not reply directly to this email.
        </p>
      </div>
    </div>
  `;
  const text = `Legacy Clinics Lumina Portal\n\nYour account credentials:\nUsername: ${username}\nPassword: ${password}\n\nPlease change your password on first login.`;

  return sendEmail({ to: email, subject, html, text });
};

/**
 * Send notification email
 */
const sendNotification = async (email, subject, message, type = 'info') => {
  const colorMap = {
    info: '#2563eb',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
      <div style="border-left: 4px solid ${colorMap[type] || '#2563eb'}; padding-left: 15px;">
        <h3 style="margin-top: 0; color: ${colorMap[type] || '#2563eb'};">${subject}</h3>
        <p style="margin: 10px 0; color: #334155; line-height: 1.5;">${message}</p>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        Legacy Clinics & Diagnostics — Lumina Portal Automated Notification
      </p>
    </div>
  `;

  return sendEmail({ to: email, subject, html, text: `${subject}\n\n${message}` });
};

/**
 * Send password reset link
 */
const sendPasswordReset = async (email, resetLink) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
      <h2 style="color: #1e3a8a; margin-top: 0;">Password Reset Request</h2>
      <p style="color: #334155;">We received a request to reset your password for the Lumina Portal. Click the button below to set a new password:</p>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px;">
        Or copy and paste this link in your browser:<br/>
        <code style="background-color: #f1f5f9; padding: 6px; border-radius: 4px; word-break: break-all; font-size: 12px;">${resetLink}</code>
      </p>
      <p style="color: #64748b; font-size: 13px;">
        This link will expire in 24 hours. If you did not request a password reset, you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
        Legacy Clinics & Diagnostics — Lumina Portal
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Legacy Clinics — Password Reset Request',
    html,
    text: `Password Reset Request\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link will expire in 24 hours.`
  });
};

/**
 * Batch send email to multiple recipients
 */
const sendBatch = async (recipients, subject, html, text) => {
  const results = [];
  for (const email of recipients) {
    const result = await sendEmail({ to: email, subject, html, text });
    results.push({ email, ...result });
  }
  return results;
};

module.exports = {
  transporter,
  sendEmail,
  sendUserCredentials,
  sendNotification,
  sendPasswordReset,
  sendBatch,
};
