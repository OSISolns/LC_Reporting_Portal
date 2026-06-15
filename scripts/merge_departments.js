const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const db = require('../backend/src/config/db');

async function run() {
  try {
    console.log('🔄 Merging duplicate departments...');

    // Get the IDs
    const { rows: depts } = await db.query("SELECT id, name FROM departments WHERE name IN ('OPERATIONS', 'Operations')");
    
    const opsUpper = depts.find(d => d.name === 'OPERATIONS');
    const opsLower = depts.find(d => d.name === 'Operations');

    if (!opsUpper || !opsLower) {
      console.log('ℹ️ Duplicate departments not found. Already merged?');
      process.exit(0);
    }

    console.log(`Standardizing to uppercase: OPERATIONS (ID: ${opsUpper.id}) and removing Operations (ID: ${opsLower.id})`);

    // 1. Update department_stock references
    const { rowCount: updatedStock } = await db.query(
      "UPDATE department_stock SET department_id = $1 WHERE department_id = $2",
      [opsUpper.id, opsLower.id]
    );
    console.log(`✅ Updated ${updatedStock} department_stock records to reference OPERATIONS.`);

    // 2. Delete the lowercase duplicate department
    await db.query("DELETE FROM departments WHERE id = $1", [opsLower.id]);
    console.log(`✅ Deleted lowercase duplicate department "Operations".`);

    console.log('🎉 Merge completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to merge departments:', error);
    process.exit(1);
  }
}

run();
