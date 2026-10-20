'use strict';
/**
 * Laboratory Personnel & Roles Seeder for Turso Cloud
 * Seeds all Laboratory personnel and synchronizes Lab roles directly to Turso using @libsql/client.
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

const LAB_PERSONNEL = [
  // 1. Leadership & Unit Heads
  {
    name: 'Thierry ZAWADI MUVUNYI',
    username: 'lc_zawadi',
    email: 'zawadi@legacyclinics.rw',
    position: 'Head of Laboratory Department',
    roleKey: 'lab_hod'
  },
  {
    name: 'USENGIMANA Angelique',
    username: 'lc_angelique',
    email: 'angelique@legacyclinics.rw',
    position: 'Ag Lab Manager',
    roleKey: 'lab_manager'
  },
  {
    name: 'MWIZERWA Callixte',
    username: 'lc_calixte',
    email: 'calixte@legacyclinics.rw',
    position: 'Quality Manager',
    roleKey: 'quality_manager'
  },
  {
    name: 'Mwizerwa Callixte',
    username: 'lc_callixte',
    email: 'calixte@legacyclinics.rw',
    position: 'Quality Manager',
    roleKey: 'quality_manager'
  },
  {
    name: 'NZAYIYENGA Sylvestre',
    username: 'lc_sylvestre',
    email: 'sylvestre@legacyclinics.rw',
    position: 'Lab Safety Officer',
    roleKey: 'lab_safety_officer'
  },
  {
    name: 'HIRWA Ganza David',
    username: 'lc_hirwa',
    email: 'hirwa@legacyclinics.rw',
    position: 'Lab stock Manager',
    roleKey: 'lab_stock_officer'
  },
  {
    name: 'ABAKUNDANYE Marie Chantal',
    username: 'lc_mchantal',
    email: 'mchantal@legacyclinics.rw',
    position: 'Head of Microbiology Unit',
    roleKey: 'head_microbiology'
  },
  {
    name: 'RAFIKI Justin',
    username: 'lc_rafiki',
    email: 'rafiki@legacyclinics.rw',
    position: 'Head of Hematology Unit',
    roleKey: 'head_hematology'
  },
  {
    name: 'UWAMAHORO Marie Claire',
    username: 'lc_claire',
    email: 'claire@legacyclinics.rw',
    position: 'Head of Histo, Cytology and Archive Unit',
    roleKey: 'head_histopathology'
  },
  {
    name: 'KAGABIRWA Jeanne',
    username: 'lc_jeanne_k',
    email: 'jeanne.k@legacyclinics.rw',
    position: 'Head of POCT',
    roleKey: 'head_poct'
  },
  {
    name: 'KABASINGA Claudine',
    username: 'lc_kabasinga',
    email: 'kabasinga@legacyclinics.rw',
    position: 'Head of Phlebotomy Unit',
    roleKey: 'head_phlebotomy'
  },
  {
    name: 'KAYITESI Edith',
    username: 'lc_edith',
    email: 'edith@legacyclinics.rw',
    position: 'Head of Molecular Biology Unit',
    roleKey: 'head_molecular_biology'
  },

  // 2. Laboratory Scientists & Technologists
  {
    name: 'YUJITUZE Clemence',
    username: 'lc_clemence',
    email: 'clemence@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_scientist'
  },
  {
    name: 'NYIRIHIRWE Benjamin Olivier Seth',
    username: 'lc_benjamin',
    email: 'benjamin@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_scientist'
  },
  {
    name: 'UWITONZE Ruth',
    username: 'lc_uwitonze',
    email: 'uwitonze@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_scientist'
  },
  {
    name: 'NZABIHIMANA Shemayi',
    username: 'lc_nzabihimana',
    email: 'nzabihimana@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_scientist'
  },
  {
    name: 'UWAYEZU Samantha',
    username: 'lc_samantha',
    email: 'samantha@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_scientist'
  },
  {
    name: 'IMANIZABAYO Jean Pierre',
    username: 'lc_manizabayo',
    email: 'manizabayo@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_scientist'
  },
  {
    name: 'NSENGUMUREMYI Honore',
    username: 'lc_honore',
    email: 'honore@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_scientist'
  },
  {
    name: 'UWUMUREMYI Fabrice',
    username: 'lc_uwumuremyi',
    email: 'uwumuremyi@legacyclinics.rw',
    position: 'Microbiology Specialist',
    roleKey: 'lab_micro_specialist'
  },
  {
    name: 'KWIZERA Egide',
    username: 'lc_egide',
    email: 'egide@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_scientist'
  },
  {
    name: 'NERISA Bayine',
    username: 'lc_nerisa',
    email: 'nerisa@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_scientist'
  },
  {
    name: 'ASSOUMPTA',
    username: 'lc_assoumpta',
    email: 'assoumpta@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_scientist'
  },
  {
    name: 'BERCHMAS',
    username: 'lc_berchmas',
    email: 'berchmas@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_scientist'
  },
  {
    name: 'ISHEMA',
    username: 'lc_ishema',
    email: 'ishema@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_scientist'
  },
  {
    name: 'MPINGANZIMA',
    username: 'lc_mpinganzima',
    email: 'mpinganzima@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_scientist'
  },
  {
    name: 'MUGABE',
    username: 'lc_mugabe',
    email: 'mugabe@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_scientist'
  },

  // 3. Generic Hub Account
  {
    name: 'Laboratory Team Lead',
    username: 'lc_lab',
    email: 'laboratory@legacyclinics.rw',
    position: 'Lab Team Lead',
    roleKey: 'lab_team_lead'
  }
];

async function seedLabToTurso() {
  console.log('🚀 Connecting directly to Turso Cloud at:', tursoUrl);
  const testRes = await turso.execute('SELECT 1 as connected');
  if (!testRes.rows || testRes.rows.length === 0) {
    throw new Error('Could not connect to Turso Cloud');
  }
  console.log('✅ Connected to Turso Cloud successfully.');

  // 1. Ensure all Roles exist in Turso
  console.log('🎭 Ensuring Laboratory roles in Turso...');
  for (const r of LAB_ROLES) {
    await turso.execute({
      sql: `INSERT INTO roles (name, display_name) VALUES (?, ?)
            ON CONFLICT (name) DO UPDATE SET display_name = excluded.display_name`,
      args: [r.name, r.display_name]
    });
  }

  // 2. Fetch role IDs map from Turso
  const rolesRes = await turso.execute('SELECT id, name FROM roles');
  const roleIdMap = {};
  for (const row of rolesRes.rows) {
    roleIdMap[row.name] = row.id;
  }
  console.log(`✅ Roles verified (${Object.keys(roleIdMap).length} total roles in DB).`);

  // 3. Sync permissions for Lab Roles
  console.log('🔒 Synchronizing Laboratory role permissions in Turso...');
  const permOps = [];
  for (const [roleName, modules] of Object.entries(ROLE_DEFAULTS)) {
    if (!roleIdMap[roleName]) continue;

    for (const [modName, actions] of Object.entries(modules)) {
      for (const [actionName, allowed] of Object.entries(actions)) {
        permOps.push({
          sql: `INSERT INTO role_permissions (role_name, module, action, granted)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (role_name, module, action) DO UPDATE SET granted = excluded.granted`,
          args: [roleName, modName, actionName, allowed ? 1 : 0]
        });
      }
    }
  }

  // Execute permissions in batches of 50
  for (let i = 0; i < permOps.length; i += 50) {
    const chunk = permOps.slice(i, i + 50);
    await turso.batch(chunk, 'write');
  }
  console.log(`✅ Synchronized ${permOps.length} permission entries for Lab roles.`);

  // 4. Seed Laboratory Personnel
  const defaultPassword = 'Legacy@2026';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  console.log('👥 Seeding laboratory personnel accounts...');
  const results = [];

  for (const person of LAB_PERSONNEL) {
    const roleId = roleIdMap[person.roleKey];
    if (!roleId) {
      console.error(`❌ Missing role ID for roleKey: ${person.roleKey}`);
      results.push({ username: person.username, name: person.name, status: 'ERROR', message: `Unknown role ${person.roleKey}` });
      continue;
    }

    try {
      const existingRes = await turso.execute({
        sql: 'SELECT id, username, full_name, email, role_id FROM users WHERE LOWER(username) = LOWER(?)',
        args: [person.username]
      });

      const encFullName = encryptField(person.name);
      const encEmail = encryptField(person.email);

      if (existingRes.rows && existingRes.rows.length > 0) {
        const existing = existingRes.rows[0];
        await turso.execute({
          sql: `UPDATE users 
                SET full_name = ?, email = ?, password_hash = ?, role_id = ?, is_active = 1, must_change_password = 0, failed_attempts = 0, lockout_until = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
          args: [encFullName, encEmail, passwordHash, roleId, existing.id]
        });
        console.log(`🔄 Updated user: ${person.username} (${person.name}) -> Role: ${person.roleKey} (RoleID: ${roleId})`);
        results.push({
          username: person.username,
          name: person.name,
          role: person.roleKey,
          status: 'UPDATED',
          id: existing.id
        });
      } else {
        const insertRes = await turso.execute({
          sql: `INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, must_change_password, failed_attempts, lockout_until)
                VALUES (?, ?, ?, ?, ?, 1, 0, 0, NULL)`,
          args: [encFullName, person.username, encEmail, passwordHash, roleId]
        });
        console.log(`✅ Created user: ${person.username} (${person.name}) -> Role: ${person.roleKey} (RoleID: ${roleId})`);
        results.push({
          username: person.username,
          name: person.name,
          role: person.roleKey,
          status: 'CREATED',
          id: Number(insertRes.lastInsertRowid)
        });
      }
    } catch (err) {
      console.error(`❌ Error processing ${person.username}:`, err.message);
      results.push({
        username: person.username,
        name: person.name,
        role: person.roleKey,
        status: 'FAILED',
        error: err.message
      });
    }
  }

  console.log('\n================ TURSO SEED SUMMARY ================');
  console.table(results);
  console.log(`Total personnel processed: ${results.length}`);
  console.log(`Default credentials: Username = [username], Password = ${defaultPassword}`);
  console.log('====================================================\n');
}

seedLabToTurso()
  .then(() => {
    console.log('🎉 Laboratory users successfully seeded to Turso Cloud!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Fatal error seeding Laboratory users:', err);
    process.exit(1);
  });
