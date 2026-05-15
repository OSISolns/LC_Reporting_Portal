'use strict';
const db = require('../src/config/db');
const { ROLE_DEFAULTS, MODULES } = require('../src/config/permissions');

async function refreshPermissions() {
  console.log('🔄 Refreshing system permissions from config...');
  try {
    // 1. Ensure modules exist
    for (const mod of MODULES) {
      await db.query(
        `INSERT INTO permission_modules (name, display_name, actions) 
         VALUES (?, ?, ?) 
         ON CONFLICT(name) DO UPDATE SET display_name = EXCLUDED.display_name, actions = EXCLUDED.actions`,
        [mod.name, mod.display, JSON.stringify(mod.actions)]
      );
    }
    console.log('✅ Modules synced.');

    // 2. Sync role defaults
    const batch = [];
    for (const [role, perms] of Object.entries(ROLE_DEFAULTS)) {
      for (const [module, actions] of Object.entries(perms)) {
        for (const [action, granted] of Object.entries(actions)) {
          batch.push({
            sql: `INSERT INTO role_permissions (role_name, module, action, granted, updated_at)
                  VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                  ON CONFLICT(role_name, module, action) DO UPDATE SET granted = EXCLUDED.granted, updated_at = CURRENT_TIMESTAMP`,
            args: [role, module, action, granted ? 1 : 0]
          });
        }
      }
    }
    await db.batch(batch);
    console.log('✅ Role permissions synced.');
    
    console.log('✨ Permissions refresh complete.');
  } catch (err) {
    console.error('❌ Error refreshing permissions:', err);
  }
}

refreshPermissions();
