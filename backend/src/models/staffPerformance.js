'use strict';
const db = require('../config/db');

class StaffPerformance {
  /**
   * Ensures the required tables exist (idempotent bootstrap).
   * Called once at server start via performanceRoutes init.
   */
  static async bootstrap() {
    // Scores table — one row per staff member
    await db.query(`
      CREATE TABLE IF NOT EXISTS staff_performance_scores (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL UNIQUE,
        score        REAL    NOT NULL DEFAULT 100,
        warnings     INTEGER NOT NULL DEFAULT 0,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ratings table — one row per rating event
    await db.query(`
      CREATE TABLE IF NOT EXISTS staff_performance_ratings (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_user_id   INTEGER NOT NULL,
        rated_by        INTEGER NOT NULL,
        request_type    TEXT NOT NULL,
        request_id      INTEGER NOT NULL,
        reason          TEXT NOT NULL,
        severity        INTEGER NOT NULL,
        points_deducted REAL NOT NULL DEFAULT 0,
        note            TEXT,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // ── Score record ──────────────────────────────────────────────────────────

  /** Get or create the score row for a user */
  static async getOrCreateScore(userId) {
    const { rows } = await db.query(
      `SELECT sps.*, u.full_name, u.username, r.name as role
       FROM staff_performance_scores sps
       JOIN users u ON u.id = sps.user_id
       JOIN roles r ON u.role_id = r.id
       WHERE sps.user_id = $1`,
      [userId]
    );
    if (rows[0]) return rows[0];

    // Create new score row
    await db.query(
      `INSERT INTO staff_performance_scores (user_id, score, warnings) VALUES ($1, 100, 0)`,
      [userId]
    );
    const { rows: newRows } = await db.query(
      `SELECT sps.*, u.full_name, u.username, r.name as role
       FROM staff_performance_scores sps
       JOIN users u ON u.id = sps.user_id
       JOIN roles r ON u.role_id = r.id
       WHERE sps.user_id = $1`,
      [userId]
    );
    return newRows[0];
  }

  /** Get scores for all eligible staff (cashier + customer_care) */
  static async getAllScores() {
    const { rows } = await db.query(`
      SELECT u.id as user_id, u.full_name, u.username, r.name as role,
             COALESCE(sps.score, 100) as score,
             COALESCE(sps.warnings, 0) as warnings
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN staff_performance_scores sps ON sps.user_id = u.id
      WHERE r.name IN ('cashier', 'customer_care')
        AND u.is_active = 1
      ORDER BY score ASC, u.full_name ASC
    `);
    return rows;
  }

  /** Fetch score for one user — creates if missing */
  static async getScoreByUserId(userId) {
    return StaffPerformance.getOrCreateScore(userId);
  }

  // ── Rating / deduction logic ───────────────────────────────────────────────

  /**
   * Apply a rating:
   * - severity 1-2  → tolerable, no deduction (warning if accumulating)
   * - severity 3    → warning issued
   * - severity 4-10 → deduct up to 2 points (scaled)
   */
  static async applyRating({ staffUserId, ratedBy, requestType, requestId, reason, severity, note }) {
    // Check if user is ratable (Cashier or Customer Care only)
    const { rows: userCheck } = await db.query(`
      SELECT r.name as role 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.id = $1
    `, [staffUserId]);

    if (!userCheck.length || !['cashier', 'customer_care'].includes(userCheck[0].role)) {
      throw new Error('This user is not in a ratable role.');
    }

    if (requestId) {
      const { rows: existing } = await db.query(
        `SELECT id FROM staff_performance_ratings WHERE request_type = $1 AND request_id = $2`,
        [requestType, requestId]
      );
      if (existing.length > 0) {
        throw new Error('This request has already been rated.');
      }
    }

    severity = Math.min(10, Math.max(1, Number(severity)));

    let pointsDeducted = 0;
    if (severity >= 4) {
      // Scale 4-10 → 0.8-2 points
      pointsDeducted = parseFloat((((severity - 4) / 6) * 1.2 + 0.8).toFixed(2));
    }

    let isSev2Warning = false;
    let sev2Deduction = 0;

    if (severity === 2) {
      const { rows: existingSev2 } = await db.query(
        `SELECT COUNT(*) as count FROM staff_performance_ratings WHERE staff_user_id = $1 AND severity = 2`,
        [staffUserId]
      );
      const newSev2Count = (existingSev2[0]?.count || 0) + 1;
      
      if (newSev2Count % 5 === 0) {
        sev2Deduction = 0.5;
        pointsDeducted = 0.5;
      }
      if (newSev2Count % 3 === 0) {
        isSev2Warning = true;
      }
    }

    // Ensure score row exists
    await StaffPerformance.getOrCreateScore(staffUserId);

    // Insert rating record
    const { rows: ratingRows } = await db.query(
      `INSERT INTO staff_performance_ratings
         (staff_user_id, rated_by, request_type, request_id, reason, severity, points_deducted, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [staffUserId, ratedBy, requestType, requestId, reason, severity, pointsDeducted, note || null]
    );
    const rating = ratingRows[0];

    let newWarnings = 0;
    let newScore = 0;

    if (severity === 3 || isSev2Warning) {
      // Increment warning count and check for multiples of 3
      const { rows: currentRows } = await db.query(
        `SELECT warnings FROM staff_performance_scores WHERE user_id = $1`,
        [staffUserId]
      );
      let currentWarnings = currentRows[0]?.warnings || 0;
      let updatedWarnings = currentWarnings + 1;
      let deduction = sev2Deduction;

      if (updatedWarnings % 3 === 0) {
        deduction += 0.5;
      }

      if (deduction > 0) {
        pointsDeducted = deduction;
        await db.query(`UPDATE staff_performance_ratings SET points_deducted = $1 WHERE id = $2`, [deduction, rating.id]);
        rating.points_deducted = deduction;
      }

      const { rows } = await db.query(
        `UPDATE staff_performance_scores
         SET warnings = $1, score = MAX(0, score - $2), updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3
         RETURNING score, warnings`,
        [updatedWarnings, deduction, staffUserId]
      );
      newScore = rows[0]?.score;
      newWarnings = rows[0]?.warnings;
    } else if (severity >= 4 || sev2Deduction > 0) {
      // Deduct points, floor at 0
      const { rows } = await db.query(
        `UPDATE staff_performance_scores
         SET score = MAX(0, score - $1), updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2
         RETURNING score, warnings`,
        [pointsDeducted, staffUserId]
      );
      newScore = rows[0]?.score;
      newWarnings = rows[0]?.warnings;
    } else {
      // Fetch current score unchanged
      const { rows } = await db.query(
        `SELECT score, warnings FROM staff_performance_scores WHERE user_id = $1`,
        [staffUserId]
      );
      newScore = rows[0]?.score;
      newWarnings = rows[0]?.warnings;
    }

    return { rating, newScore, newWarnings, pointsDeducted, isSev2Warning, sev2Deduction };
  }

  // ── Rating history ────────────────────────────────────────────────────────

  static async getRatingsForStaff(staffUserId, limit = 30) {
    const { rows } = await db.query(
      `SELECT spr.*, u.full_name as rated_by_name
       FROM staff_performance_ratings spr
       JOIN users u ON u.id = spr.rated_by
       WHERE spr.staff_user_id = $1
       ORDER BY spr.created_at DESC
       LIMIT $2`,
      [staffUserId, limit]
    );
    return rows;
  }

  static async getUnratedRequests(staffUserId, requestType) {
    if (requestType === 'cancellation') {
      const { rows } = await db.query(`
        SELECT id, reason_for_cancellation as reason 
        FROM cancellation_requests c
        WHERE (created_by = $1 OR billed_by = $1)
          AND NOT EXISTS (
            SELECT 1 FROM staff_performance_ratings spr
            WHERE spr.request_type = 'cancellation' AND spr.request_id = c.id
          )
        ORDER BY created_at DESC
      `, [staffUserId]);
      return rows;
    } else if (requestType === 'refund') {
      const { rows } = await db.query(`
        SELECT id, reason_for_refund as reason 
        FROM refund_requests r
        WHERE (created_by = $1 OR billed_by = $1)
          AND NOT EXISTS (
            SELECT 1 FROM staff_performance_ratings spr
            WHERE spr.request_type = 'refund' AND spr.request_id = r.id
          )
        ORDER BY created_at DESC
      `, [staffUserId]);
      return rows;
    }
    return [];
  }

  static async getAllRatings(limit = 100) {
    const { rows } = await db.query(
      `SELECT spr.*, 
              us.full_name as staff_name,
              um.full_name as rated_by_name
       FROM staff_performance_ratings spr
       JOIN users us ON us.id = spr.staff_user_id
       JOIN users um ON um.id = spr.rated_by
       ORDER BY spr.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  }

  /** Summary chart data — severity distribution per staff */
  static async getSeverityStats() {
    const { rows } = await db.query(`
      SELECT 
        spr.staff_user_id,
        u.full_name as staff_name,
        spr.severity,
        COUNT(*) as count,
        SUM(spr.points_deducted) as total_deducted
      FROM staff_performance_ratings spr
      JOIN users u ON u.id = spr.staff_user_id
      GROUP BY spr.staff_user_id, u.full_name, spr.severity
      ORDER BY spr.staff_user_id, spr.severity
    `);
    return rows;
  }
}

module.exports = StaffPerformance;
