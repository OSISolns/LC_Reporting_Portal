'use strict';
/**
 * Synchronize All Roles and Permissions directly to Turso Cloud (Production DB)
 * Reads local definitions from backend/src/config/permissions.js and syncs
 * roles and role_permissions tables using atomic batched transactions.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@libsql/client');
const { ROLE_DEFAULTS } = require('../src/config/permissions');

const tursoUrl = process.env.lcreporting_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.lcreporting_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error('❌ Missing Turso credentials in backend/.env');
  process.exit(1);
}

const client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

const ROLE_DISPLAY_NAMES = {
  admin: 'System Administrator',
  logistics_manager: 'Logistics Manager',
  logistics_officer: 'Logistics Officer',
  it_officer: 'IT Officer',
  coo: 'Chief Operating Officer',
  deputy_coo: 'Deputy COO',
  chairman: 'Chairman',
  sales_manager: 'Sales Manager',
  cashier: 'Cashier',
  principal_cashier: 'Principal Cashier',
  customer_care: 'Customer Care Officer',
  lab_team_lead: 'Laboratory Team Lead',
  lab_lead: 'Laboratory Lead',
  lab_hod: 'Head of Laboratory Department',
  lab_safety_officer: 'Laboratory Safety Officer',
  lab_stock_officer: 'Laboratory Stock Officer',
  head_microbiology: 'Head of Microbiology',
  head_hematology: 'Head of Hematology',
  head_histopathology: 'Head of Histopathology / Cytology',
  head_poct: 'Head of POCT',
  head_phlebotomy: 'Head of Phlebotomy',
  head_molecular_biology: 'Head of Molecular Biology',
  lab_micro_specialist: 'Microbiology Specialist',
  lab_scientist: 'Laboratory Scientist',
  lab_manager: 'Laboratory Manager',
  quality_manager: 'Quality Manager',
  qm: 'Quality Manager (QM)',
  consultant: 'Medical Consultant',
  operations_staff: 'Operations Staff',
  operations: 'Operations Officer',
  pa: "Chairman's Personal Assistant (PA)",
  staff: 'General Staff',
  hsfp: 'Health & Safety Focal Person (HSFP)',
  nurse: 'Registered Nurse',
  rn_midwife: 'RN / Midwife',
  'chef-nurse': 'Chef Nurse',
  chief_nurse: 'Chief Nurse',
  deputy_chef_nurse: 'Deputy Chef Nurse',
  'deputy-chef-nurse': 'Deputy Chef Nurse',
  deputy_chief_nurse: 'Deputy Chef Nurse',
  'stock-manager': 'Central Store / Stock Manager',
  doctor: 'Medical Doctor',
  medical_director: 'Medical Director',
  clinical_director: 'Clinical Director',
  'procurement-manager': 'Procurement Manager',
  imaging_tech: 'Imaging Technologist (Radiographer)',
  imaging_manager: 'Imaging Department Manager',
  radiologist: 'Consultant Radiologist',
  sono: 'Sonographer (Ultrasound)',
  imaging: 'Imaging Department Staff',
  dental_hod: 'Head of Dental Department',
  dental_tech: 'Dental Technologist',
  dental_lab_manager: 'Dental Laboratory Manager',
  dental: 'Dental Department Staff',
  dentist: 'Dental Surgeon / Dentist',
  lab_tech: 'Laboratory Technologist',
  lab: 'Laboratory Staff',
  physio_manager: 'Physiotherapy Manager',
  physio: 'Physiotherapist Staff',
  physiotherapist: 'Consultant Physiotherapist',
  quality_accreditation_officer: 'Quality & Accreditation Manager'
};

const getDisplayName = (r) => {
  if (ROLE_DISPLAY_NAMES[r]) return ROLE_DISPLAY_NAMES[r];
  return r.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

async function syncAllRolesAndPermissions() {
  console.log('🚀 Connecting to Turso Cloud database...');
  await client.execute('SELECT 1');
  console.log('✅ Connected successfully.');

  // 1. Upsert Roles
  console.log('\n🎭 Synchronizing roles table...');
  const roles = Object.keys(ROLE_DEFAULTS);
  const roleOps = [];
  for (const r of roles) {
    roleOps.push({
      sql: `INSERT INTO roles (name, display_name) 
            VALUES (?, ?) 
            ON CONFLICT(name) DO UPDATE SET display_name = excluded.display_name`,
      args: [r, getDisplayName(r)]
    });
  }
  
  for (let i = 0; i < roleOps.length; i += 50) {
    await client.batch(roleOps.slice(i, i + 50), 'write');
  }
  console.log(`✅ Upserted ${roles.length} roles.`);

  // 2. Upsert Role Permissions
  console.log('\n🔒 Synchronizing role_permissions table...');
  const permOps = [];
  let totalGranted = 0;

  for (const r of roles) {
    const modules = ROLE_DEFAULTS[r];
    for (const [mod, acts] of Object.entries(modules)) {
      for (const [act, granted] of Object.entries(acts)) {
        const isGranted = granted ? 1 : 0;
        if (isGranted) totalGranted++;
        permOps.push({
          sql: `INSERT INTO role_permissions (role_name, module, action, granted, updated_by, updated_at)
                VALUES (?, ?, ?, ?, NULL, CURRENT_TIMESTAMP)
                ON CONFLICT(role_name, module, action) DO UPDATE SET
                  granted = excluded.granted,
                  updated_at = CURRENT_TIMESTAMP`,
          args: [r, mod, act, isGranted]
        });
      }
    }
  }

  console.log(`📦 Applying ${permOps.length} permission entries (${totalGranted} granted) in batches...`);
  for (let i = 0; i < permOps.length; i += 100) {
    await client.batch(permOps.slice(i, i + 100), 'write');
    process.stdout.write(`\rProgress: ${Math.min(i + 100, permOps.length)} / ${permOps.length} entries written`);
  }
  console.log('\n✅ All roles and permissions successfully synchronized to Turso Cloud production database!');
}

syncAllRolesAndPermissions()
  .catch((err) => {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  });
