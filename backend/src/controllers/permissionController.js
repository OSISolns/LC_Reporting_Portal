'use strict';
const Permission = require('../models/permission');
const { logAction } = require('../middleware/audit');
const User = require('../models/user');
const bcrypt = require('bcryptjs');

/**
 * Get all available modules and their supported actions.
 */
exports.getModules = async (req, res, next) => {
  try {
    const modules = await Permission.getModules();
    res.json({ success: true, data: modules });
  } catch (err) {
    next(err);
  }
};

/**
 * Get the full role-based permissions matrix.
 */
exports.getRoleMatrix = async (req, res, next) => {
  try {
    const matrix = await Permission.getRolePermissions();
    res.json({ success: true, data: matrix });
  } catch (err) {
    next(err);
  }
};

/**
 * Update permissions for a specific role.
 */
exports.updateRolePermissions = async (req, res, next) => {
  try {
    const { roleName } = req.params;
    const { permissions } = req.body; // { module: { action: granted } }

    if (!permissions) {
      return res.status(400).json({ success: false, message: 'Permissions data required' });
    }

    await Permission.updateRolePermissions(roleName, permissions, req.user.id);
    
    await logAction(req, 'UPDATE', 'role_permissions', roleName, { permissions });

    res.json({ success: true, message: `Permissions for role '${roleName}' updated successfully` });
  } catch (err) {
    next(err);
  }
};

/**
 * Get effective permissions for a specific user (including overrides).
 */
exports.getUserEffectivePermissions = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const permissions = await Permission.getEffectivePermissions(user.id, user.role);
    res.json({ success: true, data: permissions, user: { id: user.id, fullName: user.full_name, role: user.role } });
  } catch (err) {
    next(err);
  }
};

/**
 * Set or remove a permission override for a specific user.
 */
exports.setUserOverride = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { module, action, granted, reason } = req.body;

    if (!module || !action || granted === undefined) {
      return res.status(400).json({ success: false, message: 'Module, action, and granted status are required' });
    }

    await Permission.setUserOverride(userId, module, action, granted, reason, req.user.id);
    
    await logAction(req, 'SET_OVERRIDE', 'user_permission', userId, { module, action, granted, reason });

    res.json({ success: true, message: 'User permission override updated successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * Reset permissions for a role to defaults.
 * Requires admin password verification.
 */
exports.resetRolePermissions = async (req, res, next) => {
  try {
    const { roleName } = req.params;
    const { adminPassword } = req.body;

    if (!adminPassword) {
      return res.status(400).json({ success: false, message: 'Administrative password required for protocol reset.' });
    }

    // Verify current user's password (must be the one performing the reset)
    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(adminPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid administrative password. Reset aborted.' });
    }

    await Permission.resetRolePermissions(roleName, req.user.id);
    
    await logAction(req, 'RESET', 'role_permissions', roleName, { reason: 'Reset to system defaults' });

    res.json({ success: true, message: `Access protocols for '${roleName}' have been reset to system defaults.` });
  } catch (err) {
    next(err);
  }
};
