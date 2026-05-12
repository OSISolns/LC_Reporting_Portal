require('dotenv').config();
const db = require('../src/config/db');

async function addStaffRole() {
  try {
    console.log('Adding Staff Member role to remote database...');
    
    // Check if it already exists
    const existing = await db.query("SELECT * FROM roles WHERE name = 'staff'");
    if (existing.rows.length > 0) {
      console.log('Role already exists.');
    } else {
      await db.query('INSERT INTO roles (name, display_name) VALUES (?, ?)', ['staff', 'Staff Member']);
      console.log('Role added successfully.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Failed to add role:', err);
    process.exit(1);
  }
}

addStaffRole();
