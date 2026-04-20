'use strict';
const db = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
  static async findByUsername(username) {
    const { rows } = await db.query(
      `SELECT u.*, r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE LOWER(u.username) = LOWER($1)`,
      [username]
    );
    return rows[0];
  }

  static async incrementFailedAttempts(id) {
    const { rows } = await db.query(
      'UPDATE users SET failed_attempts = failed_attempts + 1, updated_at = NOW() WHERE id = $1 RETURNING failed_attempts',
      [id]
    );
    return rows[0].failed_attempts;
  }

  static async lockout(id, minutes) {
    await db.query(
      "UPDATE users SET lockout_until = datetime('now', '?' || ' minutes'), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [minutes, id]
    );
  }

  static async resetAttempts(id) {
    await db.query(
      'UPDATE users SET failed_attempts = 0, lockout_until = NULL, updated_at = NOW() WHERE id = $1',
      [id]
    );
  }


  static async findByEmail(email) {
    const { rows } = await db.query(
      `SELECT u.*, r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.email = $1`,
      [email]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT u.*, r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async create({ fullName, username, email, password, roleId }) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const { rows } = await db.query(
      `INSERT INTO users (full_name, username, email, password_hash, role_id)
       VALUES ($1, $2, $3, $4, $5)
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
       SET full_name = $1, username = $2, email = $3, role_id = $4, is_active = $5, updated_at = NOW()
       WHERE id = $6
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
       WHERE r.name = $1 AND u.is_active = TRUE`,
      [roleName]
    );
    return rows;
  }

  static async delete(id) {
    // Nullify foreign key references in all dependent tables first
    // to avoid FOREIGN KEY constraint failures in SQLite
    const nullifyQueries = [
      'UPDATE audit_logs SET user_id = NULL WHERE user_id = $1',
      'UPDATE incident_reports SET created_by = NULL WHERE created_by = $1',
      'UPDATE incident_reports SET reviewed_by = NULL WHERE reviewed_by = $1',
      'UPDATE cancellation_requests SET created_by = NULL WHERE created_by = $1',
      'UPDATE cancellation_requests SET verified_by = NULL WHERE verified_by = $1',
      'UPDATE cancellation_requests SET approved_by = NULL WHERE approved_by = $1',
      'UPDATE cancellation_requests SET rejected_by = NULL WHERE rejected_by = $1',
      'UPDATE refund_requests SET created_by = NULL WHERE created_by = $1',
      'UPDATE refund_requests SET verified_by = NULL WHERE verified_by = $1',
      'UPDATE refund_requests SET approved_by = NULL WHERE approved_by = $1',
      'UPDATE refund_requests SET rejected_by = NULL WHERE rejected_by = $1',
      'UPDATE results_transfers SET created_by = NULL WHERE created_by = $1',
      'UPDATE results_transfers SET reviewed_by = NULL WHERE reviewed_by = $1',
      'UPDATE results_transfers SET approved_by = NULL WHERE approved_by = $1',
      'UPDATE results_transfers SET rejected_by = NULL WHERE rejected_by = $1',
      'DELETE FROM notifications WHERE user_id = $1',
    ];
    for (const sql of nullifyQueries) {
      await db.query(sql, [id]);
    }
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    return { id };
  }

  static async resetPassword(id, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await db.query(
      'UPDATE users SET password_hash = $1, failed_attempts = 0, lockout_until = NULL, updated_at = NOW() WHERE id = $2',
      [passwordHash, id]
    );
  }
}


module.exports = User;
