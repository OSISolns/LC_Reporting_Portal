'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const db = require('../src/config/db');
const bcrypt = require('bcryptjs');
const { ROLE_DEFAULTS } = require('../src/config/permissions');

const LAB_ROLES = [
  { name: 'lab_hod', display_name: 'Head of Laboratory Department' },
  { name: 'lab_manager', display_name: 'Laboratory Manager' },
  { name: 'quality_manager', display_name: 'Quality Manager' },
  { name: 'qm', display_name: 'Quality Manager (QM)' },
  { name: 'lab_safety_officer', display_name: 'Lab Safety Officer' },
  { name: 'lab_stock_officer', display_name: 'Lab stock Manager' },
  { name: 'head_microbiology', display_name: 'Head of Microbiology' },
  { name: 'head_hematology', display_name: 'Head of Hematology' },
  { name: 'head_histopathology', display_name: 'Head of Histo/Cytology/Archive' },
  { name: 'head_poct', display_name: 'Head of POCT' },
  { name: 'head_phlebotomy', display_name: 'Head of Phlebotomy' },
  { name: 'head_molecular_biology', display_name: 'Head of Molecular Biology' },
  { name: 'lab_micro_specialist', display_name: 'Microbiology Specialist' },
  { name: 'lab_scientist', display_name: 'Lab Scientist' },
  { name: 'lab_tech', display_name: 'Lab Technologist' },
  { name: 'lab_team_lead', display_name: 'Lab Team Lead' },
  { name: 'lab_lead', display_name: 'Lab Lead' },
  { name: 'lab', display_name: 'Laboratory Staff' }
];

const LAB_PERSONNEL_RESTRUCTURED = [
  {
    name: 'Thierry ZAWADI MUVUNYI',
    position: 'Head of Laboratory Dept',
    email: 'zawadi@legacyclinics.rw',
    username: 'lc_zawadi',
    roleKey: 'lab_hod'
  },
  {
    name: 'USENGIMANA Angelique',
    position: 'Ag Lab Manager',
    email: 'angelique@legacyclinics.rw',
    username: 'lc_angelique',
    roleKey: 'lab_manager'
  },
  {
    name: 'MWIZERWA Callixte',
    position: 'Quality Manager',
    email: 'calixte@legacyclinics.rw',
    username: 'lc_calixte',
    roleKey: 'quality_manager'
  },
  {
    name: 'NZAYIYENGA Sylvestre',
    position: 'Lab Safety Officer',
    email: 'sylvestre@legacyclinics.rw',
    username: 'lc_sylvestre',
    roleKey: 'lab_safety_officer'
  },
  {
    name: 'HIRWA Ganza David',
    position: 'Lab stock Manager',
    email: 'hirwa@legacyclinics.rw',
    username: 'lc_hirwa',
    roleKey: 'lab_stock_officer'
  },
  {
    name: 'ABAKUNDANYE Marie Chantal',
    position: 'Head of Microbiology',
    email: 'mchantal@legacyclinics.rw',
    username: 'lc_mchantal',
    roleKey: 'head_microbiology'
  },
  {
    name: 'RAFIKI Justin',
    position: 'Head of Hematology',
    email: 'rafiki@legacyclinics.rw',
    username: 'lc_rafiki',
    roleKey: 'head_hematology'
  },
  {
    name: 'UWAMAHORO Marie Claire',
    position: 'Head of Histo/Cytology/Archive',
    email: 'claire@legacyclinics.rw',
    username: 'lc_claire',
    roleKey: 'head_histopathology'
  },
  {
    name: 'KAGABIRWA Jeanne',
    position: 'Head of POCT',
    email: 'jeanne.k@legacyclinics.rw',
    username: 'lc_jeanne_k',
    roleKey: 'head_poct'
  },
  {
    name: 'KABASINGA Claudine',
    position: 'Head of Phlebotomy',
    email: 'kabasinga@legacyclinics.rw',
    username: 'lc_kabasinga',
    roleKey: 'head_phlebotomy'
  },
  {
    name: 'KAYITESI Edith',
    position: 'Head of Molecular Biology',
    email: 'edith@legacyclinics.rw',
    username: 'lc_edith',
    roleKey: 'head_molecular_biology'
  },
  {
    name: 'YUJITUZE Clemence',
    position: 'Lab Scientist',
    email: 'clemence@legacyclinics.rw',
    username: 'lc_clemence',
    roleKey: 'lab_scientist'
  },
  {
    name: 'NYIRIHIRWE Benjamin O. S.',
    position: 'Lab Scientist',
    email: 'benjamin@legacyclinics.rw',
    username: 'lc_benjamin',
    roleKey: 'lab_scientist'
  },
  {
    name: 'UWITONZE Ruth',
    position: 'Lab Scientist',
    email: 'uwitonze@legacyclinics.rw',
    username: 'lc_uwitonze',
    roleKey: 'lab_scientist'
  },
  {
    name: 'NZABIHIMANA Shemayi',
    position: 'Lab Scientist',
    email: 'nzabihimana@legacyclinics.rw',
    username: 'lc_nzabihimana',
    roleKey: 'lab_scientist'
  },
  {
    name: 'UWAYEZU Samantha',
    position: 'Lab Scientist',
    email: 'samantha@legacyclinics.rw',
    username: 'lc_samantha',
    roleKey: 'lab_scientist'
  },
  {
    name: 'IMANIZABAYO Jean Pierre',
    position: 'Lab Scientist',
    email: 'manizabayo@legacyclinics.rw',
    username: 'lc_manizabayo',
    roleKey: 'lab_scientist'
  },
  {
    name: 'NSENGUMUREMYI Honore',
    position: 'Lab Scientist',
    email: 'honore@legacyclinics.rw',
    username: 'lc_honore',
    roleKey: 'lab_scientist'
  },
  {
    name: 'UWUMUREMYI Fabrice',
    position: 'Micro Specialist',
    email: 'uwumuremyi@legacyclinics.rw',
    username: 'lc_uwumuremyi',
    roleKey: 'lab_micro_specialist'
  },
  {
    name: 'KWIZERA Egide',
    position: 'Lab Scientist',
    email: 'egide@legacyclinics.rw',
    username: 'lc_egide',
    roleKey: 'lab_scientist'
  },
  {
    name: 'NERISA Bayine',
    position: 'Lab Scientist',
    email: 'nerisa@legacyclinics.rw',
    username: 'lc_nerisa',
    roleKey: 'lab_scientist'
  }
];

