'use strict';
const db = require('../config/db');
const { ROLE_DEFAULTS, MODULES } = require('../config/permissions');

// Simple in-memory cache for effective permissions
let permissionsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class Permission {
  /**
   * Internal helper to clear cache when permissions change.
   */
  static clearCache(userId = null) {
    if (userId) {
      permissionsCache.delete(userId);
    } else {
      permissionsCache.clear();
    }
  }

  /**
   * Internal helper to validate module and action.
   */
  static validate(moduleName, action = null) {
    const mod = MODULES.find(m => m.name === moduleName);
    if (!mod) throw new Error(`Invalid permission module: ${moduleName}`);
    if (action && !mod.actions.includes(action)) {
      throw new Error(`Invalid action '${action}' for module '${moduleName}'`);
    }
    return true;
  }
  /**
   * Get all modules with their available actions.
   */
  static async getModules() {
    const { rows } = await db.query('SELECT * FROM permission_modules ORDER BY id');
    return rows.map(r => ({ ...r, actions: JSON.parse(r.actions) }));
  }

  /**
   * Get full role permissions matrix.
   * Returns: { roleName: { module: { action: granted } } }
   */
  static async getRolePermissions() {
    const { rows } = await db.query(
      'SELECT role_name, module, action, granted FROM role_permissions ORDER BY role_name, module'
    );
    const matrix = {};
    for (const row of rows) {
      if (!matrix[row.role_name]) matrix[row.role_name] = {};
      if (!matrix[row.role_name][row.module]) matrix[row.role_name][row.module] = {};
      matrix[row.role_name][row.module][row.action] = !!row.granted;
    }
    return matrix;
  }

  /**
   * Get permissions for a single role.
   */
  static async getRolePermission(roleName) {
    const { rows } = await db.query(
      'SELECT module, action, granted FROM role_permissions WHERE role_name = ?',
      [roleName]
    );
    const result = {};
    for (const row of rows) {
      if (!result[row.module]) result[row.module] = {};
      result[row.module][row.action] = !!row.granted;
    }
    return result;
  }

  /**
   * Set a single role permission.
   */
  static async setRolePermission(roleName, module, action, granted, updatedBy) {
    this.validate(module, action);
    await db.query(
      `INSERT INTO role_permissions (role_name, module, action, granted, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(role_name, module, action) DO UPDATE 
       SET granted = EXCLUDED.granted, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP`,
      [roleName, module, action, granted ? 1 : 0, updatedBy]
    );
    this.clearCache(); // Global clear for role changes
  }

  /**
   * Bulk update role permissions (whole role matrix).
   */
  static async updateRolePermissions(roleName, permissions, updatedBy) {
    const batch = [];
    for (const [module, actions] of Object.entries(permissions)) {
      for (const [action, granted] of Object.entries(actions)) {
        this.validate(module, action);
        batch.push({
          sql: `INSERT INTO role_permissions (role_name, module, action, granted, updated_by, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(role_name, module, action) DO UPDATE 
                SET granted = EXCLUDED.granted, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP`,
          args: [roleName, module, action, granted ? 1 : 0, updatedBy]
        });
      }
    }
    await db.batch(batch);
    this.clearCache(); // Global clear
  }

  /**
   * Get user-specific permission overrides.
   */
  static async getUserOverrides(userId) {
    const { rows } = await db.query(
      'SELECT module, action, granted, reason FROM user_permission_overrides WHERE user_id = ?',
      [userId]
    );
    const result = {};
    for (const row of rows) {
      if (!result[row.module]) result[row.module] = {};
      result[row.module][row.action] = { granted: !!row.granted, reason: row.reason };
    }
    return result;
  }

  /**
   * Set or remove a user permission override.
   */
  static async setUserOverride(userId, module, action, granted, reason, updatedBy) {
    this.validate(module, action);
    if (granted === null) {
      // Remove override — revert to role default
      await db.query(
        'DELETE FROM user_permission_overrides WHERE user_id = ? AND module = ? AND action = ?',
        [userId, module, action]
      );
    } else {
      await db.query(
        `INSERT INTO user_permission_overrides (user_id, module, action, granted, reason, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, module, action) DO UPDATE
         SET granted = EXCLUDED.granted, reason = EXCLUDED.reason, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP`,
        [userId, module, action, granted ? 1 : 0, reason || null, updatedBy]
      );
    }
    this.clearCache(userId); // Target clear for specific user
  }

  /**
   * Get effective permissions for a user (role defaults + overrides).
   * Returns: { module: { action: { granted, source: 'role'|'override' } } }
   */
  static async getEffectivePermissions(userId, roleName) {
    // Check Cache
    const cached = permissionsCache.get(userId);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.data;
    }

    const rolePerms = await Permission.getRolePermission(roleName);
    const overrides = await Permission.getUserOverrides(userId);
    const modules = await Permission.getModules();

    const effective = {};
    for (const mod of modules) {
      effective[mod.name] = {};
      for (const action of mod.actions) {
        const roleGranted = rolePerms[mod.name]?.[action] ?? false;
        if (overrides[mod.name]?.[action] !== undefined) {
          effective[mod.name][action] = {
            granted: overrides[mod.name][action].granted,
            source: 'override',
            reason: overrides[mod.name][action].reason,
          };
        } else {
          effective[mod.name][action] = { granted: roleGranted, source: 'role' };
        }
      }
    }

    // Update Cache
    permissionsCache.set(userId, { data: effective, timestamp: Date.now() });

    return effective;
  }

  /**
   * Check if a user has a specific permission (used by middleware).
   */
  static async check(userId, roleName, module, action) {
    const effective = await this.getEffectivePermissions(userId, roleName);
    return effective[module]?.[action]?.granted ?? false;
  }

  /**
   * Reset a role's permissions to the system default defined in config.
   */
  static async resetRolePermissions(roleName, updatedBy) {
    const defaults = ROLE_DEFAULTS[roleName];
    if (!defaults) {
      throw new Error(`No system defaults defined for role: ${roleName}`);
    }

    // Clear existing permissions for this role
    await db.query('DELETE FROM role_permissions WHERE role_name = ?', [roleName]);

    // Re-insert defaults
    await this.updateRolePermissions(roleName, defaults, updatedBy);
  }
}

module.exports = Permission;

