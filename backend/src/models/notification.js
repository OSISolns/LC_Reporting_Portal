'use strict';
const db = require('../config/db');
const emailService = require('../services/emailService');
const { decryptField } = require('../utils/crypto');

class Notification {
  static async create({ userId, title, message, type = 'info', link = null }) {
    const sql = `
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const result = await db.query(sql, [userId, title, message, type, link]);
    const createdNotif = result.rows[0];

    // Asynchronously dispatch email notification to concerned user if email is configured
    if (userId) {
      db.query('SELECT email, full_name FROM users WHERE id = $1', [userId])
        .then(({ rows }) => {
          if (rows && rows[0] && rows[0].email) {
            const rawEmail = rows[0].email;
            const userEmail = decryptField(rawEmail);
            if (userEmail && typeof userEmail === 'string' && userEmail.includes('@')) {
              emailService.sendNotification(userEmail.trim(), title, message, type)
                .catch(err => console.error(`⚠️ Failed to send notification email to ${userEmail}:`, err.message));
            }
          }
        })
        .catch(err => console.error(`⚠️ Error looking up email for notification recipient user #${userId}:`, err.message));
    }

    return createdNotif;
  }

  static async getByUserId(userId, limit = 50) {
    const sql = `
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2;
    `;
    const result = await db.query(sql, [userId, limit]);
    return result.rows;
  }

  static async getUnreadCount(userId) {
    const sql = `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false;`;
    const result = await db.query(sql, [userId]);
    return parseInt(result.rows[0].count);
  }

  static async markAsRead(id, userId) {
    const sql = `
      UPDATE notifications 
      SET is_read = true 
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `;
    const result = await db.query(sql, [id, userId]);
    return result.rows[0];
  }

  static async markAllAsRead(userId) {
    const sql = `
      UPDATE notifications 
      SET is_read = true 
      WHERE user_id = $1;
    `;
    await db.query(sql, [userId]);
    return true;
  }

  static async delete(id, userId) {
    const sql = `DELETE FROM notifications WHERE id = $1 AND user_id = $2;`;
    await db.query(sql, [id, userId]);
    return true;
  }
}

module.exports = Notification;