async function main() {
  console.log('🔬 Restructuring Laboratory Roles & Personnel...');

  // 1. Ensure all Roles exist in DB
  const roleIdMap = {};
  for (const role of LAB_ROLES) {
    try {
      await db.query(
        `INSERT INTO roles (name, display_name) VALUES ($1, $2)
         ON CONFLICT(name) DO UPDATE SET display_name = EXCLUDED.display_name`,
        [role.name, role.display_name]
      );
    } catch (e) {
      console.warn(`Role insert notice (${role.name}):`, e.message);
    }
  }

  // Fetch updated role IDs
  const allRolesRes = await db.query('SELECT id, name FROM roles');
  for (const row of allRolesRes.rows) {
    roleIdMap[row.name] = row.id;
  }
  console.log('✅ Synchronized all Lab Roles in database.');

  // 2. Sync Permissions for each Lab Role
  for (const [roleName, modules] of Object.entries(ROLE_DEFAULTS)) {
    const roleId = roleIdMap[roleName];
    if (!roleId) continue;

    for (const [modName, actions] of Object.entries(modules)) {
      for (const [actionName, allowed] of Object.entries(actions)) {
        try {
          await db.query(
            `INSERT INTO role_permissions (role_id, module_name, action_name, is_allowed)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT(role_id, module_name, action_name) DO UPDATE SET is_allowed = EXCLUDED.is_allowed`,
            [roleId, modName, actionName, allowed ? 1 : 0]
          );
        } catch (e) {
          // ignore conflict
        }
      }
    }
  }
  console.log('✅ Synchronized all Role Permissions in database.');

  // 3. Upsert Laboratory Personnel
  const defaultPassword = 'Legacy@2026';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  const results = [];

  for (const p of LAB_PERSONNEL_RESTRUCTURED) {
    const roleId = roleIdMap[p.roleKey];
    if (!roleId) {
      console.error(`❌ Missing role ID for roleKey: ${p.roleKey}`);
      continue;
    }

    try {
      const existing = await db.query(
        'SELECT id, username, full_name, role_id FROM users WHERE LOWER(username) = LOWER($1)',
        [p.username]
      );

      if (existing.rows && existing.rows.length > 0) {
        const u = existing.rows[0];
        await db.query(
          `UPDATE users 
           SET full_name = $1, email = $2, role_id = $3, is_active = 1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [p.name, p.email, roleId, u.id]
        );
        results.push({
          action: 'UPDATED',
          username: p.username,
          name: p.name,
          position: p.position,
          role: p.roleKey,
          roleId
        });
      } else {
        await db.query(
          `INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, must_change_password)
           VALUES ($1, $2, $3, $4, $5, 1, 1)`,
          [p.name, p.username, p.email, passwordHash, roleId]
        );
        results.push({
          action: 'CREATED',
          username: p.username,
          name: p.name,
          position: p.position,
          role: p.roleKey,
          roleId
        });
      }
    } catch (err) {
      console.error(`❌ Error on user ${p.username}:`, err.message);
    }
  }

  console.log('\n================ LAB RESTRUCTURING SUMMARY ================');
  console.table(results);
  console.log('===========================================================\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal restructuring error:', err);
  process.exit(1);
});
