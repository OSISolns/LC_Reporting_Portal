'use strict';
require('dotenv').config();
const db = require('../src/config/db');
const { MODULES, ROLE_DEFAULTS } = require('../src/config/permissions');

async function setup() {
  try {
    console.log('🩺 Setting up "Medical Director" role in database...');

    // 1. Insert role
    await db.query(`
      INSERT INTO roles (name, display_name)
      VALUES (?, ?)
      ON CONFLICT (name) DO NOTHING
    `, ['medical_director', 'Medical Director']);
    console.log('✅ "medical_director" role verified/inserted.');

    // 2. Sync Modules
    for (const mod of MODULES) {
      await db.query(`
        INSERT INTO permission_modules (name, display_name, actions)
        VALUES (?, ?, ?)
        ON CONFLICT(name) DO UPDATE 
        SET display_name = EXCLUDED.display_name, actions = EXCLUDED.actions
      `, [mod.name, mod.display, JSON.stringify(mod.actions)]);
    }
    console.log('✅ Modules synced.');

    // 3. Sync Role Defaults
    const batch = [];
    for (const [roleName, modules] of Object.entries(ROLE_DEFAULTS)) {
      for (const [moduleName, actions] of Object.entries(modules)) {
        for (const [action, granted] of Object.entries(actions)) {
          batch.push({
            sql: `
              INSERT INTO role_permissions (role_name, module, action, granted, updated_by)
              VALUES (?, ?, ?, ?, 1)
              ON CONFLICT(role_name, module, action) DO UPDATE 
              SET granted = EXCLUDED.granted
            `,
            args: [roleName, moduleName, action, granted ? 1 : 0]
          });
        }
      }
    }
    await db.batch(batch);
    console.log(`✅ Role defaults synced (${batch.length} rules).`);

    console.log('🎉 Setup complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Setup failed:', err);
    process.exit(1);
  }
}

setup();
