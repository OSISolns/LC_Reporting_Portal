const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const db = require('../src/config/db');

async function run() {
  try {
    const { rows: providers } = await db.query(`
      SELECT p.id, p.name, p.specialization, p.department_id, d.name as department_name 
      FROM providers p
      LEFT JOIN departments d ON p.department_id = d.id
    `);
    console.log("--- Providers ---");
    for (const p of providers) {
      console.log(`ID: ${p.id} | Name: "${p.name}" | Specialization: "${p.specialization}" | Dept: "${p.department_name}" (${p.department_id})`);
    }
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
