'use strict';
const nodemailer = require('nodemailer');

/**
 * Dynamically resolves SMTP configuration from process.env at runtime.
 * Ensures production environment variables take precedence immediately.
 */
const getSmtpConfig = () => {
  const host = (process.env.SMTP_HOST || 'mail.legacyclinics.rw').trim();
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = (process.env.SMTP_USER || 'no-reply@legacyclinics.rw').trim();
  const pass = (process.env.SMTP_PASS || 'AMAhamba@2110').trim();
  
  const fromName = (process.env.MAIL_FROM_NAME || 'Legacy Clinics').trim();
  const fromAddress = (process.env.MAIL_FROM_ADDRESS || user).trim();
  const from = `"${fromName}" <${fromAddress}>`;

  return { host, port, user, pass, from, fromName, fromAddress };
};

/**
 * Create primary nodemailer transporter for configured port/host
 */
const createPrimaryTransporter = () => {
  const config = getSmtpConfig();
  const isPort465 = config.port === 465;

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: isPort465, // true for 465, false for 587
    requireTLS: !isPort465, // Force STARTTLS upgrade on port 587
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: false, // Smooth SSL/TLS handshake with self-signed or legacy certs
      minVersion: 'TLSv1.2',
    },
    connectionTimeout: 15000,
    greetingTimeout:   10000,
    socketTimeout:     30000,
  });
};

/**
 * Create fallback transporter for port 587 (STARTTLS) if port 465 is blocked by cloud host
 */
const createFallbackTransporter587 = () => {
  const config = getSmtpConfig();

  return nodemailer.createTransport({
    host: config.host,
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
    connectionTimeout: 15000,
    greetingTimeout:   10000,
    socketTimeout:     30000,
  });
};

/**
 * Create fallback transporter for port 465 (Direct SSL) if port 587 is blocked
 */
const createFallbackTransporter465 = () => {
  const config = getSmtpConfig();

  return nodemailer.createTransport({
    host: config.host,
    port: 465,
    secure: true,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
    connectionTimeout: 15000,
    greetingTimeout:   10000,
    socketTimeout:     30000,
  });
};

// Transporter instances
let primaryTransporter = createPrimaryTransporter();
let fallback587 = createFallbackTransporter587();
let fallback465 = createFallbackTransporter465();

// Verify connection on startup gracefully
const verifyTransporter = () => {
  const config = getSmtpConfig();
  console.log(`📧 Email Service Init → host=${config.host} port=${config.port} user=${config.user} pass=${config.pass ? '***' : '(MISSING!)'}`);

  primaryTransporter.verify((error) => {
    if (error) {
      console.error(`❌ Primary SMTP Connection FAILED (host=${config.host}:${config.port} user=${config.user}):`, error.message);
    } else {
      console.log(`✅ Primary SMTP Connected Successfully: ${config.host}:${config.port} user=${config.user}`);
    }
  });
};

verifyTransporter();

/**
 * Generic email sender — always resolves, never throws.
 * Tries primary transporter first, falls back to alternative ports (587 / 465) if network/firewall error occurs.
 * Returns { success, messageId?, error? }
 */
