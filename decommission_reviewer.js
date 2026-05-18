const db = require('./backend/src/config/db');
require('dotenv').config({ path: './backend/.env' });

async function decommission() {
  try {
    console.log('--- Decommissioning Reviewer Account ---');

    const username = 'lc_reviewer';
    const user = await db.query('SELECT id FROM users WHERE username = ?', [username]);

    if (user.rows.length === 0) {
      console.log('ℹ️ Reviewer user not found. Already decommissioned?');
    } else {
      const userId = user.rows[0].id;

      // 1. Disable user
      await db.query('UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
      console.log('✅ User "lc_reviewer" disabled.');

      // 2. Delete Mock Data
      const tables = ['incident_reports', 'cancellation_requests', 'refund_requests', 'clinical_observations', 'results_transfers'];
      for (const table of tables) {
        const res = await db.query(`DELETE FROM ${table} WHERE is_mock = 1`);
        console.log(`✅ Deleted ${res.rowCount} mock records from ${table}.`);
      }

      // 3. Optional: Delete the user entirely
      // await db.query('DELETE FROM users WHERE id = ?', [userId]);
      // console.log('✅ User "lc_reviewer" deleted.');
    }

    console.log('--- Decommissioning Complete ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Decommissioning failed:', err);
    process.exit(1);
  }
}

decommission();
