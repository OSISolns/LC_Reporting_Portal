'use strict';
const db = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
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

  static async create({ fullName, email, password, roleId }) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const { rows } = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, role_id`,
      [fullName, email, passwordHash, roleId]
    );
    return rows[0];
  }

  static async getAll() {
    const { rows } = await db.query(
      `SELECT u.id, u.full_name, u.email, u.is_active, r.display_name as role_name, u.created_at
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at DESC`
    );
    return rows;
  }

  static async update(id, { fullName, email, roleId, isActive }) {
    const { rows } = await db.query(
      `UPDATE users 
       SET full_name = $1, email = $2, role_id = $3, is_active = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, full_name, email, role_id, is_active`,
      [fullName, email, roleId, isActive, id]
    );
    return rows[0];
  }
}

module.exports = User;
