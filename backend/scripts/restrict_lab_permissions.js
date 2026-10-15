'use strict';
/**
 * Restrict Laboratory Permissions:
 * Removes access to roster generator, cancellations, shift management, and lumina intelligence
 * across permissions.js configuration and Turso Cloud database.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@libsql/client');

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
  'lab_team_lead',
  'lab_lead',
  'lab_tech',
  'lab'
];

const RESTRICTED_MODULES = ['cancellations', 'shifts', 'roster', 'ai_insights'];

async function updatePermissionsFile() {
  const permFilePath = path.resolve(__dirname, '../src/config/permissions.js');
  let content = fs.readFileSync(permFilePath, 'utf8');

  for (const role of TARGET_LAB_ROLES) {
    // Regex to match the block for this role
    const roleRegex = new RegExp(`(${role}:\\s*\\{[\\s\\S]*?\\n  \\},)`, 'm');
    const match = content.match(roleRegex);
    if (!match) {
      console.warn(`Could not find block for role: ${role}`);
      continue;
    }

    let block = match[1];

    // Zero out cancellations
    block = block.replace(/cancellations:\s*\{[^}]+\}/g, 'cancellations:    { view:0, create:0, edit:0, review:0, approve:0, reject:0, delete:0 }');
    // Zero out shifts
    block = block.replace(/shifts:\s*\{[^}]+\}/g, 'shifts:           { view:0, create:0, edit:0, review:0, delete:0 }');
    // Zero out roster
    block = block.replace(/roster:\s*\{[^}]+\}/g, 'roster:           { view:0, create:0, edit:0, delete:0 }');
    // Zero out ai_insights
    block = block.replace(/ai_insights:\s*\{[^}]+\}/g, 'ai_insights:      { view:0, download:0 }');

    content = content.replace(match[1], block);
  }

  fs.writeFileSync(permFilePath, content, 'utf8');
  console.log('✅ Updated backend/src/config/permissions.js with zeroed permissions for lab roles.');
}

async function updateTurso() {
  const tursoUrl = process.env.lcreporting_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.lcreporting_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl || !tursoToken) {
    throw new Error('Missing Turso database credentials in backend/.env');
  }

  const turso = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  });

  console.log('🚀 Connecting to Turso Cloud to update role_permissions...');

  const placeholders = TARGET_LAB_ROLES.map(() => '?').join(', ');
  const modPlaceholders = RESTRICTED_MODULES.map(() => '?').join(', ');

  // 1. Set granted = 0 for all existing rows
  const updateRes = await turso.execute({
    sql: `UPDATE role_permissions 
          SET granted = 0, updated_at = CURRENT_TIMESTAMP 
          WHERE role_name IN (${placeholders}) AND module IN (${modPlaceholders})`,
    args: [...TARGET_LAB_ROLES, ...RESTRICTED_MODULES]
  });

  console.log(`✅ Updated existing restricted permissions in Turso. Rows affected: ${updateRes.rowsAffected}`);

  // 2. Also ensure explicit granted=0 rows exist for view actions so checks return false
  const zeroOps = [];
  for (const role of TARGET_LAB_ROLES) {
    for (const mod of RESTRICTED_MODULES) {
      const actions = mod === 'ai_insights' ? ['view', 'download'] : ['view', 'create', 'edit', 'delete'];
      for (const act of actions) {
        zeroOps.push({
          sql: `INSERT INTO role_permissions (role_name, module, action, granted, updated_at)
                VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
                ON CONFLICT (role_name, module, action) DO UPDATE SET granted = 0, updated_at = CURRENT_TIMESTAMP`,
          args: [role, mod, act]
        });
      }
    }
  }

  for (let i = 0; i < zeroOps.length; i += 50) {
    const chunk = zeroOps.slice(i, i + 50);
    await turso.batch(chunk, 'write');
  }

  console.log(`✅ Upserted ${zeroOps.length} explicit 0 (denied) records across all 18 lab roles for: ${RESTRICTED_MODULES.join(', ')}`);
}

async function run() {
  await updatePermissionsFile();
  await updateTurso();
  console.log('\n🎉 Successfully restricted Laboratory access to roster, cancellations, shifts, and lumina intelligence!');
}

run().catch(err => {
  console.error('❌ Error applying restrictions:', err);
  process.exit(1);
});
