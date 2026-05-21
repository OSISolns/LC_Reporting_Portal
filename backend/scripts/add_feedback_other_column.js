'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../src/config/db');

async function run() {
  console.log('🔄 Running feedback migration to add other column...');
  try {
    const testQuery = await db.query('PRAGMA table_info(patient_feedbacks)');
    const columns = testQuery.rows.map(r => r.name);
    
    if (columns.includes('other')) {
      console.log('✅ Column other already exists.');
    } else {
      await db.query('ALTER TABLE patient_feedbacks ADD COLUMN other INTEGER DEFAULT 0');
      console.log('✅ Successfully added other column to patient_feedbacks.');
    }
  } catch (err) {
    console.error('❌ Failed to run feedback migration:', err.message);
  }
}

run();
