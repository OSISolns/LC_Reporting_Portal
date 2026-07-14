'use strict';
/**
 * One-time (idempotent) reconciliation of the Nursing Daily Stock Checkup
 * (nursing_monthly_stock) with the shared inventory tables so that ALL of
 * Nursing's distributed items flow through the whole system (Consumables Log,
 * Stock Manager, distributed-stock).
 *
 *   1. Register every current Daily-Stock item missing from master_inventory.
 *   2. Upsert a NURSING (dept 121) department_stock row for every item, seeded
 *      with its latest daily closing balance (clamped at 0 — you can't
 *      distribute negative stock; the daily checkup keeps the true balance).
 *
 * Linked by exact item_name. Safe to re-run.
 */
require('dotenv').config();
const db = require('../src/config/db');
const { generateSkuPrefix } = require('../src/controllers/clinicalController');

const NURSING_DEPT_ID = 121;
const DEFAULT_UOM = 'Unit';

async function run() {
  console.log('🔄 Reconciling Nursing Daily Stock → shared inventory...');

  // Resolve NURSING department id (fallback 121)
  const { rows: deptRows } = await db.query("SELECT id FROM departments WHERE UPPER(name) = 'NURSING' LIMIT 1");
  const deptId = deptRows[0]?.id || NURSING_DEPT_ID;

  // Latest daily closing balance per item for the most recent month.
  // NOTE: db.query routes to $queryRawUnsafe only when the SQL starts with
  // SELECT/PRAGMA or contains RETURNING (db.js:268), so this must start with SELECT.
  const { rows: items } = await db.query(`
    SELECT item_name, category, balance FROM (
      SELECT item_name, category, balance,
             ROW_NUMBER() OVER (
               PARTITION BY item_name
               ORDER BY day DESC,
                 CASE WHEN UPPER(COALESCE(session,'')) LIKE '%PM%'
                        OR UPPER(COALESCE(session,'')) LIKE '%NIGHT%'
                        OR UPPER(COALESCE(session,'')) LIKE '%EVENING%' THEN 2 ELSE 1 END DESC,
                 id DESC
             ) rn
      FROM nursing_monthly_stock
      WHERE month_year = (SELECT MAX(month_year) FROM nursing_monthly_stock)
    ) ranked WHERE rn = 1 ORDER BY item_name
  `);

  console.log(`  Found ${items.length} current Daily-Stock items.`);
  let created = 0, deptCreated = 0, deptUpdated = 0;

  for (const it of items) {
    const name = (it.item_name || '').trim();
    if (!name) continue;
    const qty = Math.max(0, parseInt(it.balance, 10) || 0);

    // 1. Ensure the item exists in master_inventory (exact-name match).
    let { rows: miRows } = await db.query('SELECT id FROM master_inventory WHERE UPPER(TRIM(name)) = UPPER(TRIM($1))', [name]);
    let itemId;
    if (miRows.length > 0) {
      itemId = miRows[0].id;
    } else {
      const { rows: ins } = await db.query(
        'INSERT INTO master_inventory (name, sku, unit_of_measure, category) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, generateSkuPrefix(name), DEFAULT_UOM, it.category || 'medical_supplies']
      );
      itemId = ins[0].id;
      created++;
    }

    // 2. Upsert NURSING department_stock (batch_id NULL). NULL batch_ids don't
    //    participate in the UNIQUE(dept,item,batch) constraint, so match by
    //    (dept,item) like saveInventoryBulk's reverse sync does.
    const { rows: existing } = await db.query(
      'SELECT id FROM department_stock WHERE department_id = $1 AND item_id = $2 ORDER BY id',
      [deptId, itemId]
    );
    if (existing.length > 0) {
      await db.query('UPDATE department_stock SET quantity = $1 WHERE id = $2', [qty, existing[0].id]);
      deptUpdated++;
      if (existing.length > 1) {
        const extra = existing.slice(1).map(r => r.id);
        const ph = extra.map((_, i) => `$${i + 1}`).join(', ');
        await db.query(`UPDATE department_stock SET quantity = 0 WHERE id IN (${ph})`, extra);
      }
    } else {
      await db.query(
        'INSERT INTO department_stock (department_id, item_id, batch_id, quantity) VALUES ($1, $2, NULL, $3)',
        [deptId, itemId, qty]
      );
      deptCreated++;
    }
  }

  console.log(`✅ master_inventory: ${created} new items registered.`);
  console.log(`✅ department_stock NURSING: ${deptCreated} created, ${deptUpdated} updated.`);
  console.log('🎉 Nursing stock reconciliation complete.');
  process.exit(0);
}

run().catch(err => { console.error('💥 Reconciliation failed:', err); process.exit(1); });
