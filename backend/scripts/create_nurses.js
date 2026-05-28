'use strict';
require('dotenv').config();
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const nurses = [
  { name: 'N. Mwigeme Souzan', username: 'lc_souzan', email: 'souzan@legacyclinics.rw', role: 'nurse' },
  { name: 'Ingabire N. Alexia', username: 'lc_alexia', email: 'alexia@legacyclinics.rw', role: 'nurse' },
  { name: 'KAGOYIRE Diane', username: 'lc_diane_n', email: 'diane.nurse@legacyclinics.rw', role: 'nurse' },
  { name: 'Nahoza Esther', username: 'lc_esther', email: 'esther@legacyclinics.rw', role: 'nurse' },
  { name: 'UMUHIRE Clarisse', username: 'lc_clarisse', email: 'clarisse@legacyclinics.rw', role: 'nurse' },
  { name: 'KANZAYIRE Jeanne', username: 'lc_jeanne', email: 'jeanne@legacyclinics.rw', role: 'nurse' },
  { name: 'UMUTESI Denyse', username: 'lc_denyse_n', email: 'denyse.nurse@legacyclinics.rw', role: 'nurse' },
  { name: 'Fundi N. Emmanuel', username: 'lc_emmanuel', email: 'emmanuel@legacyclinics.rw', role: 'nurse' },
  { name: 'Ruguma Jean Bosco', username: 'lc_bosco', email: 'bosco@legacyclinics.rw', role: 'nurse' },
  { name: 'MITABU JACKSON', username: 'lc_jackson', email: 'jackson@legacyclinics.rw', role: 'nurse' },
  { name: 'BAYINGANA Frank', username: 'lc_frank', email: 'frank@legacyclinics.rw', role: 'nurse' },
  { name: 'ZAHARA SOLO MUSA', username: 'lc_zahara', email: 'zahara@legacyclinics.rw', role: 'nurse' },
  { name: 'KAYIREBE A. Adelphine', username: 'lc_adelphine', email: 'adelphine@legacyclinics.rw', role: 'nurse' },
  { name: 'IRABARUTA Solange', username: 'lc_solange', email: 'solange@legacyclinics.rw', role: 'nurse' },
  { name: 'BYUKUSENGE Claudine', username: 'lc_claudine_n', email: 'claudine.nurse@legacyclinics.rw', role: 'nurse' },
  { name: 'INGABIRE Jolie Redempta', username: 'lc_jolie', email: 'jolie@legacyclinics.rw', role: 'nurse' },
  { name: 'KAYESU Jovia', username: 'lc_jovia', email: 'jovia@legacyclinics.rw', role: 'nurse' },
  { name: 'Mukantabana Dative', username: 'lc_dative', email: 'dative@legacyclinics.rw', role: 'nurse' },
  { name: 'MUGW. Rachel', username: 'lc_rachel', email: 'rachel@legacyclinics.rw', role: 'nurse' },
  { name: 'NGIRAB. Jean Bosco', username: 'lc_bosco_n', email: 'bosco.n@legacyclinics.rw', role: 'nurse' },
  { name: 'UWIZEYE Anne Grace', username: 'lc_anne', email: 'anne@legacyclinics.rw', role: 'nurse' },
  { name: 'MUKAMA Emile', username: 'lc_emile', email: 'emile@legacyclinics.rw', role: 'chef-nurse' },
  { name: 'MAZIMPAKA Noel', username: 'lc_noel', email: 'noel@legacyclinics.rw', role: 'nurse' },
  { name: 'KASINE Salama', username: 'lc_salama', email: 'salama@legacyclinics.rw', role: 'nurse' },
  { name: 'KAMIKAZI Pamella', username: 'lc_pamella', email: 'pamella@legacyclinics.rw', role: 'nurse' },
  { name: 'MUGENI Christine', username: 'lc_christine', email: 'christine@legacyclinics.rw', role: 'nurse' },
  { name: 'UWIMANA AGNES', username: 'lc_agnes', email: 'agnes@legacyclinics.rw', role: 'nurse' },
  { name: 'UMUTONIWASE AISHA', username: 'lc_aisha', email: 'aisha@legacyclinics.rw', role: 'nurse' },
  { name: 'BUTERA Aimable', username: 'lc_aimable', email: 'aimable@legacyclinics.rw', role: 'nurse' },
  { name: 'UMUHOZA Diane Fossey', username: 'lc_fossey', email: 'fossey@legacyclinics.rw', role: 'nurse' }
];

async function run() {
  try {
    console.log('🌱 Starting Seeding of 30 Nursing Staff Members...');
    
    // Get role mapping
    const { rows: dbRoles } = await client.execute('SELECT id, name FROM roles');
    const roleMap = dbRoles.reduce((acc, r) => ({ ...acc, [r.name]: r.id }), {});

    const passwordHash1234 = await bcrypt.hash('1234', 10);
    let createdCount = 0;
    let updatedCount = 0;

    for (const nurse of nurses) {
      const roleId = roleMap[nurse.role];
      if (!roleId) {
        console.error(`❌ Role ${nurse.role} not found in database for user ${nurse.name}`);
        continue;
      }

      const { rows: exists } = await client.execute({
        sql: 'SELECT id FROM users WHERE username = ?',
        args: [nurse.username]
      });

      if (exists.length > 0) {
        await client.execute({
          sql: 'UPDATE users SET full_name = ?, email = ?, role_id = ? WHERE username = ?',
          args: [nurse.name, nurse.email, roleId, nurse.username]
        });
        console.log(`🔄 Updated existing nursing user: ${nurse.username} (${nurse.name})`);
        updatedCount++;
      } else {
        await client.execute({
          sql: 'INSERT INTO users (full_name, username, email, password_hash, role_id) VALUES (?, ?, ?, ?, ?)',
          args: [nurse.name, nurse.username, nurse.email, passwordHash1234, roleId]
        });
        console.log(`✨ Created new nursing user: ${nurse.username} (${nurse.name})`);
        createdCount++;
      }
    }

    console.log(`\n🎉 Nursing Staff Seeding Completed!`);
    console.log(`Created: ${createdCount}`);
    console.log(`Updated: ${updatedCount}`);
  } catch (err) {
    console.error('❌ Failed to seed nursing users:', err);
  }
}

run();
