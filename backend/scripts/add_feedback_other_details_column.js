'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../src/config/db');

async function run() {
  console.log('🔄 Running feedback migration to add other_details column...');
  try {
    const testQuery = await db.query('PRAGMA table_info(internal_feedbacks)');
    const columns = testQuery.rows.map(r => r.name);

    if (columns.includes('other_details')) {
      console.log('✅ Column other_details already exists.');
    } else {
      await db.query('ALTER TABLE internal_feedbacks ADD COLUMN other_details TEXT');
      console.log('✅ Successfully added other_details column to internal_feedbacks.');
    }
  } catch (err) {
    console.error('❌ Failed to run feedback migration:', err.message);
  }
}

run();
