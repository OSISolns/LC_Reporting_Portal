'use strict';
require('dotenv').config();
const { Pool } = require('pg');
const { createClient } = require('@libsql/client');

// 1. Database Connections
const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'lc_reporting',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD, // This needs to be set in .env
});

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  try {
    console.log('🚀 Starting Data Migration: Postgres -> Turso');

    // 2. Map Users (Postgres ID -> Turso ID)
    console.log('🔍 Mapping users...');
    const { rows: pgUsers } = await pgPool.query('SELECT id, username FROM users');
    const { rows: tursoUsers } = await turso.execute('SELECT id, username FROM users');

    const usernameToTursoId = tursoUsers.reduce((acc, u) => {
      acc[u.username] = u.id;
      return acc;
    }, {});

    const pgIdToTursoId = pgUsers.reduce((acc, u) => {
      if (usernameToTursoId[u.username]) {
        acc[u.id] = usernameToTursoId[u.username];
      }
      return acc;
    }, {});

    console.log(`✅ Mapped ${Object.keys(pgIdToTursoId).length} users.`);

    // 3. Migrate Cancellation Requests
    console.log('📑 Migrating Cancellation Requests...');
    const { rows: cancellations } = await pgPool.query('SELECT * FROM cancellation_requests');
    console.log(`📊 Found ${cancellations.length} records in Postgres.`);

    for (const row of cancellations) {
      await turso.execute({
        sql: `INSERT INTO cancellation_requests (
          patient_full_name, pid_number, old_sid_number, new_sid_number, 
          telephone_number, insurance_payer, total_amount_cancelled, 
          original_receipt_number, rectified_receipt_number, 
          initial_transaction_date, rectified_date, reason_for_cancellation, 
          status, created_by, verified_by, approved_by, rejected_by,
          rejection_comment, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          row.patient_full_name, row.pid_number, row.old_sid_number, row.new_sid_number,
          row.telephone_number, row.insurance_payer, row.total_amount_cancelled,
          row.original_receipt_number, row.rectified_receipt_number,
          row.initial_transaction_date, row.rectified_date, row.reason_for_cancellation,
          row.status, 
          pgIdToTursoId[row.created_by] || null,
          pgIdToTursoId[row.verified_by] || null,
          pgIdToTursoId[row.approved_by] || null,
          pgIdToTursoId[row.rejected_by] || null,
          row.rejection_comment,
          row.created_at,
          row.updated_at
        ]
      });
    }

    // 4. Migrate Incident Reports
    console.log('🚑 Migrating Incident Reports...');
    const { rows: incidents } = await pgPool.query('SELECT * FROM incident_reports');
    console.log(`📊 Found ${incidents.length} records in Postgres.`);

    for (const row of incidents) {
      await turso.execute({
        sql: `INSERT INTO incident_reports (
          incident_type, department, area_of_incident, names_involved, 
          pid_number, description, contributing_factors, immediate_actions, 
          prevention_measures, status, created_by, reviewed_by, 
          reviewed_at, review_comments, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          row.incident_type, row.department, row.area_of_incident, row.names_involved,
          row.pid_number, row.description, row.contributing_factors, row.immediate_actions,
          row.prevention_measures, row.status,
          pgIdToTursoId[row.created_by] || null,
          pgIdToTursoId[row.reviewed_by] || null,
          row.reviewed_at, row.review_comments,
          row.created_at, row.updated_at
        ]
      });
    }

    // 5. Migrate Audit Logs
    console.log('📜 Migrating Audit Logs...');
    const { rows: logs } = await pgPool.query('SELECT * FROM audit_logs');
    console.log(`📊 Found ${logs.length} records in Postgres.`);

    for (const row of logs) {
      await turso.execute({
        sql: `INSERT INTO audit_logs (
          user_id, action, entity_type, entity_id, details, ip_address, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          pgIdToTursoId[row.user_id] || null,
          row.action, row.entity_type, row.entity_id,
          typeof row.details === 'object' ? JSON.stringify(row.details) : row.details,
          row.ip_address, row.created_at
        ]
      });
    }

    console.log('✨ Data Migration Completed Successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.message.includes('password authentication failed')) {
      console.error('👉 Please ensure DB_PASSWORD is correctly set in your .env file.');
    }
  } finally {
    await pgPool.end();
    process.exit();
  }
}

migrate();
