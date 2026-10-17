'use strict';
const User = require('../models/user');
const db = require('../config/db');
const { logAction } = require('../middleware/audit');
const emailService = require('../services/emailService');
const { decryptField } = require('../utils/crypto');
const bcrypt = require('bcryptjs');

// Permitted staff roles for IT Officer management (Operations, Customer Care, Laboratory, Dental staff - managers & above excluded)
const IT_PERMITTED_ROLES = [
  'operations_staff',
  'operations',
  'cashier',
  'principal_cashier',
  'customer_care',
  'lab_tech',
  'lab_scientist',
  'lab',
  'lab_safety_officer',
  'lab_stock_officer',
  'dental_tech',
  'dental'
];

const IT_UNAUTHORIZED_MESSAGE = 'IT Officer is only permitted to manage Operations, Customer Care, Laboratory, and Dental staff users (managers and above excluded).';

exports.getAllUsers = async (req, res, next) => {
  try {
    let users = await User.getAll();
    if (req.user && req.user.role === 'it_officer') {
      users = users.filter(u => IT_PERMITTED_ROLES.includes(u.role_key || u.role));
    }
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    if (req.user.role === 'it_officer') {
      const { rows: targetRoleRows } = await db.query('SELECT name FROM roles WHERE id = $1', [req.body.roleId]);
      if (targetRoleRows.length === 0 || !IT_PERMITTED_ROLES.includes(targetRoleRows[0].name)) {
        return res.status(403).json({ success: false, message: IT_UNAUTHORIZED_MESSAGE });
      }
    }

    const user = await User.create(req.body);
    await logAction(req, 'CREATE', 'user', user.id, { email: user.email });

    // Decrypt email before sending
    const decryptedEmail = decryptField(user.email);

    // Send welcome email with credentials
    const emailResult = await emailService.sendUserCredentials(
      decryptedEmail,
      user.username,
      req.body.password,
      'Welcome to Local Clinic - Your Account Credentials'
    );

    res.status(201).json({
      success: true,
      data: user,
      emailSent: emailResult.success,
      emailError: emailResult.error || null
    });
  } catch (err) {
    if (err.message && (err.message.includes('UNIQUE constraint failed: users.username') || err.message.includes('users_username_key'))) {
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }
    if (err.message && (err.message.includes('UNIQUE constraint failed: users.email') || err.message.includes('users_email_key'))) {
      return res.status(400).json({ success: false, message: 'Email address is already registered.' });
    }
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    if (req.user.role === 'it_officer') {
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });
      if (!IT_PERMITTED_ROLES.includes(targetUser.role)) {
        return res.status(403).json({ success: false, message: IT_UNAUTHORIZED_MESSAGE });
      }
      if (req.body.roleId) {
        const { rows: targetRoleRows } = await db.query('SELECT name FROM roles WHERE id = $1', [req.body.roleId]);
        if (targetRoleRows.length === 0 || !IT_PERMITTED_ROLES.includes(targetRoleRows[0].name)) {
          return res.status(403).json({ success: false, message: IT_UNAUTHORIZED_MESSAGE });
        }
      }
    }
    if (req.body.email === '') req.body.email = null;
    if (req.body.username === '') req.body.username = null;

    const user = await User.update(req.params.id, req.body);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await logAction(req, 'UPDATE', 'user', user.id, { email: user.email });
    res.json({ success: true, data: user });
  } catch (err) {
    if (err.message && (err.message.includes('UNIQUE constraint failed: users.username') || err.message.includes('users_username_key'))) {
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }
    if (err.message && (err.message.includes('UNIQUE constraint failed: users.email') || err.message.includes('users_email_key'))) {
      return res.status(400).json({ success: false, message: 'Email address is already registered.' });
    }
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    if (req.user.role === 'it_officer') {
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });
      if (!IT_PERMITTED_ROLES.includes(targetUser.role)) {
        return res.status(403).json({ success: false, message: IT_UNAUTHORIZED_MESSAGE });
      }
    }

    const { adminPassword } = req.body;
    const authCheck = await User.verifyAdminPassword(adminPassword, req.user.id);
    if (!authCheck.isValid) {
      return res.status(authCheck.status || 401).json({ success: false, message: authCheck.message });
    }

    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) return res.status(404).json({ success: false, message: 'User not found' });

    if (userToDelete.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    await User.delete(req.params.id);
    await logAction(req, 'DELETE', 'user', req.params.id, { email: userToDelete.email, fullName: userToDelete.full_name });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete User Failed:', err);
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    if (req.user.role === 'it_officer') {
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });
      if (!IT_PERMITTED_ROLES.includes(targetUser.role)) {
        return res.status(403).json({ success: false, message: IT_UNAUTHORIZED_MESSAGE });
      }
    }

    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'New password is required' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await User.resetPassword(req.params.id, password);
    await logAction(req, 'RESET_PASSWORD', 'user', user.id, { email: user.email, action: 'Admin initiated reset' });

    // Decrypt email before sending
    const decryptedEmail = decryptField(user.email);

    // Send email with new password
    const emailResult = await emailService.sendUserCredentials(
      decryptedEmail,
      user.username,
      password,
      'Password Reset - Your New Login Credentials'
    );

    res.json({
      success: true,
      message: 'Password reset successfully',
      emailSent: emailResult.success,
      emailError: emailResult.error || null
    });
  } catch (err) {
    next(err);
  }
};

