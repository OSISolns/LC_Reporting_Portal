const db = require('../src/config/db');

async function run() {
  try {
    console.log("🩺 Granting 'stock-manager' permissions to view and create Incident Reports...");

    // Insert view permission
    await db.query(
      "INSERT INTO role_permissions (role_name, module, action, granted) VALUES ($1, $2, $3, $4) ON CONFLICT(role_name, module, action) DO UPDATE SET granted = $4",
      ['stock-manager', 'incident_reports', 'view', 1]
    );

    // Insert create permission
    await db.query(
      "INSERT INTO role_permissions (role_name, module, action, granted) VALUES ($1, $2, $3, $4) ON CONFLICT(role_name, module, action) DO UPDATE SET granted = $4",
      ['stock-manager', 'incident_reports', 'create', 1]
    );

    console.log("✅ Stock Manager permissions successfully updated.");
  } catch (err) {
    console.error("❌ Error updating permissions:", err);
  } finally {
    process.exit(0);
  }
}

run();
