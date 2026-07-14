'use strict';
/**
 * Provision the Imaging (Radiology) Department roles + test users.
 *
 * Uses the shared config/db.js connection, so it targets whatever that module
 * resolves to: the LOCAL SQLite dev database when Turso env vars are unset, or
 * Turso when they are. This keeps development safe — no hardcoded prod client.
 *
 * Modality (US/X-ray/CT/MRI) is a study/shift attribute, not a role
 * (see backend/src/config/permissions.js).
 *
 * Usage: node scripts/add_imaging_roles.js
 */
const db = require('../src/config/db');
const bcrypt = require('bcryptjs');

const IMAGING_ROLES = [
  { name: 'imaging_tech',    display: 'Imaging Tech',    user: ['Imaging Tech Tara',    'imaging_tech_tara',  'tara@legacyclinics.rw'] },
  { name: 'imaging_manager', display: 'Imaging Manager', user: ['Imaging Manager Max',  'imaging_manager_max','max@legacyclinics.rw'] },
];

const DEFAULT_PASSWORD = 'imaging123';

async function addImagingRoles() {
  try {
    console.log('🩻 Adding Imaging Department roles and test users...');
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    for (const role of IMAGING_ROLES) {
      await db.query(
        'INSERT INTO roles (name, display_name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING',
        [role.name, role.display]
      );

      const { rows } = await db.query('SELECT id FROM roles WHERE name = ?', [role.name]);
      const roleId = rows[0].id;

      const [fullName, username, email] = role.user;
      await db.query(
        `INSERT INTO users (full_name, username, email, password_hash, role_id)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (username) DO NOTHING`,
        [fullName, username, email, passwordHash, roleId]
      );
      console.log(`✅ ${role.display} role + test user (${username} / ${DEFAULT_PASSWORD}).`);
    }

    console.log('✨ Imaging roles provisioning complete.');
    console.log('👉 Next: `node scripts/sync_permissions_full.js` to publish the RBAC matrix.');
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exitCode = 1;
  }
}

addImagingRoles();
