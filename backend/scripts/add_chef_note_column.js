const db = require('../src/config/db');

async function migrate() {
  console.log('🔄 Running dental_cases chef_note column migration...\n');
  try {
    const { rows: pragmaRows } = await db.query('PRAGMA table_info(dental_cases)');
    const existingCols = new Set(pragmaRows.map(r => r.name.toLowerCase()));

    if (!existingCols.has('chef_note')) {
      console.log('➕ Adding chef_note column to dental_cases...');
      await db.query('ALTER TABLE dental_cases ADD COLUMN chef_note TEXT');
      console.log('✅ chef_note column added successfully.');
    } else {
      console.log('ℹ️ chef_note column already exists.');
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  }
  process.exit(0);
}

migrate();
