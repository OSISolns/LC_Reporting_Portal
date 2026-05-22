'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../src/config/db');

async function run() {
  console.log('🔄 Running feedback migration to add laboratory_results...');
  try {
    // Check if column already exists
    const testQuery = await db.query('PRAGMA table_info(internal_feedbacks)');
    const columns = testQuery.rows.map(r => r.name);

    if (columns.includes('laboratory_results')) {
      console.log('✅ Column laboratory_results already exists.');
    } else {
      await db.query('ALTER TABLE internal_feedbacks ADD COLUMN laboratory_results INTEGER DEFAULT 0');
      console.log('✅ Successfully added laboratory_results column to internal_feedbacks.');
    }
  } catch (err) {
    console.error('❌ Failed to run feedback migration:', err.message);
  }
}

run();