exports.getRoles = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT id, name, display_name FROM roles ORDER BY id');
    const filteredRows = req.user && req.user.role === 'it_officer'
      ? rows.filter(r => IT_PERMITTED_ROLES.includes(r.name))
      : rows;
    res.json({ success: true, data: filteredRows });
  } catch (err) {
    next(err);
  }
};

exports.getStaffList = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.full_name, r.display_name as role, r.name as role_key
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.is_active = 1 
        AND (r.name IN ('cashier', 'principal_cashier', 'customer_care') OR u.id = $1)
      ORDER BY u.full_name ASC
    `, [req.user.id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.bulkSendCredentials = async (req, res, next) => {
  try {
    const { userIds, password, passwordMode = 'fixed', mustChangePassword = true, emailSubject } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one user.' });
    }

    const defaultInitialPass = password && password.trim().length >= 6 ? password.trim() : 'Legacy@2026';
    const isItOfficer = req.user.role === 'it_officer';

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const rawId of userIds) {
      const id = parseInt(rawId, 10);
      if (isNaN(id)) continue;

      try {
        const user = await User.findById(id);
        if (!user) {
          results.push({ id, success: false, message: 'User not found' });
          failedCount++;
          continue;
        }

        if (isItOfficer && !IT_PERMITTED_ROLES.includes(user.role)) {
          results.push({ id, username: user.username, success: false, message: 'Unauthorized role for IT Officer' });
          failedCount++;
          continue;
        }

        const decryptedEmail = decryptField(user.email);
        if (!decryptedEmail || !decryptedEmail.includes('@')) {
          results.push({ id, username: user.username, fullName: user.full_name, success: false, message: 'No valid email configured' });
          failedCount++;
          continue;
        }

        // Generate or assign password
        let assignedPassword = defaultInitialPass;
        if (passwordMode === 'random') {
          const rand = Math.random().toString(36).substring(2, 6).toUpperCase() + Math.random().toString(36).substring(2, 5);
          assignedPassword = `LC@${rand}`;
        }

        // Hash and update database
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(assignedPassword, salt);
        await db.query(
          `UPDATE users 
           SET password_hash = ?, must_change_password = ?, failed_attempts = 0, lockout_until = NULL, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [passwordHash, mustChangePassword ? 1 : 0, user.id]
        );

        // Send email with credentials
        const subject = emailSubject || 'Your Legacy Clinics Lumina Portal Credentials';
        const emailResult = await emailService.sendUserCredentials(
          decryptedEmail,
          user.username,
          assignedPassword,
          subject,
          user.full_name
        );

        if (emailResult.success) {
          successCount++;
          results.push({
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            email: decryptedEmail,
            success: true
          });
        } else {
          failedCount++;
          results.push({
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            email: decryptedEmail,
            success: false,
            message: emailResult.error || 'SMTP delivery failed'
          });
        }
      } catch (userErr) {
        failedCount++;
        results.push({ id, success: false, message: userErr.message });
      }
    }

    await logAction(req, 'BULK_SEND_CREDENTIALS', 'user', null, {
      totalRequested: userIds.length,
      successCount,
      failedCount,
      passwordMode
    });

    res.json({
      success: true,
      message: `Dispatched credentials to ${successCount} user${successCount === 1 ? '' : 's'}${failedCount > 0 ? ` (${failedCount} failed)` : ''}.`,
      total: userIds.length,
      sent: successCount,
      failed: failedCount,
      results
    });
  } catch (err) {
    next(err);
  }
};

exports.sendSingleCredentials = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password, mustChangePassword = true, emailSubject } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (req.user.role === 'it_officer') {
      if (!IT_PERMITTED_ROLES.includes(user.role)) {
        return res.status(403).json({ success: false, message: IT_UNAUTHORIZED_MESSAGE });
      }
    }

    const decryptedEmail = decryptField(user.email);
    if (!decryptedEmail || !decryptedEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'User does not have a registered email address.' });
    }

    const assignedPassword = password && password.trim().length >= 6 ? password.trim() : 'Legacy@2026';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(assignedPassword, salt);

    await db.query(
      `UPDATE users 
       SET password_hash = ?, must_change_password = ?, failed_attempts = 0, lockout_until = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [passwordHash, mustChangePassword ? 1 : 0, user.id]
    );

    const subject = emailSubject || 'Your Legacy Clinics Lumina Portal Credentials';
    const emailResult = await emailService.sendUserCredentials(
      decryptedEmail,
      user.username,
      assignedPassword,
      subject,
      user.full_name
    );

    await logAction(req, 'SEND_CREDENTIALS', 'user', user.id, {
      username: user.username,
      email: decryptedEmail,
      emailSent: emailResult.success
    });

    res.json({
      success: true,
      message: emailResult.success
        ? `Credentials sent successfully to ${decryptedEmail}.`
        : `Password updated, but email sending failed: ${emailResult.error}`,
      emailSent: emailResult.success,
      emailError: emailResult.error || null
    });
  } catch (err) {
    next(err);
  }
};
