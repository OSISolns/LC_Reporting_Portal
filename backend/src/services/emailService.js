const nodemailer = require('nodemailer');

// Build from address with name
const mailFromAddress = process.env.MAIL_FROM_ADDRESS || 'noreply@ops-legacyclinics.rw';
const mailFromName = process.env.MAIL_FROM_NAME || 'Lumina Portal';
const mailFrom = `"${mailFromName}" <${mailFromAddress}>`;

// Mailtrap configuration from environment variables
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST || 'live.smtp.mailtrap.io',
  port: parseInt(process.env.MAILTRAP_PORT || '587'),
  auth: {
    user: process.env.MAILTRAP_USER || 'api',
    pass: process.env.MAILTRAP_PASS,
  },
});

// Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('Mailtrap connection error:', error);
  } else {
    console.log('Mailtrap SMTP connected successfully');
  }
});

/**
 * Send user credentials email (new account, password reset, etc.)
 */
const sendUserCredentials = async (email, username, password, subject = 'Your Account Credentials') => {
  const mailOptions = {
    from: mailFrom,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Legacy Clinics — Lumina Portal</h2>
        <p>Your account has been created. Here are your login credentials:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        <p style="color: #666; font-size: 14px;">
          <strong>Security Note:</strong> Please change your password on your first login.
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">
          This is an automated message from Legacy Clinics Lumina Portal, please do not reply to this email.
        </p>
      </div>
    `,
    text: `Your account credentials:\n\nUsername: ${username}\nPassword: ${password}\n\nPlease change your password on your first login.`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Credentials email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send credentials email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification email
 */
const sendNotification = async (email, subject, message, type = 'info') => {
  const colorMap = {
    info: '#0066cc',
    success: '#00cc00',
    warning: '#ff9900',
    error: '#cc0000',
  };

  const mailOptions = {
    from: mailFrom,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="border-left: 4px solid ${colorMap[type]}; padding: 15px; background-color: #f9f9f9;">
          <h3 style="margin-top: 0; color: ${colorMap[type]};">${subject}</h3>
          <p style="margin: 10px 0; color: #333;">${message}</p>
        </div>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">
          This is an automated notification from Legacy Clinics Lumina Portal.
        </p>
      </div>
    `,
    text: `${subject}\n\n${message}`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send notification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset link
 */
const sendPasswordReset = async (email, resetLink) => {
  const mailOptions = {
    from: mailFrom,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password. Click the link below to proceed:</p>
        <div style="margin: 20px 0;">
          <a href="${resetLink}" style="display: inline-block; background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link in your browser:<br/>
          <code style="background-color: #f5f5f5; padding: 5px; word-break: break-all;">${resetLink}</code>
        </p>
        <p style="color: #666; font-size: 14px;">
          <strong>Note:</strong> This link will expire in 24 hours. If you didn't request this, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">
          This is an automated message, please do not reply to this email.
        </p>
      </div>
    `,
    text: `Password Reset Request\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link will expire in 24 hours.`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Batch send email to multiple recipients
 */
const sendBatch = async (recipients, subject, html, text) => {
  const results = [];

  for (const email of recipients) {
    try {
      const info = await transporter.sendMail({
        from: mailFrom,
        to: email,
        subject,
        html,
        text,
      });
      results.push({ email, success: true, messageId: info.messageId });
    } catch (error) {
      results.push({ email, success: false, error: error.message });
    }
  }

  return results;
};

module.exports = {
  transporter,
  sendUserCredentials,
  sendNotification,
  sendPasswordReset,
  sendBatch,
};
