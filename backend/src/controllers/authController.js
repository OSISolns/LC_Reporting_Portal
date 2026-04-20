'use strict';
const User = require('../models/user');
const { logAction } = require('../middleware/audit');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const Notification = require('../models/notification');

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
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      const attempts = await User.incrementFailedAttempts(user.id);
      
      let message = 'Invalid credentials.';
      
      if (attempts >= 5) {
        await User.lockout(user.id, 5);
        message = 'Account locked for 5 minutes due to 5 failed attempts.';
        
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
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};


exports.getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        fullName: req.user.full_name,
        email: req.user.email,
        role: req.user.role
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
        email: user.email,
        role: user.role,
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
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
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
