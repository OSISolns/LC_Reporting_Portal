'use strict';
const db = require('../src/config/db');

async function check() {
  try {
    const { rows } = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'cancellation_requests'
    `);
    console.log('--- SCHEMA ---');
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error('Error checking schema:', err);
    process.exit(1);
  }
}

check();
