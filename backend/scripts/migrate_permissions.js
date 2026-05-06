'use strict';
require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const MODULES = [
  { name: 'cancellations',     display: 'Cancellation Requests', actions: ['view','create','edit','approve','reject'] },
  { name: 'refunds',           display: 'Refund Requests',       actions: ['view','create','edit','approve','reject'] },
  { name: 'results_transfer',  display: 'Results Transfer',      actions: ['view','create','edit','approve','reject'] },
  { name: 'incident_reports',  display: 'Incident Reports',      actions: ['view','create','edit','approve'] },
  { name: 'user_management',   display: 'User Management',       actions: ['view','create','edit','delete'] },
  { name: 'audit_logs',        display: 'Audit Logs',            actions: ['view'] },
  { name: 'reports',           display: 'Reports & Insights',    actions: ['view','download'] },
];

// Default role permissions based on existing RBAC —— true = granted
const ROLE_DEFAULTS = {
  admin: {
    cancellations:    { view:1, create:1, edit:1, approve:1, reject:1 },
    refunds:          { view:1, create:1, edit:1, approve:1, reject:1 },
    results_transfer: { view:1, create:1, edit:1, approve:1, reject:1 },
    incident_reports: { view:1, create:1, edit:1, approve:1 },
    user_management:  { view:1, create:1, edit:1, delete:1 },
    audit_logs:       { view:1 },
    reports:          { view:1, download:1 },
  },
  it_officer: {
    cancellations:    { view:0, create:0, edit:0, approve:0, reject:0 },
    refunds:          { view:0, create:0, edit:0, approve:0, reject:0 },
    results_transfer: { view:0, create:0, edit:0, approve:0, reject:0 },
    incident_reports: { view:1, create:1, edit:1, approve:1 },
    user_management:  { view:1, create:1, edit:1, delete:0 },
    audit_logs:       { view:1 },
    reports:          { view:0, download:0 },
  },
  coo: {
    cancellations:    { view:1, create:0, edit:0, approve:1, reject:1 },
    refunds:          { view:1, create:0, edit:0, approve:1, reject:1 },
    results_transfer: { view:1, create:0, edit:0, approve:1, reject:1 },
    incident_reports: { view:1, create:0, edit:0, approve:1 },
    user_management:  { view:0, create:0, edit:0, delete:0 },
    audit_logs:       { view:0 },
    reports:          { view:1, download:1 },
  },
  deputy_coo: {
    cancellations:    { view:1, create:0, edit:0, approve:1, reject:1 },
    refunds:          { view:1, create:0, edit:0, approve:1, reject:1 },
    results_transfer: { view:1, create:0, edit:0, approve:1, reject:1 },
    incident_reports: { view:1, create:0, edit:0, approve:1 },
    user_management:  { view:0, create:0, edit:0, delete:0 },
    audit_logs:       { view:0 },
    reports:          { view:1, download:1 },
  },
  chairman: {
    cancellations:    { view:1, create:0, edit:0, approve:1, reject:0 },
    refunds:          { view:1, create:0, edit:0, approve:1, reject:0 },
    results_transfer: { view:1, create:0, edit:0, approve:0, reject:0 },
    incident_reports: { view:1, create:0, edit:0, approve:1 },
    user_management:  { view:0, create:0, edit:0, delete:0 },
    audit_logs:       { view:0 },
    reports:          { view:1, download:1 },
  },
  sales_manager: {
    cancellations:    { view:1, create:0, edit:0, approve:0, reject:0 },
    refunds:          { view:1, create:0, edit:0, approve:0, reject:0 },
    results_transfer: { view:1, create:0, edit:0, approve:0, reject:0 },
    incident_reports: { view:1, create:1, edit:0, approve:0 },
    user_management:  { view:0, create:0, edit:0, delete:0 },
    audit_logs:       { view:0 },
    reports:          { view:1, download:1 },
  },
  cashier: {
    cancellations:    { view:1, create:1, edit:0, approve:0, reject:0 },
    refunds:          { view:1, create:1, edit:0, approve:0, reject:0 },
    results_transfer: { view:1, create:1, edit:0, approve:0, reject:0 },
    incident_reports: { view:1, create:1, edit:0, approve:0 },
    user_management:  { view:0, create:0, edit:0, delete:0 },
    audit_logs:       { view:0 },
    reports:          { view:0, download:0 },
  },
  principal_cashier: {
    cancellations:    { view:1, create:1, edit:0, approve:1, reject:0 },
    refunds:          { view:1, create:1, edit:0, approve:1, reject:0 },
    results_transfer: { view:1, create:0, edit:0, approve:0, reject:0 },
    incident_reports: { view:1, create:1, edit:0, approve:0 },
    user_management:  { view:0, create:0, edit:0, delete:0 },
    audit_logs:       { view:0 },
    reports:          { view:1, download:0 },
  },
  customer_care: {
    cancellations:    { view:1, create:1, edit:0, approve:0, reject:0 },
    refunds:          { view:1, create:1, edit:0, approve:0, reject:0 },
    results_transfer: { view:1, create:1, edit:0, approve:0, reject:0 },
    incident_reports: { view:1, create:1, edit:0, approve:0 },
    user_management:  { view:0, create:0, edit:0, delete:0 },
    audit_logs:       { view:0 },
    reports:          { view:0, download:0 },
  },
  quality_assurance: {
    cancellations:    { view:1, create:0, edit:0, approve:0, reject:0 },
    refunds:          { view:1, create:0, edit:0, approve:0, reject:0 },
    results_transfer: { view:1, create:0, edit:0, approve:0, reject:0 },
    incident_reports: { view:1, create:1, edit:0, approve:1 },
    user_management:  { view:0, create:0, edit:0, delete:0 },
    audit_logs:       { view:0 },
    reports:          { view:1, download:1 },
  },
  lab_team_lead: {
    cancellations:    { view:0, create:0, edit:0, approve:0, reject:0 },
    refunds:          { view:0, create:0, edit:0, approve:0, reject:0 },
    results_transfer: { view:1, create:0, edit:1, approve:1, reject:1 },
    incident_reports: { view:1, create:1, edit:0, approve:0 },
    user_management:  { view:0, create:0, edit:0, delete:0 },
    audit_logs:       { view:0 },
    reports:          { view:0, download:0 },
  },
  consultant: {
    cancellations:    { view:1, create:0, edit:0, approve:0, reject:0 },
    refunds:          { view:1, create:0, edit:0, approve:0, reject:0 },
    results_transfer: { view:1, create:0, edit:0, approve:0, reject:0 },
    incident_reports: { view:1, create:0, edit:0, approve:0 },
    user_management:  { view:0, create:0, edit:0, delete:0 },
    audit_logs:       { view:0 },
    reports:          { view:1, download:0 },
  },
  operations_staff: {
    cancellations:    { view:1, create:0, edit:0, approve:1, reject:1 },
    refunds:          { view:1, create:0, edit:0, approve:1, reject:1 },
    results_transfer: { view:1, create:0, edit:0, approve:0, reject:0 },
    incident_reports: { view:1, create:1, edit:0, approve:0 },
    user_management:  { view:0, create:0, edit:0, delete:0 },
    audit_logs:       { view:0 },
    reports:          { view:0, download:0 },
  },
};

