const db = require('../src/config/db');

async function run() {
  console.log('🔌 Connecting to Turso Cloud...');
  
  try {
    const { rows: june19 } = await db.query(
      `SELECT m.report_date, m.provider_id, p.name as provider_name, s.name as specialization_name, m.patient_count
       FROM daily_report_metrics m
       JOIN providers p ON m.provider_id = p.id
       LEFT JOIN specializations s ON p.specialization_id = s.id
       WHERE m.report_date = '2026-06-19' AND m.patient_count > 0`
    );
    console.log(`\n--- June 19 Non-Zero Metrics (${june19.length} rows) ---`);
    console.log(june19);

    const { rows: june11 } = await db.query(
      `SELECT m.report_date, m.provider_id, p.name as provider_name, s.name as specialization_name, m.patient_count
       FROM daily_report_metrics m
       JOIN providers p ON m.provider_id = p.id
       LEFT JOIN specializations s ON p.specialization_id = s.id
       WHERE m.report_date = '2026-06-11' AND m.patient_count > 0`
    );
    console.log(`\n--- June 11 Non-Zero Metrics (${june11.length} rows) ---`);
    console.log(june11);

    const { rows: allJuneCount } = await db.query(
      `SELECT m.report_date, COUNT(*) as cnt, SUM(m.patient_count) as total_patients
       FROM daily_report_metrics m
       WHERE m.report_date LIKE '2026-06%'
       GROUP BY m.report_date`
    );
    console.log(`\n--- June Daily Summary ---`);
    console.log(allJuneCount);

  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

run();
