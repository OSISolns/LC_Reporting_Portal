const db = require('../src/config/db');

async function inspect() {
  const items = await db.query('SELECT id, item_name, equipment_group, department, storage_temp, storage_unit_id, quantity_in_hand FROM lab_inhand_inventory ORDER BY equipment_group, item_name');
  const rows = items.rows || items;
  console.log(`TOTAL INVENTORY ITEMS: ${rows.length}`);
  for (const r of rows) {
    console.log(`${r.id} | ${r.equipment_group} | ${r.item_name} | temp:${r.storage_temp} | unit:${r.storage_unit_id} | qty:${r.quantity_in_hand}`);
  }
  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