async function migrate() {
  console.log('🔐 Running Access Master permissions migration...');

  await client.execute(`
    CREATE TABLE IF NOT EXISTS permission_modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      actions TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_name TEXT NOT NULL,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      granted INTEGER DEFAULT 0,
      updated_by INTEGER REFERENCES users(id),
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(role_name, module, action)
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS user_permission_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      granted INTEGER NOT NULL,
      reason TEXT,
      updated_by INTEGER REFERENCES users(id),
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, module, action)
    )
  `);

  // Seed modules
  for (const mod of MODULES) {
    await client.execute({
      sql: `INSERT INTO permission_modules (name, display_name, actions) 
            VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET display_name=excluded.display_name, actions=excluded.actions`,
      args: [mod.name, mod.display, JSON.stringify(mod.actions)]
    });
  }
  console.log('✅ Modules seeded');

  // Seed role defaults
  for (const [role, modules] of Object.entries(ROLE_DEFAULTS)) {
    for (const [module, actions] of Object.entries(modules)) {
      for (const [action, granted] of Object.entries(actions)) {
        await client.execute({
          sql: `INSERT INTO role_permissions (role_name, module, action, granted)
                VALUES (?, ?, ?, ?) ON CONFLICT(role_name, module, action) DO NOTHING`,
          args: [role, module, action, granted]
        });
      }
    }
  }
  console.log('✅ Role defaults seeded');
  console.log('🎉 Permissions migration complete!');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
