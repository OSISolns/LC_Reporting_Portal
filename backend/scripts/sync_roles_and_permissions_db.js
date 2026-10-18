'use strict';
/**
 * Synchronize All Roles and Permissions to Active Database (db.js)
 * Reads definitions from backend/src/config/permissions.js and synchronizes
 * roles and role_permissions tables using atomic batched queries.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('../src/config/db');
const { ROLE_DEFAULTS } = require('../src/config/permissions');

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
  lab_tech: 'Laboratory Technician',
  lab: 'Laboratory Staff',
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
  radiologist: 'Radiologist',
  radiographer: 'Radiographer',
  ultrasonographer: 'Ultrasonographer',
  dentist: 'Dentist',
  dental_assistant: 'Dental Assistant',
  physiotherapist: 'Physiotherapist',
  safety_officer: 'Safety Officer',
  quality_officer: 'Quality Officer',
  infection_prevention_officer: 'Infection Prevention Officer',
  risk_manager: 'Risk Manager'
};

async function syncAllRolesAndPermissionsToDB() {
  console.log('🔄 Connecting to Active Database to synchronize roles & permissions...');

  const roles = Object.keys(ROLE_DEFAULTS);
  console.log(`Found ${roles.length} roles configured in permissions.js.`);

  // 1. Upsert Roles
  console.log('\n👥 Synchronizing roles table...');
  const roleOps = roles.map((r) => {
    const displayName = ROLE_DISPLAY_NAMES[r] || r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      sql: `INSERT INTO roles (name, display_name)
            VALUES (?, ?)
            ON CONFLICT(name) DO UPDATE SET
              display_name = excluded.display_name`,
      args: [r, displayName],
    };
  });

  for (let i = 0; i < roleOps.length; i += 50) {
    await db.batch(roleOps.slice(i, i + 50));
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
          args: [r, mod, act, isGranted],
        });
      }
    }
  }

  console.log(`📦 Applying ${permOps.length} permission entries (${totalGranted} granted) in batches...`);
  for (let i = 0; i < permOps.length; i += 100) {
    await db.batch(permOps.slice(i, i + 100));
    process.stdout.write(`\rProgress: ${Math.min(i + 100, permOps.length)} / ${permOps.length} entries written`);
  }
  console.log('\n✅ All roles and permissions successfully synchronized to active database!');
}

if (require.main === module) {
  syncAllRolesAndPermissionsToDB()
    .then(() => {
      console.log('🎉 Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Sync failed:', err);
      process.exit(1);
    });
}

module.exports = { syncAllRolesAndPermissionsToDB };
