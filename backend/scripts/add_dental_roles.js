'use strict';
/**
 * Provision script for Dental Department roles + test users.
 *
 * Roles created:
 *  - Dental HoD         (dental_hod)
 *  - Dental Tech        (dental_tech)
 *  - Dental Lab Manager (dental_lab_manager)
 *
 * Usage: node scripts/add_dental_roles.js
 */
const db = require('../src/config/db');
const bcrypt = require('bcryptjs');

const DENTAL_ROLES = [
  { name: 'dental_hod',         display: 'Dental HoD',         user: ['Dental HoD',         'dental_hod_user',         'dental.hod@legacyclinics.rw'] },
  { name: 'dental_tech',        display: 'Dental Tech',        user: ['Dental Tech',        'dental_tech_user',        'dental.tech@legacyclinics.rw'] },
  { name: 'dental_lab_manager', display: 'Dental Lab Manager', user: ['Dental Lab Manager', 'dental_lab_manager_user', 'dental.labmanager@legacyclinics.rw'] },
];

const DEFAULT_PASSWORD = 'dental123';

async function addDentalRoles() {
  try {
    console.log('🦷 Provisioning Dental Department roles and accounts...');
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    for (const role of DENTAL_ROLES) {
      await db.query(
        'INSERT INTO roles (name, display_name) VALUES (?, ?) ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name',
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
      console.log(`✅ ${role.display} role + account (${username} / ${DEFAULT_PASSWORD}).`);
    }

    console.log('✨ Dental Department roles provisioning complete.');
  } catch (err) {
    console.error('❌ Failed to provision dental roles:', err);
    process.exitCode = 1;
  }
}

addDentalRoles();
