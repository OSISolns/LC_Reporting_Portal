'use strict';
const User = require('../models/user');
const { logAction } = require('../middleware/audit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password.' });
    }

    const user = await User.findByUsername(username);
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

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

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

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
