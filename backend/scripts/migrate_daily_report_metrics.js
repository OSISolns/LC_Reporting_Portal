const db = require('./src/config/db');

async function migrate() {
  console.log('🔌 Connecting to Turso...');
  try {
    // Check if specialization_id already exists
    const { rows: pragmaInfo } = await db.client.execute("PRAGMA table_info(daily_report_metrics)");
    const hasSpecId = pragmaInfo.some(col => col.name === 'specialization_id');
    const hasDeptId = pragmaInfo.some(col => col.name === 'department_id');

    if (!hasSpecId) {
      console.log('Adding specialization_id to daily_report_metrics...');
      await db.client.execute("ALTER TABLE daily_report_metrics ADD COLUMN specialization_id INTEGER REFERENCES specializations(id) ON DELETE CASCADE");
    }

    if (hasDeptId) {
      console.log('Dropping department_id from daily_report_metrics...');
      // Copy data to new table approach is safest if DROP COLUMN isn't supported, 
      // but SQLite 3.35+ supports DROP COLUMN. Let's try DROP COLUMN first.
      try {
        await db.client.execute("ALTER TABLE daily_report_metrics DROP COLUMN department_id");
        console.log('✅ department_id dropped successfully.');
      } catch (err) {
        console.log('⚠️ DROP COLUMN failed (possibly old SQLite version). Recreating table...');
        
        await db.client.execute("CREATE TABLE daily_report_metrics_new (id INTEGER PRIMARY KEY AUTOINCREMENT, report_date TEXT NOT NULL, provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE, specialization_id INTEGER REFERENCES specializations(id) ON DELETE CASCADE, patient_count INTEGER DEFAULT 0, follow_up_count INTEGER DEFAULT 0, UNIQUE (report_date, provider_id))");
        
        await db.client.execute("INSERT INTO daily_report_metrics_new (id, report_date, provider_id, patient_count, follow_up_count, specialization_id) SELECT id, report_date, provider_id, patient_count, follow_up_count, specialization_id FROM daily_report_metrics");
        
        await db.client.execute("DROP TABLE daily_report_metrics");
        await db.client.execute("ALTER TABLE daily_report_metrics_new RENAME TO daily_report_metrics");
        console.log('✅ Table recreated without department_id.');
      }
    } else {
      console.log('✅ department_id already removed.');
    }

    console.log('🎉 Migration completed successfully!');
  } catch (err) {
    console.error('Fatal error:', err);
  }
  process.exit(0);
}

migrate();
