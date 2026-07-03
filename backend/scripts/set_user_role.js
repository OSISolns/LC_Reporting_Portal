'use strict';
/**
 * Promote/assign a role to a user (defaults to "admin").
 *
 * Uses config/db.js, so it targets the LOCAL SQLite dev database by default and
 * only touches Turso when its env vars are set — and even then only with an
 * explicit --force-prod flag, so production is never changed by accident.
 *
 * Usage:
 *   node scripts/set_user_role.js <username> [roleName] [--force-prod]
 *
 * Examples:
 *   node scripts/set_user_role.js lc_valery            # make lc_valery an admin
 *   node scripts/set_user_role.js lc_valery admin      # explicit
 *   node scripts/set_user_role.js lc_valery admin --force-prod   # against Turso (deliberate)
 */
const usingTurso = !!(
  (process.env.lcreporting_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL) &&
  (process.env.lcreporting_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN)
);

async function main() {
  const args = process.argv.slice(2);
  const forceProd = args.includes('--force-prod');
  const positional = args.filter((a) => !a.startsWith('--'));
  const username = positional[0];
  const roleName = positional[1] || 'admin';

  if (!username) {
    console.error('Usage: node scripts/set_user_role.js <username> [roleName] [--force-prod]');
    process.exitCode = 1;
    return;
  }

  if (usingTurso && !forceProd) {
    console.error('🛑 Refusing to run: config/db.js is pointed at Turso (cloud/production).');
    console.error('   Re-run with --force-prod ONLY if you intend to change the role in Turso.');
    process.exitCode = 1;
    return;
  }

  const db = require('../src/config/db');
  console.log(`👤 Set role → database: ${usingTurso ? 'Turso (CLOUD/PROD)' : 'local SQLite (dev)'}`);

  try {
    const { rows: userRows } = await db.query(
      `SELECT u.id, u.full_name, r.name AS role
         FROM users u LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.username = ?`,
      [username]
    );
    if (userRows.length === 0) {
      console.error(`❌ No user found with username "${username}".`);
      process.exitCode = 1;
      return;
    }
    const user = userRows[0];
    console.log(`   ${username} (${user.full_name}) — current role: ${user.role || 'none'}`);

    const { rows: roleRows } = await db.query('SELECT id FROM roles WHERE name = ?', [roleName]);
    if (roleRows.length === 0) {
      console.error(`❌ Role "${roleName}" does not exist. Provision it first.`);
      process.exitCode = 1;
      return;
    }
    const roleId = roleRows[0].id;

    if (user.role === roleName) {
      console.log(`✅ No change needed — "${username}" is already "${roleName}".`);
      return;
    }

    await db.query(
      'UPDATE users SET role_id = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
      [roleId, username]
    );
    console.log(`✅ "${username}" is now "${roleName}" (was "${user.role || 'none'}").`);
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exitCode = 1;
  }
}

main();
