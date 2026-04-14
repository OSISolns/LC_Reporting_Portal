'use strict';
require('dotenv').config();
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function seed() {
  try {
    console.log('🌱 Starting Turso Database Initialization...');

    // 1. Create Tables (LibSQL/SQLite compatible)
    console.log('📋 Creating tables...');
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        role_id INTEGER REFERENCES roles(id),
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS incident_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_type TEXT NOT NULL,
        department TEXT NOT NULL,
        area_of_incident TEXT NOT NULL,
        names_involved TEXT,
        pid_number TEXT,
        description TEXT NOT NULL,
        contributing_factors TEXT,
        immediate_actions TEXT,
        prevention_measures TEXT,
        status TEXT DEFAULT 'pending',
        created_by INTEGER REFERENCES users(id),
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at DATETIME,
        review_comments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS cancellation_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_full_name TEXT NOT NULL,
        pid_number TEXT NOT NULL,
        old_sid_number TEXT,
        new_sid_number TEXT,
        telephone_number TEXT,
        insurance_payer TEXT,
        total_amount_cancelled TEXT,
        original_receipt_number TEXT,
        rectified_receipt_number TEXT,
        initial_transaction_date DATETIME,
        rectified_date DATETIME,
        reason_for_cancellation TEXT,
        status TEXT DEFAULT 'pending',
        created_by INTEGER REFERENCES users(id),
        verified_by INTEGER REFERENCES users(id),
        verified_at DATETIME,
        approved_by INTEGER REFERENCES users(id),
        approved_at DATETIME,
        rejected_by INTEGER REFERENCES users(id),
        rejected_at DATETIME,
        rejection_comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Seed Roles
    console.log('🎭 Seeding roles...');
    const roles = [
      ['admin', 'System Administrator'],
      ['coo', 'Chief Operating Officer'],
      ['deputy_coo', 'Deputy COO'],
      ['chairman', 'Chairman'],
      ['sales_manager', 'Sales Manager'],
      ['quality_assurance', 'Quality & Assurance'],
      ['cashier', 'Cashier'],
      ['principal_cashier', 'Principal Cashier'],
      ['customer_care', 'Customer Care']
    ];

    for (const [name, display] of roles) {
      await client.execute({
        sql: 'INSERT INTO roles (name, display_name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING',
        args: [name, display]
      });
    }

    // Get role mapping
    const { rows: dbRoles } = await client.execute('SELECT id, name FROM roles');
    const roleMap = dbRoles.reduce((acc, r) => ({ ...acc, [r.name]: r.id }), {});

    // 3. Seed Users
    console.log('👥 Seeding institutional staff accounts...');
    const passwordHash1234 = await bcrypt.hash('1234', 10);
    const passwordHash1235 = await bcrypt.hash('1235', 10);
    const passwordHashLegacy = await bcrypt.hash('Legacy@2024', 10);

    const users = [
      { name: 'AKALIZA Bayingana Patience', username: 'lc_patience', email: 'bayingana@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'AKIMANA Chanelle', username: 'lc_chanelle', email: 'chanelle@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'GAKUBA Denyse', username: 'lc_denyse', email: 'gakuba@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'HABIYAMBERE Olivier', username: 'lc_olivier', email: 'habiyambere@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'HAKIZAMUNGU Joseph', username: 'lc_joseph', email: 'joseph@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'KABAZAYIRE ISIMBI Lydie', username: 'lc_lydie', email: 'kabazayire@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'KAMATARI Nada Sandrine', username: 'lc_sandrine', email: 'kamatari@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'KAMUSENGO Diane', username: 'lc_diane', email: 'kamusengo@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'KAYIHURA Arnold', username: 'lc_arnold', email: 'arnold@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'KYARISIMA Rebecca', username: 'lc_rebecca', email: 'rebecca@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'MAJYAMBERE Ephraim', username: 'lc_ephraim', email: 'ephraim@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'MBABAZI Aline', username: 'lc_aline', email: 'aline@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'MUKAKAMARO Lyse', username: 'lc_lyse', email: 'lyse@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'M. GWIZA Providence', username: 'lc_provy', email: 'gwiza@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'MUTIMA Kevin', username: 'lc_kevin', email: 'mutima@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'NIYITANGA Thierry', username: 'lc_thierry', email: 'thierry@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'NIYONSHUTI Faith', username: 'lc_faith', email: 'niyonshuti@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'NYIRANSHIMIYIMANA Josiane', username: 'lc_josiane', email: 'josiane@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'RUTAGENGWA Nadine', username: 'lc_nadine', email: 'rutagengwa@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'TETA Sharon', username: 'lc_sharon', email: 'sharon@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'UMUHOZA KARAGIRE Aliane', username: 'lc_aliane', email: 'umuhoza@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'UNYUZHEZA Marie Rosine', username: 'lc_rosine', email: 'marierosine@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'USANASE ISHIMWE Sandrine', username: 'lc_sandrine_2', email: 'sandrine@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'UWAMAHORO Jacky', username: 'lc_jacky', email: 'jacky@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'UWAMAHORO Yvette', username: 'lc_yvette', email: 'yvette@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'UWIMANA Claudine', username: 'lc_claudine', email: 'uwimana@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'UWINEZA Francine', username: 'lc_francine', email: 'uwineza@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      
      { name: 'MUKUNDENTE Sofia Joyeuse', username: 'lc_sofia', email: 'sofia@legacyclinics.rw', role: 'coo', pass: passwordHash1234 },
      { name: 'MUGABO Geofrey', username: 'lc_geofrey', email: 'geoffrey@legacyclinics.rw', role: 'deputy_coo', pass: passwordHash1234 },
      { name: 'UWASEKURU Nadine', username: 'lc_uwasekuru', email: 'uwasekuru@legacyclinics.rw', role: 'sales_manager', pass: passwordHash1234 },
      { name: 'NIYOMUGABO Valery', username: 'lc_valery', email: 'valery@legacyclinics.rw', role: 'admin', pass: passwordHash1234 },
      { name: 'BOUHARI Linganwa Minega', username: 'lc_minega', email: 'linganwam@legacyclinics.rw', role: 'admin', pass: passwordHash1234 },
      { name: 'UMUHOZA Nadège', username: 'lc_nadege', email: 'nadege@legacyclinics.rw', role: 'principal_cashier', pass: passwordHash1234 },
      { name: 'BISANUKURI Evergiste', username: 'lc_bisanukuri', email: 'bisanukuri@legacyclinics.rw', role: 'quality_assurance', pass: passwordHash1234 },
      { name: 'Mr. Chairman', username: 'lc_chairman', email: 'jeanmalic@yahoo.fr', role: 'chairman', pass: passwordHashLegacy }
    ];

    for (const u of users) {
      await client.execute({
        sql: `INSERT INTO users (full_name, username, email, password_hash, role_id) 
              VALUES (?, ?, ?, ?, ?) 
              ON CONFLICT (username) DO UPDATE SET full_name = excluded.full_name, role_id = excluded.role_id`,
        args: [u.name, u.username, u.email, u.pass, roleMap[u.role]]
      });
      console.log(`✅ User synced: ${u.username}`);
    }

    console.log('✨ Turso Seeding Completed Successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    // client.close() if using a persistent client, but createClient in @libsql/client often handles lifecycle
  }
}

seed();
