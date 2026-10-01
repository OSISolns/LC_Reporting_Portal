'use strict';
const db = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
  static async findByUsername(username) {
    const { rows } = await db.query(
      `SELECT 
         u.id, u.full_name, u.username, u.password_hash, u.email, 
         u.role_id, u.is_active, u.failed_attempts, u.must_change_password,
         r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE LOWER(u.username) = LOWER(?)`,
      [username]
    );
    return rows[0];
  }

  static async incrementFailedAttempts(id) {
    await db.query(
      'UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = ?',
      [id]
    );
    const { rows } = await db.query('SELECT failed_attempts FROM users WHERE id = ?', [id]);
    return rows[0]?.failed_attempts;
  }

  static async lockout(id, minutes) {
    await db.query(
      "UPDATE users SET lockout_until = datetime('now', ? || ' minutes') WHERE id = ?",
      [minutes, id]
    );
  }

  static async resetAttempts(id) {
    await db.query(
      'UPDATE users SET failed_attempts = 0, lockout_until = NULL WHERE id = ?',
      [id]
    );
  }

  static async findByEmail(email) {
    const { rows } = await db.query(
      `SELECT 
         u.id, u.full_name, u.username, u.password_hash, u.email, 
         u.role_id, u.is_active, u.failed_attempts, u.must_change_password,
         r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.email = ?`,
      [email]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT 
         u.id, u.full_name, u.username, u.password_hash, u.email, 
         u.role_id, u.is_active, u.failed_attempts, u.must_change_password,
         r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async create({ fullName, username, email, password, roleId }) {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const { rows } = await db.query(
      `INSERT INTO users (full_name, username, email, password_hash, role_id, must_change_password)
       VALUES (?, ?, ?, ?, ?, 1)
       RETURNING id, full_name, username, email, role_id, must_change_password`,
      [fullName, username, email, passwordHash, roleId]
    );
    return rows[0];
  }

  static async getAll() {
    const { rows } = await db.query(
      `SELECT 
         u.id, u.full_name, u.username, u.email, u.is_active, u.role_id,
         r.display_name as role_name, r.name as role_key
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.id DESC`
    );
    return rows;
  }

  static async update(id, { fullName, username, email, roleId, isActive }) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const finalFullName = fullName !== undefined ? fullName : existing.full_name;
    const finalUsername = username !== undefined ? username : existing.username;
    const finalEmail = email !== undefined ? email : existing.email;
    const finalRoleId = (roleId !== undefined && roleId !== null && !isNaN(Number(roleId))) ? Number(roleId) : existing.role_id;
    const finalIsActive = isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active;

    const { rows } = await db.query(
      `UPDATE users 
       SET full_name = ?, username = ?, email = ?, role_id = ?, is_active = ?
       WHERE id = ?
       RETURNING id, full_name, username, email, role_id, is_active`,
      [finalFullName, finalUsername, finalEmail, finalRoleId, finalIsActive, id]
    );
    return rows[0];
  }

  static async findByRole(roleName) {
    const { rows } = await db.query(
      `SELECT u.id, u.full_name, u.email 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE r.name = ? AND u.is_active = 1`,
      [roleName]
    );
    return rows;
  }

  static async delete(id) {
    const nullifyQueries = [
      'UPDATE audit_logs SET user_id = NULL WHERE user_id = ?',
      'UPDATE incident_reports SET created_by = NULL WHERE created_by = ?',
      'UPDATE incident_reports SET reviewed_by = NULL WHERE reviewed_by = ?',
      'UPDATE cancellation_requests SET created_by = NULL WHERE created_by = ?',
      'UPDATE cancellation_requests SET verified_by = NULL WHERE verified_by = ?',
      'UPDATE cancellation_requests SET approved_by = NULL WHERE approved_by = ?',
      'UPDATE cancellation_requests SET rejected_by = NULL WHERE rejected_by = ?',
      'UPDATE refund_requests SET created_by = NULL WHERE created_by = ?',
      'UPDATE refund_requests SET verified_by = NULL WHERE verified_by = ?',
      'UPDATE refund_requests SET approved_by = NULL WHERE approved_by = ?',
      'UPDATE refund_requests SET rejected_by = NULL WHERE rejected_by = ?',
      'UPDATE results_transfers SET created_by = NULL WHERE created_by = ?',
      'UPDATE results_transfers SET reviewed_by = NULL WHERE reviewed_by = ?',
      'UPDATE results_transfers SET approved_by = NULL WHERE approved_by = ?',
      'UPDATE results_transfers SET rejected_by = NULL WHERE rejected_by = ?',
      'DELETE FROM notifications WHERE user_id = ?',
    ];
    for (const sql of nullifyQueries) {
      await db.query(sql, [id]);
    }
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    return { id };
  }

  static async resetPassword(id, newPassword) {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await db.query(
      'UPDATE users SET password_hash = ?, must_change_password = 1, failed_attempts = 0, lockout_until = NULL WHERE id = ?',
      [passwordHash, id]
    );
  }

  static async verifyAdminPassword(password, currentUserId) {
    if (!password) {
      return { isValid: false, status: 400, message: 'Administrative password required to confirm authorization.' };
    }

    const currentUser = await this.findById(currentUserId);
    if (!currentUser) {
      return { isValid: false, status: 401, message: 'Unauthorized request.' };
    }

    // 1. If currentUser is admin, check if password matches currentUser
    if (currentUser.role === 'admin') {
      const isMatch = await bcrypt.compare(password, currentUser.password_hash);
      if (isMatch) {
        return { isValid: true };
      }
    }

    // 2. Query all active users with role to check if password belongs to non-admin vs admin
    const { rows: users } = await db.query(
      `SELECT u.id, u.password_hash, r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.is_active = 1`
    );

    let matchesNonAdmin = false;
    let matchesAdmin = false;

    for (const u of users) {
      if (!u.password_hash) continue;
      const isMatch = await bcrypt.compare(password, u.password_hash);
      if (isMatch) {
        if (u.role === 'admin') {
          matchesAdmin = true;
          break;
        } else {
          matchesNonAdmin = true;
        }
      }
    }

    if (matchesAdmin) {
      return { isValid: true };
    }

    if (matchesNonAdmin) {
      return {
        isValid: false,
        status: 403,
        message: 'The password entered belongs to a non-admin account. An administrator password is required.'
      };
    }

    return { isValid: false, status: 401, message: 'Invalid administrative password. Action aborted.' };
  }
}

module.exports = User;
