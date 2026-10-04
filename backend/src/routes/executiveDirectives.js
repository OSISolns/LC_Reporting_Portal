const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// Ensure table exists
const initDb = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS executive_directives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_type TEXT NOT NULL,
        report_id TEXT,
        report_title TEXT,
        author_id INTEGER,
        author_name TEXT NOT NULL,
        author_role TEXT NOT NULL,
        directive_type TEXT NOT NULL,
        subject TEXT,
        content TEXT NOT NULL,
        target_department TEXT,
        status TEXT DEFAULT 'pending',
        explanation_response TEXT,
        explained_by_name TEXT,
        explained_by_role TEXT,
        explained_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error('Error initializing executive_directives table:', err.message);
  }
};

initDb();

/**
 * GET /api/executive-directives
 * Fetch executive comments and calls for explanation
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { report_type, report_id, target_department, status } = req.query;
    let sql = `SELECT * FROM executive_directives WHERE 1=1`;
    const params = [];

    if (report_type) {
      sql += ` AND report_type = ?`;
      params.push(report_type);
    }
    if (report_id) {
      sql += ` AND report_id = ?`;
      params.push(report_id);
    }
    if (target_department) {
      sql += ` AND target_department = ?`;
      params.push(target_department);
    }
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await db.query(sql, params);
    const rows = result.rows || result;
    return res.json({ success: true, directives: rows });
  } catch (error) {
    console.error('Error fetching executive directives:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch executive directives' });
  }
});

/**
 * POST /api/executive-directives
 * Create a new Executive Comment or Call for Explanation
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      report_type,
      report_id,
      report_title,
      directive_type = 'comment', // 'comment' or 'call_for_explanation'
      subject,
      content,
      target_department = 'general'
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment or explanation text is required' });
    }

    const author_id = req.user.id;
    const author_name = req.user.full_name || req.user.username || 'Executive';
    const author_role = req.user.role || 'chairman';
    const status = directive_type === 'call_for_explanation' ? 'pending' : 'acknowledged';
    const cleanSubject = subject || (directive_type === 'call_for_explanation' ? 'Call for Explanation Requested' : 'Executive Note');

    const insertSql = `
      INSERT INTO executive_directives 
      (report_type, report_id, report_title, author_id, author_name, author_role, directive_type, subject, content, target_department, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await db.query(insertSql, [
      report_type || 'general',
      report_id || 'general',
      report_title || 'General Operational Report',
      author_id,
      author_name,
      author_role,
      directive_type,
      cleanSubject,
      content.trim(),
      target_department,
      status
    ]);

    const createdId = result.lastInsertRowid || (result.rows && result.rows[0] ? result.rows[0].id : null);

    // Send notifications if explanation is requested
    if (directive_type === 'call_for_explanation') {
      try {
        const notifTitle = `🚨 ${author_role === 'chairman' ? 'Chairman' : 'Executive'} Explanation Requested`;
        const notifMsg = `${author_name} (${author_role.toUpperCase()}) called for an explanation on report "${report_title || report_type}": "${content.trim().substring(0, 100)}..."`;
        await db.query(
          `INSERT INTO notifications (user_id, title, message, link, type) VALUES (NULL, ?, ?, ?, 'urgent')`,
          [notifTitle, notifMsg, `/daily-reports-board`]
        );
      } catch (nErr) {
        console.warn('Could not dispatch notification:', nErr.message);
      }
    }

    return res.json({
      success: true,
      message: directive_type === 'call_for_explanation' ? 'Formal Call for Explanation submitted and notified' : 'Executive comment posted successfully',
      id: createdId
    });
  } catch (error) {
    console.error('Error posting executive directive:', error);
    return res.status(500).json({ success: false, message: 'Failed to post executive directive' });
  }
});

/**
 * POST /api/executive-directives/:id/respond
 * Submit an official explanation in response to a Chairman request
 */
router.post('/:id/respond', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { explanation_response } = req.body;

    if (!explanation_response || !explanation_response.trim()) {
      return res.status(400).json({ success: false, message: 'Explanation response text is required' });
    }

    const responderName = req.user.full_name || req.user.username || 'Department Lead';
    const responderRole = req.user.role || 'staff';

    const updateSql = `
      UPDATE executive_directives
      SET explanation_response = ?,
          explained_by_name = ?,
          explained_by_role = ?,
          explained_at = CURRENT_TIMESTAMP,
          status = 'explained',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await db.query(updateSql, [explanation_response.trim(), responderName, responderRole, id]);

    // Dispatch notification to Chairman/Executives
    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, link, type) VALUES (NULL, ?, ?, ?, 'info')`,
        [
          `✅ Explanation Submitted by ${responderName}`,
          `${responderName} (${responderRole.toUpperCase()}) submitted an explanation in response to directive #${id}.`,
          `/daily-reports-board`
        ]
      );
    } catch (nErr) {
      console.warn('Notification insert error:', nErr.message);
    }

    return res.json({ success: true, message: 'Explanation response recorded successfully' });
  } catch (error) {
    console.error('Error recording explanation response:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit explanation response' });
  }
});

/**
 * POST /api/executive-directives/:id/resolve
 * Mark a directive as resolved or acknowledged by Chairman
 */
router.post('/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'resolved' } = req.body;

    await db.query(
      `UPDATE executive_directives SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, id]
    );

    return res.json({ success: true, message: `Directive marked as ${status}` });
  } catch (error) {
    console.error('Error resolving directive:', error);
    return res.status(500).json({ success: false, message: 'Failed to update directive status' });
  }
});

module.exports = router;
