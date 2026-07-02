const db = require('./src/config/db');

async function test() {
  try {
    const { rows } = await db.query(`
      SELECT 
        mi.id,
        mi.name, 
        mi.sku as sku,
        COALESCE(mi.sku, '') || COALESCE(sb.lot_number, '01') as full_sku, 
        mi.unit_of_measure, 
        mi.category,
        sb.id as batch_id,
        sb.batch_number,
        sb.lot_number,
        sb.expiry_date,
        sb.created_at as purchase_time,
        sb.purchase_price as price,
        COALESCE(ds.quantity, sb.quantity, 0) as quantity,
        ds.id as dept_stock_id,
        d.name as department,
        d.id as department_id,
        v.name as vendor,
        sb.vendor_id as vendor_id
      FROM master_inventory mi
      LEFT JOIN stock_batches sb ON mi.id = sb.item_id
      LEFT JOIN department_stock ds ON ds.item_id = mi.id AND (ds.batch_id = sb.id OR (ds.batch_id IS NULL AND sb.id IS NULL))
      LEFT JOIN departments d ON ds.department_id = d.id
      LEFT JOIN vendors v ON sb.vendor_id = v.id
      WHERE mi.name LIKE '%Aquabloc%'
      ORDER BY mi.id DESC
    `);
    console.log("Full Master Inventory Response:", rows);
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

test();
