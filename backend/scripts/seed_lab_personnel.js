'use strict';
require('dotenv').config();
const db = require('../src/config/db');
const bcrypt = require('bcryptjs');

const LAB_PERSONNEL = [
  // Tier 3: Laboratory Management
  {
    name: 'Thierry ZAWADI WMUVUNYI',
    username: 'lc_zawadi',
    email: 'zawadi@legacyclinics.rw',
    position: 'Head of Laboratory Department',
    roleKey: 'lab_manager',
    roleId: 3164
  },
  {
    name: 'USENGIMANA Angelique',
    username: 'lc_angelique',
    email: 'angelique@legacyclinics.rw',
    position: 'Ag Lab Manager',
    roleKey: 'lab_manager',
    roleId: 3164
  },
  {
    name: 'MWIZERWA Callixte',
    username: 'lc_calixte',
    email: 'calixte@legacyclinics.rw',
    position: 'Quality Manager',
    roleKey: 'quality_manager',
    roleId: 3193
  },

  // Tier 2: Laboratory Team Leads & Unit Heads
  {
    name: 'NZAYIYENGA Sylvestre',
    username: 'lc_sylvestre',
    email: 'sylvestre@legacyclinics.rw',
    position: 'Lab Safety Officer',
    roleKey: 'lab_team_lead',
    roleId: 37
  },
  {
    name: 'HIRWA Ganza David',
    username: 'lc_hirwa',
    email: 'hirwa@legacyclinics.rw',
    position: 'Lab stock Manager',
    roleKey: 'lab_team_lead',
    roleId: 37
  },
  {
    name: 'ABAKUNDANYE Marie Chantal',
    username: 'lc_mchantal',
    email: 'mchantal@legacyclinics.rw',
    position: 'Head of Microbiology Unit',
    roleKey: 'lab_team_lead',
    roleId: 37
  },
  {
    name: 'RAFIKI Justin',
    username: 'lc_rafiki',
    email: 'rafiki@legacyclinics.rw',
    position: 'Head of Hematology Unit',
    roleKey: 'lab_team_lead',
    roleId: 37
  },
  {
    name: 'UWAMAHORO Marie Claire',
    username: 'lc_claire',
    email: 'claire@legacyclinics.rw',
    position: 'Head of Histo, Cytology and Archive Unit',
    roleKey: 'lab_team_lead',
    roleId: 37
  },
  {
    name: 'KAGABIRWA Jeanne',
    username: 'lc_jeanne_k',
    email: 'jeanne.k@legacyclinics.rw',
    position: 'Head of POCT',
    roleKey: 'lab_team_lead',
    roleId: 37
  },
  {
    name: 'KABASINGA Claudine',
    username: 'lc_kabasinga',
    email: 'kabasinga@legacyclinics.rw',
    position: 'Head of Phlebotomy Unit',
    roleKey: 'lab_team_lead',
    roleId: 37
  },
  {
    name: 'KAYITESI Edith',
    username: 'lc_edith',
    email: 'edith@legacyclinics.rw',
    position: 'Head of Molecular Biology Unit',
    roleKey: 'lab_team_lead',
    roleId: 37
  },

  // Tier 1: Laboratory Scientists & Technologists
  {
    name: 'YUJITUZE Clemence',
    username: 'lc_clemence',
    email: 'clemence@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_tech',
    roleId: 1082
  },
  {
    name: 'NYIRIHIRWE Benjamin Olivier Seth',
    username: 'lc_benjamin',
    email: 'benjamin@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_tech',
    roleId: 1082
  },
  {
    name: 'UWITONZE Ruth',
    username: 'lc_uwitonze',
    email: 'uwitonze@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_tech',
    roleId: 1082
  },
  {
    name: 'NZABIHIMANA Shemayi',
    username: 'lc_nzabihimana',
    email: 'nzabihimana@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_tech',
    roleId: 1082
  },
  {
    name: 'UWAYEZU Samantha',
    username: 'lc_samantha',
    email: 'samantha@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_tech',
    roleId: 1082
  },
  {
    name: 'IMANIZABAYO Jean Pierre',
    username: 'lc_manizabayo',
    email: 'manizabayo@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_tech',
    roleId: 1082
  },
  {
    name: 'NSENGUMUREMYI Honore',
    username: 'lc_honore',
    email: 'honore@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_tech',
    roleId: 1082
  },
  {
    name: 'UWUMUREMYI Fabrice',
    username: 'lc_uwumuremyi',
    email: 'uwumuremyi@legacyclinics.rw',
    position: 'Micro Specialist',
    roleKey: 'lab_tech',
    roleId: 1082
  },
  {
    name: 'KWIZERA Egide',
    username: 'lc_egide',
    email: 'egide@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_tech',
    roleId: 1082
  },
  {
    name: 'NERISA Bayine',
    username: 'lc_nerisa',
    email: 'nerisa@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_tech',
    roleId: 1082
  },
  {
    name: 'ASSOUMPTA',
    username: 'lc_assoumpta',
    email: 'assoumpta@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_tech',
    roleId: 1082
  },
  {
    name: 'BERCHMAS',
    username: 'lc_berchmas',
    email: 'berchmas@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_tech',
    roleId: 1082
  },
  {
    name: 'ISHEMA',
    username: 'lc_ishema',
    email: 'ishema@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_tech',
    roleId: 1082
  },
  {
    name: 'MPINGANZIMA',
    username: 'lc_mpinganzima',
    email: 'mpinganzima@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_tech',
    roleId: 1082
  },
  {
    name: 'MUGABE',
    username: 'lc_mugabe',
    email: 'mugabe@legacyclinics.rw',
    position: 'Lab Scientist',
    roleKey: 'lab_tech',
    roleId: 1082
  }
];

