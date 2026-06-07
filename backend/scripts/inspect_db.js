const db = require('../src/config/db');

async function run() {
  try {
    const nursingCount = await db.query("SELECT COUNT(*) as count FROM nursing_monthly_stock");
    console.log("nursing_monthly_stock count:", nursingCount.rows[0].count);

    const sampleNursing = await db.query("SELECT * FROM nursing_monthly_stock LIMIT 10");
    console.log("Sample nursing_monthly_stock:", sampleNursing.rows);

  } catch (err) {
    console.error("Error inspecting database:", err);
  } finally {
    process.exit(0);
  }
}

run();
