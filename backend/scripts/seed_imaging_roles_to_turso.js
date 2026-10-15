'use strict';
/**
 * Imaging Department Roles & Permissions Seeder for Turso Cloud
 * Seeds Imaging roles, role_permissions matrix, and departmental accounts directly to Turso.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const { encryptField } = require('../src/utils/crypto');
const { ROLE_DEFAULTS } = require('../src/config/permissions');

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

const IMAGING_ROLES = [
  { name: 'imaging_manager', display_name: 'Imaging Department Manager' },
  { name: 'imaging_tech',    display_name: 'Imaging Technologist (Radiographer)' },
  { name: 'radiologist',     display_name: 'Consultant Radiologist' },
  { name: 'sono',            display_name: 'Sonographer (Ultrasound)' },
  { name: 'imaging',         display_name: 'Imaging Staff' }
];

const IMAGING_ACCOUNTS = [
  {
    name: 'Imaging Department Lead',
    username: 'lc_imaging_lead',
    email: 'imaging.manager@legacyclinics.rw',
    position: 'Imaging Department Manager',
    roleKey: 'imaging_manager'
  },
  {
    name: 'Imaging Technologist',
    username: 'lc_imaging_tech',
    email: 'imaging.tech@legacyclinics.rw',
    position: 'Radiographer / Technologist',
    roleKey: 'imaging_tech'
  },
  {
    name: 'Consultant Radiologist',
    username: 'lc_radiologist',
    email: 'radiology@legacyclinics.rw',
    position: 'Consultant Radiologist',
    roleKey: 'radiologist'
  },
  {
    name: 'Clinical Sonographer',
    username: 'lc_sono',
    email: 'ultrasound@legacyclinics.rw',
    position: 'Ultrasound Sonographer',
    roleKey: 'sono'
  }
];

async function seedImagingToTurso() {
  console.log('🚀 Connecting to Turso Cloud database...');
  const connTest = await turso.execute('SELECT 1 as connected');
  if (!connTest.rows || connTest.rows.length === 0) {
    throw new Error('Connection test to Turso failed.');
  }
  console.log('✅ Connected to Turso Cloud successfully.');

  // 1. Seed / Upsert Roles in Turso
  console.log('\n🎭 Registering Imaging Department roles in Turso...');
  for (const role of IMAGING_ROLES) {
    await turso.execute({
      sql: `INSERT INTO roles (name, display_name)
            VALUES (?, ?)
            ON CONFLICT (name) DO UPDATE SET display_name = excluded.display_name`,
      args: [role.name, role.display_name]
    });
    console.log(`  ✓ Role registered: ${role.name} (${role.display_name})`);
  }

  // 2. Fetch role mapping
  const rolesRes = await turso.execute('SELECT id, name, display_name FROM roles');
  const roleIdMap = {};
  for (const row of rolesRes.rows) {
    roleIdMap[row.name] = row.id;
  }

  // 3. Sync permissions for Imaging Roles
  console.log('\n🔒 Synchronizing Imaging role permissions in Turso...');
  const permOps = [];
  let totalGranted = 0;

  for (const role of IMAGING_ROLES) {
    const modules = ROLE_DEFAULTS[role.name];
    if (!modules) {
      console.warn(`  ⚠️ Warning: No ROLE_DEFAULTS defined for ${role.name}`);
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
          args: [role.name, modName, actionName, isGranted]
        });
      }
    }
  }

  console.log(`  📦 Queuing ${permOps.length} permission entries (${totalGranted} granted) across ${IMAGING_ROLES.length} imaging roles...`);

  // Execute in batches of 50
  const batchSize = 50;
  for (let i = 0; i < permOps.length; i += batchSize) {
    const chunk = permOps.slice(i, i + batchSize);
    await turso.batch(chunk, 'write');
  }
  console.log('  ✅ Role permissions successfully synced to Turso!');

  // 4. Seed Departmental Accounts
  console.log('\n👥 Seeding default Imaging staff accounts...');
  const defaultPassword = 'Legacy@2026';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  const accountResults = [];

  for (const acc of IMAGING_ACCOUNTS) {
    const roleId = roleIdMap[acc.roleKey];
    if (!roleId) {
      console.error(`  ❌ Missing role ID for: ${acc.roleKey}`);
      accountResults.push({ username: acc.username, role: acc.roleKey, status: 'FAILED: Missing role' });
      continue;
    }

    const encFullName = encryptField(acc.name);
    const encEmail = encryptField(acc.email);

    const existingRes = await turso.execute({
      sql: 'SELECT id, username FROM users WHERE LOWER(username) = LOWER(?)',
      args: [acc.username]
    });

    if (existingRes.rows && existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      await turso.execute({
        sql: `UPDATE users
              SET full_name = ?, email = ?, password_hash = ?, role_id = ?, is_active = 1, must_change_password = 0, failed_attempts = 0, lockout_until = NULL, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [encFullName, encEmail, passwordHash, roleId, existing.id]
      });
      accountResults.push({ id: existing.id, username: acc.username, role: acc.roleKey, status: 'UPDATED' });
    } else {
      const insertRes = await turso.execute({
        sql: `INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, must_change_password, failed_attempts, lockout_until)
              VALUES (?, ?, ?, ?, ?, 1, 0, 0, NULL)`,
        args: [encFullName, acc.username, encEmail, passwordHash, roleId]
      });
      accountResults.push({ id: Number(insertRes.lastInsertRowid), username: acc.username, role: acc.roleKey, status: 'CREATED' });
    }
  }

  console.log('\n================ TURSO IMAGING SEED SUMMARY ================');
  console.table(IMAGING_ROLES.map(r => ({ role: r.name, display_name: r.display_name, role_id: roleIdMap[r.name] })));
  console.log('\n--- Accounts ---');
  console.table(accountResults);
  console.log(`Total permissions upserted: ${permOps.length} (${totalGranted} granted)`);
  console.log(`Default credential format: Username: [username], Password: ${defaultPassword}`);
  console.log('============================================================\n');
}

seedImagingToTurso()
  .then(() => {
    console.log('🎉 Imaging department roles and permissions successfully seeded to Turso Cloud!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Failed seeding imaging department roles to Turso:', err);
    process.exit(1);
  });
