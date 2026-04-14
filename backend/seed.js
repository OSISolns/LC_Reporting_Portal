'use strict';
require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const dbPassword = String(process.env.DB_PASSWORD || '');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'lc_reporting',
  user: process.env.DB_USER || 'postgres',
  password: dbPassword,
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding database...');

    // Get role IDs
    const { rows: roles } = await client.query('SELECT id, name FROM roles');
    const roleMap = roles.reduce((acc, r) => ({ ...acc, [r.name]: r.id }), {});

    const passwordHash1234 = await bcrypt.hash('1234', 10);
    const passwordHash1235 = await bcrypt.hash('1235', 10);
    const passwordHashLegacy = await bcrypt.hash('Legacy@2024', 10);

    const users = [
      // Real Customer Care / Cashier Users
      { name: 'AKALIZA Bayingana Patience', username: 'lc_patience', email: 'bayingana@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'AKIMANA Chanelle', username: 'lc_chanelle', email: 'chanelle@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'GAKUBA Denyse', username: 'lc_denyse', email: 'gakuba@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'HABIYAMBERE Olivier', username: 'lc_olivier', email: 'habiyambere@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'HAKIZAMUNGU Joseph', username: 'lc_joseph', email: 'joseph@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'KABAZAYIRE ISIMBI Lydie', username: 'lc_lydie', email: 'kabazayire@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'KAMATARI Nada Sandrine', username: 'lc_sandrine', email: 'kamatari@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'KAMUSENGO Diane', username: 'lc_diane', email: 'kamusengo@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'KAYIHURA Arnold', username: 'lc_arnold', email: 'arnold@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'KYARISIMA Rebecca', username: 'lc_rebecca', email: 'rebecca@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'MAJYAMBERE Ephraim', username: 'lc_ephraim', email: 'ephraim@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'MBABAZI Aline', username: 'lc_aline', email: 'aline@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'MUKAKAMARO Lyse', username: 'lc_lyse', email: 'lyse@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'M. GWIZA Providence', username: 'lc_provy', email: 'gwiza@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'MUTIMA Kevin', username: 'lc_kevin', email: 'mutima@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'NIYITANGA Thierry', username: 'lc_thierry', email: 'thierry@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'NIYONSHUTI Faith', username: 'lc_faith', email: 'niyonshuti@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'NYIRANSHIMIYIMANA Josiane', username: 'lc_josiane', email: 'josiane@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'RUTAGENGWA Nadine', username: 'lc_nadine', email: 'rutagengwa@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'TETA Sharon', username: 'lc_sharon', email: 'sharon@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'UMUHOZA KARAGIRE Aliane', username: 'lc_aliane', email: 'umuhoza@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'UNYUZHEZA Marie Rosine', username: 'lc_rosine', email: 'marierosine@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'USANASE ISHIMWE Sandrine', username: 'lc_sandrine_u', email: 'sandrine@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'UWAMAHORO Jacky', username: 'lc_jacky', email: 'jacky@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'UWAMAHORO Yvette', username: 'lc_yvette', email: 'yvette@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'UWIMANA Claudine', username: 'lc_claudine', email: 'uwimana@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },
      { name: 'UWINEZA Francine', username: 'lc_francine', email: 'uwineza@legacyclinics.rw', role: 'customer_care', passwordHash: passwordHash1234 },

      // Management / Higher Roles
      { name: 'BISANUKURI Evergiste', username: 'lc_bisanukuri', email: 'bisanukuri@legacyclinics.rw', role: 'quality_assurance', passwordHash: passwordHash1234 },
      { name: 'MUKUNDENTE Sofia Joyeuse', username: 'lc_sofia', email: 'sofia@legacyclinics.rw', role: 'coo', passwordHash: passwordHash1234 },
      { name: 'MUGABO Geofrey', username: 'lc_geofrey', email: 'geoffrey@legacyclinics.rw', role: 'deputy_coo', passwordHash: passwordHash1234 },
      { name: 'UWASEKURU Nadine', username: 'lc_uwasekuru', email: 'uwasekuru@legacyclinics.rw', role: 'sales_manager', passwordHash: passwordHash1234 },
      { name: 'NIYOMUGABO Valery', username: 'lc_valery', email: 'valery@legacyclinics.rw', role: 'admin', passwordHash: passwordHash1234 },
      { name: 'BOUHARI Linganwa Minega', username: 'lc_minega', email: 'linganwam@legacyclinics.rw', role: 'admin', passwordHash: passwordHash1235 },
      { name: 'UMUHOZA Nadège', username: 'lc_nadege', email: 'nadege@legacyclinics.rw', role: 'principal_cashier', passwordHash: passwordHash1234 },
      { name: 'Mr. Chairman', username: 'lc_chairman', email: 'jeanmalic@yahoo.fr', role: 'chairman', passwordHash: passwordHashLegacy },
    ];

    for (const user of users) {
      await client.query(
        `INSERT INTO users (full_name, username, email, password_hash, role_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (username) DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            role_id = EXCLUDED.role_id`,
        [user.name, user.username, user.email, user.passwordHash, roleMap[user.role]]
      );
      console.log(`✅ Created/Updated user: ${user.name} (${user.username})`);
    }

    console.log('✨ Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
