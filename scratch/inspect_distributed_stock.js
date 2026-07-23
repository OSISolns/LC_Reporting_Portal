const db = require('../backend/src/config/db');

async function run() {
  try {
    const include_central = 'true';
    let sql = `
      SELECT * FROM (
        SELECT
          ds.id as dept_stock_id,
          ds.department_id,
          d.name as department,
          mi.id as item_id,
          mi.name,
          mi.sku,
          mi.unit_of_measure,
          mi.category,
          ds.batch_id,
          sb.batch_number,
          sb.lot_number,
          sb.expiry_date,
          sb.created_at as purchase_time,
          sb.purchase_price as price,
          ds.quantity,
          v.name as vendor
        FROM department_stock ds
        JOIN master_inventory mi ON ds.item_id = mi.id
        LEFT JOIN stock_batches sb ON ds.batch_id = sb.id
        LEFT JOIN departments d ON ds.department_id = d.id
        LEFT JOIN vendors v ON sb.vendor_id = v.id
        WHERE ds.quantity > 0
          AND (d.name IS NULL OR (d.name NOT LIKE '%Central%' AND d.name NOT LIKE '%Store%'))
    `;

    if (include_central === 'true') {
      sql += `
      UNION ALL
      SELECT
        sb.id as dept_stock_id,
        130 as department_id,
        'CENTRAL STORE' as department,
        mi.id as item_id,
        mi.name,
        mi.sku,
        mi.unit_of_measure,
        mi.category,
        sb.id as batch_id,
        sb.batch_number,
        sb.lot_number,
        sb.expiry_date,
        sb.created_at as purchase_time,
        sb.purchase_price as price,
        sb.quantity,
        v.name as vendor
      FROM stock_batches sb
      JOIN master_inventory mi ON sb.item_id = mi.id
      LEFT JOIN vendors v ON sb.vendor_id = v.id
      WHERE sb.quantity > 0
      `;
    }

    sql += ') AS stock_combined ORDER BY department ASC, name ASC';

    const { rows } = await db.query(sql);
    
    console.log("Total rows with UNION:", rows.length);
    const depts = {};
    for (const r of rows) {
      depts[r.department] = (depts[r.department] || 0) + 1;
    }
    console.log("Counts per department:", depts);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
