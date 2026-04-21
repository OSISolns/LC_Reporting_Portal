'use strict';
const db = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
  static async findByUsername(username) {
    const { rows } = await db.query(
      `SELECT u.*, r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE LOWER(u.username) = LOWER(?)`,
      [username]
    );
    return rows[0];
  }

  static async incrementFailedAttempts(id) {
    // In SQLite, we can't easily do UPDATE ... RETURNING in older versions 
    // but LibSQL supports it. However, to be safe with our db.js wrapper:
    await db.query(
      'UPDATE users SET failed_attempts = failed_attempts + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    const { rows } = await db.query('SELECT failed_attempts FROM users WHERE id = ?', [id]);
    return rows[0]?.failed_attempts;
  }

  static async lockout(id, minutes) {
    await db.query(
      "UPDATE users SET lockout_until = datetime('now', '?' || ' minutes'), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [minutes, id]
    );
  }

  static async resetAttempts(id) {
    await db.query(
      'UPDATE users SET failed_attempts = 0, lockout_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  static async findByEmail(email) {
    const { rows } = await db.query(
      `SELECT u.*, r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.email = ?`,
      [email]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT u.*, r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async create({ fullName, username, email, password, roleId }) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // LibSQL supports RETURNING
    const { rows } = await db.query(
      `INSERT INTO users (full_name, username, email, password_hash, role_id)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id, full_name, username, email, role_id`,
      [fullName, username, email, passwordHash, roleId]
    );
    return rows[0];
  }

  static async getAll() {
    const { rows } = await db.query(
      `SELECT u.id, u.full_name, u.username, u.email, u.is_active, r.display_name as role_name, u.created_at
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at DESC`
    );
    return rows;
  }

  static async update(id, { fullName, username, email, roleId, isActive }) {
    const { rows } = await db.query(
      `UPDATE users 
       SET full_name = ?, username = ?, email = ?, role_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
       RETURNING id, full_name, username, email, role_id, is_active`,
      [fullName, username, email, roleId, isActive, id]
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
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await db.query(
      'UPDATE users SET password_hash = ?, failed_attempts = 0, lockout_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, id]
    );
  }
}

module.exports = User;
