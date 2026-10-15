'use strict';
/**
 * Synchronize Lab Roles & Permissions to Turso Cloud
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@libsql/client');
const { ROLE_DEFAULTS, MODULES } = require('../src/config/permissions');

const tursoUrl = process.env.lcreporting_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.lcreporting_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error('❌ Missing Turso credentials in backend/.env');
  process.exit(1);
}

const turso = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

const TARGET_LAB_ROLES = [
  'lab_hod',
  'lab_manager',
  'quality_manager',
  'qm',
  'lab_safety_officer',
  'lab_stock_officer',
  'head_microbiology',
  'head_hematology',
  'head_histopathology',
  'head_poct',
  'head_phlebotomy',
  'head_molecular_biology',
  'lab_micro_specialist',
  'lab_scientist',
  'lab_tech',
  'lab_team_lead',
  'lab_lead',
  'lab'
];

async function syncPermissions() {
  console.log('🔄 Starting Laboratory Permissions Sync to Turso Cloud...');

  // 1. Ensure roles exist in roles table
  const existingRolesRes = await turso.execute('SELECT id, name FROM roles');
  const existingRoles = new Set(existingRolesRes.rows.map(r => r.name));

  for (const role of TARGET_LAB_ROLES) {
    if (!existingRoles.has(role)) {
      console.log(`➕ Registering role in database: ${role}`);
      await turso.execute({
        sql: `INSERT INTO roles (name, display_name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING`,
        args: [role, role.replace(/_/g, ' ').toUpperCase()]
      });
    }
  }

  // 2. Prepare UPSERT batch for all target roles
  const permOps = [];
  let totalGranted = 0;

  for (const roleName of TARGET_LAB_ROLES) {
    const modules = ROLE_DEFAULTS[roleName];
    if (!modules) {
      console.warn(`⚠️ Warning: No ROLE_DEFAULTS found for role: ${roleName}`);
      continue;
    }

    for (const [modName, actions] of Object.entries(modules)) {
      for (const [actionName, allowed] of Object.entries(actions)) {
        const isGranted = allowed ? 1 : 0;
        if (isGranted) totalGranted++;
        permOps.push({
          sql: `INSERT INTO role_permissions (role_name, module, action, granted, updated_by, updated_at)
                VALUES (?, ?, ?, ?, NULL, CURRENT_TIMESTAMP)
                ON CONFLICT (role_name, module, action) DO UPDATE 
                SET granted = excluded.granted, updated_by = NULL, updated_at = CURRENT_TIMESTAMP`,
          args: [roleName, modName, actionName, isGranted]
        });
      }
    }
  }

  console.log(`📦 Executing ${permOps.length} permission entries (${totalGranted} granted) across ${TARGET_LAB_ROLES.length} lab roles in Turso...`);

  const batchSize = 50;
  for (let i = 0; i < permOps.length; i += batchSize) {
    const chunk = permOps.slice(i, i + batchSize);
    await turso.batch(chunk, 'write');
  }

  console.log('✅ Successfully synced all Laboratory & Essential permissions to Turso Cloud!');
}

syncPermissions().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
