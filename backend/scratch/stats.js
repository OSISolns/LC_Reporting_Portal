const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkStats() {
  try {
    const tables = ['users', 'roles', 'incident_reports', 'cancellation_requests', 'audit_logs'];
    console.log('--- Database Stats ---');
    for (const table of tables) {
      const result = await client.execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`${table}: ${result.rows[0].count}`);
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  } finally {
    process.exit();
  }
}

checkStats();
