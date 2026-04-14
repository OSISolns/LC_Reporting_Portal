'use strict';
const User = require('../models/user');
const db = require('../config/db');
const { logAction } = require('../middleware/audit');

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.getAll();
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    await logAction(req, 'CREATE', 'user', user.id, { email: user.email });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.update(req.params.id, req.body);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await logAction(req, 'UPDATE', 'user', user.id, { email: user.email });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

exports.getRoles = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT id, name, display_name FROM roles ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
