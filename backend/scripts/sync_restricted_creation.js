require('dotenv').config();
const db = require('./src/config/db');
const { ROLE_DEFAULTS } = require('./src/config/permissions');

async function syncPermissions() {
  try {
    console.log('Syncing Restricted Creation Permissions...');
    
    // Roles to update
    const roles = ['principal_cashier', 'customer_care'];
    
    for (const roleName of roles) {
      const defaults = ROLE_DEFAULTS[roleName];
      if (!defaults) continue;
      
      for (const [moduleName, actions] of Object.entries(defaults)) {
        for (const [action, value] of Object.entries(actions)) {
          // Use INSERT ON CONFLICT for safety
          await db.query(`
            INSERT INTO role_permissions (role_name, module, action, granted, updated_by, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(role_name, module, action) DO UPDATE 
            SET granted = EXCLUDED.granted, updated_at = CURRENT_TIMESTAMP
          `, [roleName, moduleName, action, value ? 1 : 0, 90]);
        }
      }
      console.log(`Updated role: ${roleName}`);
    }
    
    console.log('Sync complete.');
    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

syncPermissions();
