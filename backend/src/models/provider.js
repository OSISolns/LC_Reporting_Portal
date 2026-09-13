'use strict';
const db = require('../config/db');

class Provider {
  /**
   * Fetch all providers with joined specialization name
   */
  static async getAll({ search = '', specializationId = null, activeOnly = false } = {}) {
    let sql = `
      SELECT p.id, p.name, p.title, p.specialization_id, p.specialization, p.is_active,
             s.name as specialization_name,
             coalesce(s.name, p.specialization, 'General') as department_name
      FROM providers p
      LEFT JOIN specializations s ON p.specialization_id = s.id
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
      sql += ` AND (LOWER(p.name) LIKE ? OR LOWER(coalesce(p.title, '')) LIKE ? OR LOWER(coalesce(s.name, p.specialization, '')) LIKE ?)`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY p.is_active DESC, p.name ASC`;

    const { rows } = await db.query(sql, params);
    return rows;
  }

  /**
   * Fetch provider by ID
   */
  static async findById(id) {
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.title, p.specialization_id, p.specialization, p.is_active,
              s.name as specialization_name
       FROM providers p
       LEFT JOIN specializations s ON p.specialization_id = s.id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0] || null;
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
  static async create({ name, title = null, specializationId = null, specialization = null, isActive = 1 }) {
    let specId = specializationId ? parseInt(specializationId, 10) : null;
    let specText = specialization ? specialization.trim() : null;

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
      `INSERT INTO providers (name, title, specialization_id, specialization, is_active)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id, name, title, specialization_id, specialization, is_active`,
      [name.trim(), title ? title.trim() : null, specId, specText, isActive ? 1 : 0]
    );

    return rows[0];
  }

  /**
   * Update an existing provider
   */
  static async update(id, { name, title, specializationId, specialization, isActive }) {
    const current = await this.findById(id);
    if (!current) return null;

    const newName = name !== undefined ? name.trim() : current.name;
    const newTitle = title !== undefined ? (title ? title.trim() : null) : current.title;
    const newActive = isActive !== undefined ? (isActive ? 1 : 0) : current.is_active;

    let specId = specializationId !== undefined ? (specializationId ? parseInt(specializationId, 10) : null) : current.specialization_id;
    let specText = specialization !== undefined ? (specialization ? specialization.trim() : null) : current.specialization;

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
       SET name = ?, title = ?, specialization_id = ?, specialization = ?, is_active = ?
       WHERE id = ?`,
      [newName, newTitle, specId, specText, newActive, id]
    );

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
