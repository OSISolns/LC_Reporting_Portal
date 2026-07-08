'use strict';
const User = require('../models/user');
const { logAction } = require('../middleware/audit');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');
const { decryptField } = require('../utils/crypto');

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const Notification = require('../models/notification');
    const Permission = require('../models/permission');

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password.' });
    }

    const user = await User.findByUsername(username);
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account.' });
    }

    // Check if locked out
    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
      const waitTime = Math.ceil((new Date(user.lockout_until) - new Date()) / 60000);
      return res.status(403).json({
        success: false,
        message: `Account is temporarily locked due to multiple failed attempts. Please try again in ${waitTime} minutes.`
      });
    } else if (user.lockout_until || (user.failed_attempts || 0) >= 5) {
      // A previous lockout has expired (or a stale count of >=5 lingered).
      // Clear the counter so the user gets a FRESH set of attempts — otherwise
      // a single mistype after the lock expires would instantly re-lock them
      // (5 + 1 >= 5). Only reset on expiry, never while still locked above.
      await User.resetAttempts(user.id);
      user.failed_attempts = 0;
      user.lockout_until = null;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      const attempts = await User.incrementFailedAttempts(user.id);
      
      // Log Security Violation
      try {
        await logAction(req, 'LOGIN_FAILED', 'user', user.id, { username, attempt_count: attempts });
      } catch (e) {}

      let message = 'Invalid credentials.';
      
      if (attempts >= 5) {
        await User.lockout(user.id, 5);
        message = 'Account locked for 5 minutes due to 5 failed attempts.';
        
        try {
          await logAction(req, 'ACCOUNT_LOCKOUT', 'user', user.id, { username, lockout_duration: '5m' });
        } catch (e) {}

        // Report to Admin
        try {
          const admins = await User.findByRole('admin');
          for (const admin of admins) {
            await Notification.create({
              userId: admin.id,
              title: 'Security Alert: Account Lockout',
              message: `User ${user.full_name} (${user.username}) has been locked out after 5 failed login attempts.`,
              type: 'error',
              link: '/audit-logs'
            });
          }
        } catch (e) {}

      } else if (attempts >= 3) {
        const remaining = 5 - attempts;
        message = `Invalid credentials. Warning: ${remaining} attempts remaining before account lockout.`;
        
        // Report to Admin at 3rd attempt
        if (attempts === 3) {
          try {
            const admins = await User.findByRole('admin');
            for (const admin of admins) {
              await Notification.create({
                userId: admin.id,
                title: 'Security Warning: Multiple Failed Group Logins',
                message: `User ${user.full_name} (${user.username}) has failed 3 login attempts. Potential brute-force detected.`,
                type: 'info',
                link: '/audit-logs'
              });
            }
          } catch (e) {}
        }
      }
      
      return res.status(401).json({ success: false, message });
    }

    // Success - reset attempts
    await User.resetAttempts(user.id);

    const token = generateToken(user);

    req.user = user;
    try {
      await logAction(req, 'LOGIN', 'user', user.id, { username });
    } catch (e) {
      console.warn('⚠️ Could not log login action: DB down.');
    }

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: decryptField(user.email),
        role: user.role,
        mustChangePassword: user.must_change_password === 1,
        permissions: await Permission.getEffectivePermissions(user.id, user.role)
      }
    });
  } catch (err) {
    next(err);
  }
};


exports.getMe = async (req, res, next) => {
  try {
    const Permission = require('../models/permission');
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: decryptField(user.email),
        role: user.role,
        mustChangePassword: user.must_change_password === 1,
        permissions: await Permission.getEffectivePermissions(user.id, user.role)
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.devLogin = async (req, res, next) => {
  try {
    const allowDevLogin = process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_LOGIN !== 'false';
    if (!allowDevLogin) {
      return res.status(403).json({ success: false, message: 'Dev login is disabled in this environment.' });
    }

    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, message: 'Please provide username.' });
    }

    const user = await User.findByUsername(username);
    if (!user || !user.is_active) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const token = generateToken(user);

    req.user = user;
    try {
      await logAction(req, 'DEV_LOGIN_BYPASS', 'user', user.id, { username });
    } catch (e) {
      console.warn('⚠️ Could not log devLogin action: DB down.');
    }

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: decryptField(user.email),
        role: user.role,
        mustChangePassword: user.must_change_password === 1,
        permissions: await require('../models/permission').getEffectivePermissions(user.id, user.role)
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Fetch user with password hash
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update DB directly
    const db = require('../config/db');
    await db.query(
      'UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, userId]
    );

    // Log action
    try {
      await logAction(req, 'PASSWORD_CHANGE', 'user', userId, { username: user.username });
    } catch (e) {
      console.warn('⚠️ Could not log password change: DB down.');
    }

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    next(err);
  }
};
