const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '../.env.local' });

const localDb = new Database('../reporting-1.db');
const tursoUrl = process.env.PROD_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || process.env.lcreporting_TURSO_DATABASE_URL;
const tursoAuthToken = process.env.PROD_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || process.env.lcreporting_TURSO_AUTH_TOKEN;

const tursoClient = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken
});

async function migrate() {
  console.log('Fetching local data from reporting-1.db...');
  const departments = localDb.prepare('SELECT * FROM departments').all();
  const providers = localDb.prepare('SELECT * FROM providers').all();
  const metrics = localDb.prepare('SELECT * FROM daily_report_metrics').all();
  const procedures = localDb.prepare('SELECT * FROM daily_procedure_logs').all();

  console.log('Clearing existing Turso data for report tables...');
  await tursoClient.execute('DELETE FROM daily_procedure_logs');
  await tursoClient.execute('DELETE FROM daily_report_metrics');
  await tursoClient.execute('DELETE FROM providers');
  await tursoClient.execute('DELETE FROM departments');

  console.log(`Migrating ${departments.length} departments...`);
  const deptStmts = departments.map(d => ({
    sql: 'INSERT INTO departments (id, name) VALUES (?, ?)',
    args: [d.id, d.name]
  }));
  if (deptStmts.length) await tursoClient.batch(deptStmts, 'write');

  console.log(`Migrating ${providers.length} providers...`);
  const provStmts = providers.map(p => ({
    sql: 'INSERT INTO providers (id, name, title, department_id, is_active) VALUES (?, ?, ?, ?, ?)',
    args: [p.id, p.name, p.title, p.department_id, p.is_active]
  }));
  for (let i = 0; i < provStmts.length; i += 100) {
    await tursoClient.batch(provStmts.slice(i, i + 100), 'write');
  }

  console.log(`Migrating ${metrics.length} metrics...`);
  const metricStmts = metrics.map(m => ({
    sql: 'INSERT INTO daily_report_metrics (id, report_date, provider_id, department_id, patient_count) VALUES (?, ?, ?, ?, ?)',
    args: [m.id, m.report_date, m.provider_id, m.department_id, m.patient_count]
  }));
  for (let i = 0; i < metricStmts.length; i += 100) {
    await tursoClient.batch(metricStmts.slice(i, i + 100), 'write');
  }

  console.log(`Migrating ${procedures.length} procedures...`);
  const procStmts = procedures.map(p => ({
    sql: 'INSERT INTO daily_procedure_logs (id, report_date, metric_name, metric_value) VALUES (?, ?, ?, ?)',
    args: [p.id, p.report_date, p.metric_name, p.metric_value]
  }));
  for (let i = 0; i < procStmts.length; i += 100) {
    await tursoClient.batch(procStmts.slice(i, i + 100), 'write');
  }

  console.log('Migration complete!');
}

migrate().catch(console.error);
