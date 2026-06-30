'use strict';
require('dotenv').config();
const db = require('../src/config/db');

const ENCRYPTED_COLUMNS = {
  clinical_observations: ['patient_name', 'identification_json', 'triage_json', 'progress_notes_json', 'medication_mar_json', 'sbar_json'],
  patient_vitals: ['temperature', 'pulse', 'respiratory_rate', 'blood_pressure', 'weight', 'spo2', 'general_comments'],
  cancellation_requests: ['patient_full_name', 'pid_number', 'old_sid_number', 'new_sid_number', 'telephone_number', 'insurance_payer', 'reason_for_cancellation', 'rejection_comment'],
  refund_requests: ['patient_full_name', 'pid_number', 'sid_number', 'telephone_number', 'insurance_payer', 'momo_code', 'amount_paid_by', 'original_receipt_number', 'reason_for_refund', 'rejection_comment'],
  incident_reports: ['names_involved', 'pid_number', 'description', 'contributing_factors', 'immediate_actions', 'prevention_measures', 'review_comments', 'hsfp_comments', 'rca_environment', 'rca_staff', 'rca_equipment', 'rca_policy', 'rca_verification_json', 'corrective_actions_json'],
  results_transfers: ['old_sid', 'new_sid', 'reason', 'edited_by_name', 'rejection_comment'],
  internal_feedbacks: ['contact_info', 'concern_description', 'other_details'],
  it_tickets: ['title', 'description', 'reporter'],
  it_assets: ['name', 'assigned_to'],
  notifications: ['title', 'message', 'link'],
  nursing_monthly_stock: ['responsible_name', 'consumed_obs1', 'consumed_minor_surgery', 'user_obs1', 'user_minor', 'user_stn1'],
  nursing_stock_change_logs: ['updated_by', 'old_user_obs1', 'new_user_obs1', 'old_user_minor', 'new_user_minor', 'old_user_stn1', 'new_user_stn1'],
  requisitions: ['notes', 'rejection_reason'],
  safety_reports: ['title', 'executive_summary', 'key_findings', 'recommendations'],
  shift_sessions: ['handover_notes', 'flag_reasons'],
  shift_nurse_close: ['handover_sbar_sb', 'handover_sbar_ar'],
  shift_callcenter_close: ['call_top_reasons', 'followup_details'],
  shift_viplounge_close: ['vip_logs'],
  sukraa_patients: ['full_name', 'age', 'dob', 'gender', 'phone', 'insurance', 'extra_1', 'extra_2'],
  supplier_portal_sessions: ['items'],
  users: ['full_name', 'email']
};

async function run() {
  console.log('🔄 Starting transaction-based batch data encryption migration...');
  
  for (const table of Object.keys(ENCRYPTED_COLUMNS)) {
    const cols = ENCRYPTED_COLUMNS[table];
    console.log(`Processing table: ${table}...`);
    
    // Select all rows
    const selectCols = ['id', ...cols].join(', ');
    let rows;
    try {
      const result = await db.query(`SELECT ${selectCols} FROM ${table}`);
      rows = result.rows;
    } catch (err) {
      console.warn(`  ⚠️ Warning querying ${table}: ${err.message}`);
      continue;
    }
    
    // Filter rows to only keep those that need encryption
    const rowsToUpdate = rows.filter(row => {
      return cols.some(col => {
        const val = row[col];
        return val !== undefined && val !== null && typeof val === 'string' && val.trim() !== '' && !val.startsWith('enc:');
      });
    });
    
    console.log(`  Total rows: ${rows.length}, rows needing encryption: ${rowsToUpdate.length}`);
    
    if (rowsToUpdate.length === 0) {
      console.log(`  ✅ Table ${table} already fully encrypted.`);
      continue;
    }

    const setClauses = cols.map((col, idx) => `${col} = $${idx + 1}`).join(', ');
    const queryStr = `UPDATE ${table} SET ${setClauses} WHERE id = $${cols.length + 1}`;
    
    // Process in transaction batches of 1000
    const BATCH_SIZE = 1000;
    let updatedCount = 0;
    
    for (let i = 0; i < rowsToUpdate.length; i += BATCH_SIZE) {
      const chunk = rowsToUpdate.slice(i, i + BATCH_SIZE);
      const statements = chunk.map(row => {
        const args = cols.map(col => row[col]);
        args.push(row.id);
        return { sql: queryStr, args };
      });
      
      try {
        await db.batch(statements);
        updatedCount += chunk.length;
        console.log(`    Progress: ${updatedCount} / ${rowsToUpdate.length} rows encrypted...`);
      } catch (err) {
        console.error(`    ❌ Batch update failed for chunk in ${table}:`, err.message);
        // Fallback to one-by-one update for this chunk if transaction fails
        for (const row of chunk) {
          const args = cols.map(col => row[col]);
          args.push(row.id);
          try {
            await db.query(queryStr, args);
            updatedCount++;
          } catch (e) {
            console.error(`      ❌ Failed to update row id ${row.id} in ${table}:`, e.message);
          }
        }
      }
    }
    
    console.log(`  ✅ Successfully encrypted/updated ${updatedCount} rows in ${table}.`);
  }
  
  console.log('🎉 Database encryption migration complete!');
  process.exit(0);
}

run().catch(err => {
  console.error('💥 Migration script crashed:', err);
  process.exit(1);
});