const sendEmail = async ({ to, cc, bcc, subject, html, text, attachments }) => {
  const config = getSmtpConfig();

  if (!config.pass) {
    const msg = 'SMTP_PASS is not configured in environment — email not sent.';
    console.error(`❌ ${msg} (to=${to} subject="${subject}")`);
    return { success: false, error: msg };
  }

  const mailOptions = {
    from: config.from,
    to,
    cc,
    bcc,
    subject,
    html,
    text,
    attachments,
  };

  // 1. Try Primary Transporter
  try {
    const info = await primaryTransporter.sendMail(mailOptions);
    console.log(`📧 Email sent → to=${to}${cc ? ` cc=${cc}` : ''} subject="${subject}" id=${info.messageId} accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)}`);
    if (info.rejected && info.rejected.length > 0) {
      console.warn(`⚠️  Some recipients were rejected by SMTP server: ${info.rejected.join(', ')}`);
    }
    return { success: true, messageId: info.messageId };
  } catch (primaryError) {
    console.warn(`⚠️ Primary SMTP send failed (host=${config.host}:${config.port}): ${primaryError.message}. Trying port 587 STARTTLS fallback...`);
    
    // 2. Try Fallback 587 (STARTTLS)
    try {
      const info = await fallback587.sendMail(mailOptions);
      console.log(`📧 Email sent via Fallback (port 587 STARTTLS) → to=${to}${cc ? ` cc=${cc}` : ''} subject="${subject}" id=${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (fallback587Error) {
      console.warn(`⚠️ Fallback 587 failed: ${fallback587Error.message}. Trying port 465 Direct SSL fallback...`);

      // 3. Try Fallback 465 (Direct SSL)
      try {
        const info = await fallback465.sendMail(mailOptions);
        console.log(`📧 Email sent via Fallback (port 465 SSL) → to=${to}${cc ? ` cc=${cc}` : ''} subject="${subject}" id=${info.messageId}`);
        return { success: true, messageId: info.messageId };
      } catch (fallback465Error) {
        console.error(`❌ ALL SMTP send attempts FAILED for recipient=${to} subject="${subject}":`, {
          primaryError: primaryError.message,
          fallback587Error: fallback587Error.message,
          fallback465Error: fallback465Error.message,
        });
        return { success: false, error: primaryError.message || fallback587Error.message };
      }
    }
  }
};

/**
 * Send user credentials email (new account, password reset, etc.)
 */
const sendUserCredentials = async (email, username, password, subject = 'Your Account Credentials') => {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background-color: #1e3a8a; padding: 24px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 700;">Legacy Clinics &amp; Diagnostics</h2>
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
    info:    '#2563eb',
    success: '#16a34a',
    warning: '#d97706',
    error:   '#dc2626',
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
      <div style="border-left: 4px solid ${colorMap[type] || '#2563eb'}; padding-left: 15px;">
        <h3 style="margin-top: 0; color: ${colorMap[type] || '#2563eb'};">${subject}</h3>
        <p style="margin: 10px 0; color: #334155; line-height: 1.5;">${message}</p>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        Legacy Clinics &amp; Diagnostics — Lumina Portal Automated Notification
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
        Legacy Clinics &amp; Diagnostics — Lumina Portal
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Legacy Clinics — Password Reset Request',
    html,
    text: `Password Reset Request\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link will expire in 24 hours.`,
  });
};

/**
 * Send temporary password email
 */
const sendTemporaryPassword = async (email, username, tempPassword) => {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background-color: #003b44; padding: 24px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 700;">Legacy Clinics &amp; Diagnostics</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Lumina Portal Temporary Password</p>
      </div>
      <div style="padding: 24px; background-color: #ffffff; color: #334155;">
        <p style="margin-top: 0;">Dear User,</p>
        <p>We received a request to reset your password following multiple failed login attempts on the Lumina Portal. Below is your temporary password:</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #1c69a0; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Username:</strong> ${username}</p>
          <p style="margin: 4px 0;"><strong>Temporary Password:</strong> <code style="font-size: 16px; font-weight: bold; background: #e2e8f0; padding: 4px 8px; border-radius: 4px; color: #003b44;">${tempPassword}</code></p>
        </div>
        <p style="color: #64748b; font-size: 13px;">
          <strong>Security Note:</strong> Please log in using this temporary password. You will be prompted to set a new password upon logging in.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          This is an automated message from Legacy Clinics — Lumina Portal. Please do not reply directly to this email.
        </p>
      </div>
    </div>
  `;
  const text = `Legacy Clinics Lumina Portal\n\nTemporary Password Request:\nUsername: ${username}\nTemporary Password: ${tempPassword}\n\nPlease log in and update your password immediately.`;

  return sendEmail({
    to: email,
    subject: 'Legacy Clinics — Temporary Password Reset',
    html,
    text,
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
  transporter: primaryTransporter,
  sendEmail,
  sendUserCredentials,
  sendNotification,
  sendPasswordReset,
  sendTemporaryPassword,
  sendBatch,
};


