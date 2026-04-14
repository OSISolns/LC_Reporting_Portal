'use strict';
const User = require('../models/user');
const { logAction } = require('../middleware/audit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const user = await User.findByEmail(email);
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
      await logAction(req, 'LOGIN', 'user', user.id, { email });
    } catch (e) {
      console.warn('⚠️ Could not log login action: DB down.');
    }

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
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

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide email.' });
    }

    const user = await User.findByEmail(email);
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
      await logAction(req, 'DEV_LOGIN_BYPASS', 'user', user.id, { email });
    } catch (e) {
      console.warn('⚠️ Could not log devLogin action: DB down.');
    }

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};
