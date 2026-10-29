'use strict';
const db = require('../config/db');

class Provider {
  /**
   * Fetch all providers with joined specialization name and linked system user
   */
  static async getAll({ search = '', specializationId = null, activeOnly = false } = {}) {
    let sql = `
      SELECT p.id, p.name, p.title, p.specialization_id, p.specialization, p.is_active, p.user_id,
             s.name as specialization_name,
             coalesce(s.name, p.specialization, 'General') as department_name,
             u.username as user_username,
             u.full_name as user_full_name,
             u.email as user_email,
             r.display_name as user_role_name,
             r.name as user_role_key
      FROM providers p
      LEFT JOIN specializations s ON p.specialization_id = s.id
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (activeOnly) {
      sql += ` AND p.is_active = 1`;
    }

    if (specializationId) {
      sql += ` AND (p.specialization_id = ? OR p.specialization = (SELECT name FROM specializations WHERE id = ?))`;
      params.push(specializationId, specializationId);
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      sql += ` AND (
        LOWER(p.name) LIKE ? OR 
        LOWER(coalesce(p.title, '')) LIKE ? OR 
        LOWER(coalesce(s.name, p.specialization, '')) LIKE ? OR
        LOWER(coalesce(u.username, '')) LIKE ? OR
        LOWER(coalesce(u.full_name, '')) LIKE ?
      )`;
      params.push(term, term, term, term, term);
    }

    sql += ` ORDER BY p.is_active DESC, p.name ASC`;

    const { rows } = await db.query(sql, params);
    return rows;
  }

  /**
   * Fetch provider by ID with joined system user
   */
  static async findById(id) {
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.title, p.specialization_id, p.specialization, p.is_active, p.user_id,
              s.name as specialization_name,
              coalesce(s.name, p.specialization, 'General') as department_name,
              u.username as user_username,
              u.full_name as user_full_name,
              u.email as user_email,
              r.display_name as user_role_name,
              r.name as user_role_key
       FROM providers p
       LEFT JOIN specializations s ON p.specialization_id = s.id
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Fetch provider linked to a system user ID
   */
  static async findByUserId(userId) {
    if (!userId) return null;
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.title, p.specialization_id, p.specialization, p.is_active, p.user_id,
              s.name as specialization_name
       FROM providers p
       LEFT JOIN specializations s ON p.specialization_id = s.id
       WHERE p.user_id = ? AND p.is_active = 1`,
      [userId]
    );
    return rows[0] || null;
  }

  /**
   * Fetch all system users available to link to providers
   */
  static async getLinkableUsers() {
    const { rows } = await db.query(`
      SELECT u.id, u.username, u.full_name, u.email, u.is_active,
             r.display_name as role_name, r.name as role_key,
             p.id as linked_provider_id, p.name as linked_provider_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN providers p ON p.user_id = u.id
      WHERE u.is_active = 1
      ORDER BY u.full_name ASC, u.username ASC
    `);
    return rows;
  }

  /**
   * Fetch all active physiotherapists from providers table
   */
  static async getPhysiotherapists() {
    const { rows } = await db.query(`
      SELECT p.id, p.name, p.title, p.specialization, p.is_active, p.user_id,
             u.username as user_username, u.full_name as user_full_name
      FROM providers p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.is_active = 1
        AND (p.specialization = 'PHYSIO' OR LOWER(p.specialization) LIKE '%physio%' OR LOWER(p.title) LIKE '%physio%')
      ORDER BY p.name ASC
    `);
    return rows;
  }

  /**
   * Fetch all specializations for selection dropdowns
   */
  static async getSpecializations() {
    const { rows } = await db.query(
      `SELECT id, name FROM specializations ORDER BY name ASC`
    );
    return rows;
  }

  /**
   * Create a new provider
   */
  static async create({ name, title = null, specializationId = null, specialization = null, isActive = 1, userId = null, user_id = null }) {
    let specId = specializationId ? parseInt(specializationId, 10) : null;
    let specText = specialization ? specialization.trim() : null;
    const finalUserId = (userId !== undefined && userId !== null && userId !== '') 
      ? parseInt(userId, 10) 
      : ((user_id !== undefined && user_id !== null && user_id !== '') ? parseInt(user_id, 10) : null);

    // If specialization text is provided but no ID, look up or insert into specializations table
    if (specText && !specId) {
      const { rows: existingSpec } = await db.query(
        `SELECT id FROM specializations WHERE LOWER(name) = LOWER(?)`,
        [specText]
      );
      if (existingSpec.length > 0) {
        specId = existingSpec[0].id;
        specText = existingSpec[0].name;
      } else {
        const { rows: newSpec } = await db.query(
          `INSERT INTO specializations (name) VALUES (?) RETURNING id, name`,
          [specText]
        );
        if (newSpec.length > 0) {
          specId = newSpec[0].id;
          specText = newSpec[0].name;
        }
      }
    } else if (specId && !specText) {
      const { rows: specRow } = await db.query(
        `SELECT name FROM specializations WHERE id = ?`,
        [specId]
      );
      if (specRow.length > 0) {
        specText = specRow[0].name;
      }
    }

    const { rows } = await db.query(
      `INSERT INTO providers (name, title, specialization_id, specialization, is_active, user_id)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING id, name, title, specialization_id, specialization, is_active, user_id`,
      [name.trim(), title ? title.trim() : null, specId, specText, isActive ? 1 : 0, finalUserId]
    );

    return this.findById(rows[0].id);
  }

  /**
   * Update an existing provider
   */
  static async update(id, { name, title, specializationId, specialization, isActive, userId, user_id }) {
    const current = await this.findById(id);
    if (!current) return null;

    const newName = name !== undefined ? name.trim() : current.name;
    const newTitle = title !== undefined ? (title ? title.trim() : null) : current.title;
    const newActive = isActive !== undefined ? (isActive ? 1 : 0) : current.is_active;

    let specId = specializationId !== undefined ? (specializationId ? parseInt(specializationId, 10) : null) : current.specialization_id;
    let specText = specialization !== undefined ? (specialization ? specialization.trim() : null) : current.specialization;

    const rawUserId = userId !== undefined ? userId : user_id;
    const newUserId = rawUserId !== undefined 
      ? (rawUserId && rawUserId !== '' ? parseInt(rawUserId, 10) : null) 
      : current.user_id;

    if (specText && !specId) {
      const { rows: existingSpec } = await db.query(
        `SELECT id FROM specializations WHERE LOWER(name) = LOWER(?)`,
        [specText]
      );
      if (existingSpec.length > 0) {
        specId = existingSpec[0].id;
        specText = existingSpec[0].name;
      } else {
        const { rows: newSpec } = await db.query(
          `INSERT INTO specializations (name) VALUES (?) RETURNING id, name`,
          [specText]
        );
        if (newSpec.length > 0) {
          specId = newSpec[0].id;
          specText = newSpec[0].name;
        }
      }
    } else if (specId && (!specText || specializationId !== current.specialization_id)) {
      const { rows: specRow } = await db.query(
        `SELECT name FROM specializations WHERE id = ?`,
        [specId]
      );
      if (specRow.length > 0) {
        specText = specRow[0].name;
      }
    }

    await db.query(
      `UPDATE providers
       SET name = ?, title = ?, specialization_id = ?, specialization = ?, is_active = ?, user_id = ?
       WHERE id = ?`,
      [newName, newTitle, specId, specText, newActive, newUserId, id]
    );

    return this.findById(id);
  }

  /**
   * Direct user linking method
   */
  static async linkUser(id, userId) {
    const finalUserId = userId && userId !== '' ? parseInt(userId, 10) : null;
    await db.query(`UPDATE providers SET user_id = ? WHERE id = ?`, [finalUserId, id]);
    return this.findById(id);
  }

  /**
   * Delete a provider by ID
   */
  static async delete(id) {
    const current = await this.findById(id);
    if (!current) return null;

    await db.query(`DELETE FROM providers WHERE id = ?`, [id]);
    return current;
  }
}

module.exports = Provider;
