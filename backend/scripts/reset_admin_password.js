'use strict';
/**
 * Break-glass admin password reset.
 *
 * Resets a user's password and clears any lockout so a locked-out or
 * forgotten admin can get back in. Uses the shared config/db.js connection, so
 * it targets the LOCAL SQLite dev database by default and only touches Turso
 * when its env vars are set — and even then only with an explicit --force-prod
 * flag, so you can never rewrite production by accident.
 *
 * Usage:
 *   node scripts/reset_admin_password.js [username] [newPassword] [--force-prod]
 *
 *   • username     defaults to "lc_minega" (the institutional admin account)
 *   • newPassword  if omitted, a strong random password is generated & printed
 *
 * On reset the account is: re-activated, lockout cleared, failed attempts
 * zeroed, and flagged must_change_password so the operator sets their own
 * password at next login.
 *
 * Examples:
 *   node scripts/reset_admin_password.js                       # reset lc_minega, random password
 *   node scripts/reset_admin_password.js lc_minega 'NewPass#1' # reset with a chosen password
 *   node scripts/reset_admin_password.js lc_minega '' --force-prod   # against Turso (deliberate)
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Are we pointed at Turso (prod/cloud) rather than the local dev SQLite?
const usingTurso = !!(
  (process.env.lcreporting_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL) &&
  (process.env.lcreporting_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN)
);

function generatePassword() {
  // 16 url-safe chars, guaranteed mixed — good enough for a one-time reset.
  const base = crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  return `Lc${base}9!`.slice(0, 18);
}

async function main() {
  const args = process.argv.slice(2);
  const forceProd = args.includes('--force-prod');
  const positional = args.filter((a) => !a.startsWith('--'));
  const username = positional[0] || 'lc_minega';
  const providedPassword = positional[1];

  if (usingTurso && !forceProd) {
    console.error('🛑 Refusing to run: config/db.js is pointed at Turso (cloud/production).');
    console.error('   This is guarded so production is never rewritten by accident.');
    console.error('   Re-run with --force-prod ONLY if you intend to reset the account in Turso.');
    process.exitCode = 1;
    return;
  }

  const db = require('../src/config/db');
  const target = `${usingTurso ? 'Turso (CLOUD/PROD)' : 'local SQLite (dev)'}`;
  console.log(`🔐 Admin password reset → database: ${target}`);
  console.log(`   Target username: ${username}`);

  try {
    const { rows } = await db.query(
      `SELECT u.id, u.full_name, r.name AS role
         FROM users u LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.username = ?`,
      [username]
    );
    if (rows.length === 0) {
      console.error(`❌ No user found with username "${username}".`);
      process.exitCode = 1;
      return;
    }
    const user = rows[0];
    if (user.role !== 'admin') {
      console.warn(`⚠️  Note: "${username}" has role "${user.role || 'none'}", not "admin".`);
    }

    const newPassword = providedPassword || generatePassword();
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const res = await db.query(
      `UPDATE users
          SET password_hash = ?,
              failed_attempts = 0,
              lockout_until = NULL,
              is_active = 1,
              must_change_password = 1,
              updated_at = CURRENT_TIMESTAMP
        WHERE username = ?`,
      [passwordHash, username]
    );

    if (!res.rowCount) {
      console.error('❌ Update affected 0 rows — password was NOT changed.');
      process.exitCode = 1;
      return;
    }

    console.log('✅ Password reset successful. Account re-activated and lockout cleared.');
    console.log('   The user must set a new password at next login (must_change_password).');
    console.log('');
    console.log('   ┌───────────────────────────────────────────────');
    console.log(`   │ username: ${username}`);
    console.log(`   │ password: ${newPassword}`);
    console.log('   └───────────────────────────────────────────────');
    console.log(providedPassword
      ? '   (You supplied this password.)'
      : '   (Randomly generated — copy it now; it is not stored anywhere else.)');
  } catch (err) {
    console.error('❌ Reset failed:', err.message);
    process.exitCode = 1;
  }
}

main();