async function seedLabPersonnel() {
  console.log('🧪 Starting Laboratory Personnel seeding...');

  const defaultPassword = 'Legacy@2026';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  const results = [];

  for (const person of LAB_PERSONNEL) {
    try {
      // Check if user already exists by username
      const { rows: existingUsers } = await db.query(
        'SELECT id, username, full_name, email, role_id FROM users WHERE LOWER(username) = LOWER(?)',
        [person.username]
      );

      if (existingUsers.length > 0) {
        const existing = existingUsers[0];
        await db.query(
          `UPDATE users 
           SET full_name = ?, email = ?, role_id = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [person.name, person.email, person.roleId, existing.id]
        );
        console.log(`🔄 Updated existing user: ${person.username} (${person.name}) -> Role ID: ${person.roleId}`);
        results.push({
          action: 'UPDATED',
          id: existing.id,
          username: person.username,
          name: person.name,
          email: person.email,
          role: person.roleKey
        });
      } else {
        const { rows: inserted } = await db.query(
          `INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, must_change_password)
           VALUES (?, ?, ?, ?, ?, 1, 1)`,
          [person.name, person.username, person.email, passwordHash, person.roleId]
        );
        console.log(`✅ Created new user: ${person.username} (${person.name}) -> Role ID: ${person.roleId}`);
        results.push({
          action: 'CREATED',
          username: person.username,
          name: person.name,
          email: person.email,
          role: person.roleKey
        });
      }
    } catch (err) {
      console.error(`❌ Error processing ${person.username}:`, err.message);
      results.push({
        action: 'ERROR',
        username: person.username,
        error: err.message
      });
    }
  }

  console.log('\n================ SEED SUMMARY ================');
  console.table(results);
  console.log(`Total processed: ${results.length}`);
  console.log(`Default initial password: ${defaultPassword}`);
  console.log('===============================================\n');
}

seedLabPersonnel()
  .then(() => {
    console.log('🎉 Laboratory personnel seeding completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error during seeding:', err);
    process.exit(1);
  });
