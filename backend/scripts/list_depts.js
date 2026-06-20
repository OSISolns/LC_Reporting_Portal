const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const db = require('../src/config/db');

async function run() {
  try {
    const { rows: depts } = await db.query("SELECT * FROM departments");
    console.log("--- Departments ---");
    for (const dept of depts) {
      const { rows: stockCount } = await db.query("SELECT COUNT(*) as count FROM department_stock WHERE department_id = $1", [dept.id]);
      const { rows: providerCount } = await db.query("SELECT COUNT(*) as count FROM providers WHERE department_id = $1", [dept.id]);
      const { rows: metricCount } = await db.query("SELECT COUNT(*) as count FROM daily_report_metrics WHERE department_id = $1", [dept.id]);
      const { rows: reqCount } = await db.query("SELECT COUNT(*) as count FROM requisitions WHERE department_id = $1", [dept.id]);
      console.log(`ID: ${dept.id} | Name: "${dept.name}" | Stock count: ${stockCount[0].count} | Providers: ${providerCount[0].count} | Metrics: ${metricCount[0].count} | Requisitions: ${reqCount[0].count}`);
    }
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
