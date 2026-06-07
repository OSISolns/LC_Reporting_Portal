const db = require('../src/config/db');

async function run() {
  try {
    const perms = await db.query("SELECT * FROM role_permissions WHERE role_name = 'stock-manager'");
    console.log("Stock Manager Permissions:", perms.rows);
  } catch (err) {
    console.error("Error inspecting:", err);
  } finally {
    process.exit(0);
  }
}

run();
