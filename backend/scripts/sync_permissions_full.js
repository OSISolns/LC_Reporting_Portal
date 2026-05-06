require('dotenv').config();
const db = require('./src/config/db');
const { MODULES, ROLE_DEFAULTS } = require('./src/config/permissions');

async function syncModules() {
  try {
    console.log('Syncing Permission Modules and Role Defaults...');
    
    // 1. Sync Modules table
    for (const mod of MODULES) {
      await db.query(`
        INSERT INTO permission_modules (name, display_name, actions)
        VALUES (?, ?, ?)
        ON CONFLICT(name) DO UPDATE 
        SET display_name = EXCLUDED.display_name, actions = EXCLUDED.actions
      `, [mod.name, mod.display, JSON.stringify(mod.actions)]);
    }
    console.log('Modules synced.');

    // 2. Sync Role Defaults (Populate missing permissions)
    for (const [roleName, modules] of Object.entries(ROLE_DEFAULTS)) {
      for (const [moduleName, actions] of Object.entries(modules)) {
        for (const [action, granted] of Object.entries(actions)) {
          await db.query(`
            INSERT INTO role_permissions (role_name, module, action, granted, updated_by)
            VALUES (?, ?, ?, ?, 90)
            ON CONFLICT(role_name, module, action) DO UPDATE 
            SET granted = EXCLUDED.granted
          `, [roleName, moduleName, action, granted ? 1 : 0]);
        }
      }
    }
    console.log('Role defaults synced.');
    
    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

syncModules();
