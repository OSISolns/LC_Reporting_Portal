const db = require('../src/config/db');

async function updateSpecializationId() {
  console.log('🔌 Connecting to Turso...');
  try {
    console.log('Updating specialization_id in daily_report_metrics...');
    
    // In SQLite, we can't do an UPDATE with a JOIN directly in the SET clause in older versions, 
    // but Turso supports UPDATE FROM or we can use a correlated subquery.
    const result = await db.client.execute(`
      UPDATE daily_report_metrics
      SET specialization_id = (
        SELECT specialization_id 
        FROM providers 
        WHERE providers.id = daily_report_metrics.provider_id
      )
      WHERE specialization_id IS NULL
    `);
    
    console.log(`✅ Updated ${result.rowsAffected || 'all'} rows with correct specialization_id!`);
  } catch (err) {
    console.error('Fatal error:', err);
  }
  process.exit(0);
}

updateSpecializationId();
