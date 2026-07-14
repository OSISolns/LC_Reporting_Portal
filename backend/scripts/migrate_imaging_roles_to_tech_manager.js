'use strict';
/**
 * One-time migration: collapse the old 5-role imaging RBAC scheme
 * (radiographer, sonographer, radiologist, imaging_receptionist, imaging_manager)
 * down to 2 roles: imaging_tech, imaging_manager.
 *
 * Reassigns any user on an old role to imaging_tech, then removes the old
 * role rows. imaging_manager is left untouched. Targets whatever config/db.js
 * resolves to (local SQLite in dev; do not run against Turso without approval).
 *
 * Usage: node scripts/migrate_imaging_roles_to_tech_manager.js
 */
const db = require('../src/config/db');

const OLD_ROLES = ['radiographer', 'sonographer', 'radiologist', 'imaging_receptionist'];

async function migrate() {
  try {
    console.log('🩻 Migrating old imaging roles → imaging_tech / imaging_manager...');

    await db.query(
      "INSERT INTO roles (name, display_name) VALUES ('imaging_tech', 'Imaging Tech') ON CONFLICT (name) DO NOTHING"
    );
    const { rows: techRows } = await db.query("SELECT id FROM roles WHERE name = 'imaging_tech'");
    const techRoleId = techRows[0].id;

    for (const roleName of OLD_ROLES) {
      const { rows: roleRows } = await db.query('SELECT id FROM roles WHERE name = ?', [roleName]);
      if (!roleRows[0]) continue;
      const oldRoleId = roleRows[0].id;

      const { rows: users } = await db.query('SELECT id, username FROM users WHERE role_id = ?', [oldRoleId]);
      for (const u of users) {
        await db.query('UPDATE users SET role_id = ? WHERE id = ?', [techRoleId, u.id]);
        console.log(`  → ${u.username}: ${roleName} → imaging_tech`);
      }

      await db.query('DELETE FROM roles WHERE id = ?', [oldRoleId]);
      console.log(`✅ Removed role '${roleName}'.`);
    }

    console.log('✨ Imaging role migration complete.');
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exitCode = 1;
  }
}

migrate();
