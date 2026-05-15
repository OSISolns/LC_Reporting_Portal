require('dotenv').config({ path: './backend/.env' });
const db = require('./backend/src/config/db');
const bcrypt = require('bcryptjs');

async function provision() {
  try {
    console.log('--- Running Migrations ---');
    const tablesToMock = ['incident_reports', 'cancellation_requests', 'refund_requests', 'clinical_observations', 'results_transfers'];
    for (const table of tablesToMock) {
      try {
        await db.query(`ALTER TABLE ${table} ADD COLUMN is_mock INTEGER DEFAULT 0`);
        console.log(`✅ Column "is_mock" added to ${table}.`);
      } catch (e) {
        if (e.message.includes('duplicate column name')) {
          console.log(`ℹ️ Column "is_mock" already exists in ${table}.`);
        } else {
          console.warn(`⚠️ Warning altering ${table}:`, e.message);
        }
      }
    }

    console.log('--- Provisioning Reviewer Account ---');

    // 1. Create Reviewer Role if not exists
    const roleCheck = await db.query('SELECT id, name FROM roles WHERE name = ?', ['reviewer']);
    let roleId;
    if (roleCheck.rows.length === 0) {
      const res = await db.query('INSERT INTO roles (name, display_name) VALUES (?, ?) RETURNING id', ['reviewer', 'External Reviewer']);
      roleId = res.rows[0].id;
      console.log('✅ Role "reviewer" created.');
    } else {
      roleId = roleCheck.rows[0].id;
    }

    // 2. Create Reviewer User
    const username = 'lc_reviewer';
    const password = 'Reviewer123!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const userCheck = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    let userId;
    if (userCheck.rows.length === 0) {
      await db.query(
        'INSERT INTO users (full_name, username, email, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        ['External Reviewer', username, 'reviewer@legacyclinics.rw', hash, roleId, 1]
      );
      // Get the ID
      const user = await db.query('SELECT id FROM users WHERE username = ?', [username]);
      userId = user.rows[0].id;
      console.log('✅ User "lc_reviewer" created.');
    } else {
      userId = userCheck.rows[0].id;
      await db.query('UPDATE users SET password_hash = ?, role_id = ?, is_active = 1 WHERE id = ?', [hash, roleId, userId]);
      console.log('✅ User "lc_reviewer" updated.');
    }

    // 3. Populate Mock Data
    console.log('--- Populating Mock Data ---');

    // Incidents
    await db.query(
      `INSERT INTO incident_reports (incident_type, department, area_of_incident, names_involved, pid_number, description, status, is_mock, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Clinical', 'Emergency', 'Ward A', 'John Doe (Mock Patient)', 'PID-MOCK-001', 'Test incident for review purposes.', 'pending', 1, userId]
    );

    // Cancellations
    await db.query(
      `INSERT INTO cancellation_requests (patient_full_name, pid_number, total_amount_cancelled, reason_for_cancellation, status, is_mock, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['Jane Doe (Mock)', 'PID-MOCK-002', '50000', 'Duplicate billing test', 'pending', 1, userId]
    );

    // Refunds
    await db.query(
      `INSERT INTO refund_requests (patient_full_name, pid_number, sid_number, total_amount_paid, amount_to_be_refunded, reason_for_refund, status, is_mock, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Bob Smith (Mock)', 'PID-MOCK-003', 'SID-MOCK-003', 100000, 100000, 'Test refund reason', 'pending', 1, userId]
    );

    console.log('✅ Mock data populated.');
    console.log('------------------------------------');
    console.log('Reviewer Username: lc_reviewer');
    console.log('Reviewer Password: Reviewer123!');
    console.log('------------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('❌ Provisioning failed:', err);
    process.exit(1);
  }
}

provision();
