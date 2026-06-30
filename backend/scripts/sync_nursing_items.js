const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

async function syncItems() {
  const fileContent = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/DailyInventoryCheckup.jsx'), 'utf8');
  
  // Extract EXCEL_DATA block
  const match = fileContent.match(/const EXCEL_DATA = (\{[\s\S]*?\n\});/);
  if (!match) {
    console.error("Could not find EXCEL_DATA in frontend file.");
    process.exit(1);
  }
  
  let excelData;
  try {
    const jsonStr = match[1]
      .replace(/"/g, '\\"')
      .replace(/'/g, '"')
      .replace(/([{,]\s*)([a-zA-Z0-9_\/ ]+)(\s*:)/g, '$1"$2"$3')
      .replace(/\\"/g, '"');
    
    excelData = eval('(' + match[1] + ')');
  } catch (e) {
    console.error("Failed to parse EXCEL_DATA", e);
    process.exit(1);
  }

  const items = Object.keys(excelData);
  console.log(`Found ${items.length} items from Nursing portal.`);

  try {
    let { rows: deptRows } = await db.query("SELECT id FROM departments WHERE UPPER(name) = 'NURSING'");
    let deptId;
    if (deptRows.length === 0) {
      console.log("Creating NURSING department...");
      const res = await db.query("INSERT INTO departments (name, description) VALUES ('NURSING', 'Nursing Department') RETURNING id");
      deptId = res.rows[0].id;
    } else {
      deptId = deptRows[0].id;
    }
    
    for (const itemName of items) {
      const category = excelData[itemName].category || 'General';
      const measure = 'pcs';
      
      let { rows: masterRows } = await db.query("SELECT id FROM master_inventory WHERE name = $1", [itemName]);
      let masterId;
      if (masterRows.length === 0) {
        console.log(`Adding ${itemName} to master_inventory...`);
        let sku = 'LC' + itemName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
        const res = await db.query("INSERT INTO master_inventory (name, sku, unit_of_measure, category) VALUES ($1, $2, $3, $4) RETURNING id", [itemName, sku, measure, category]);
        masterId = res.rows[0].id;
      } else {
        masterId = masterRows[0].id;
      }
      
      let { rows: distRows } = await db.query("SELECT id FROM department_stock WHERE department_id = $1 AND item_id = $2", [deptId, masterId]);
      if (distRows.length === 0) {
        console.log(`Distributing ${itemName} to NURSING...`);
        await db.query("INSERT INTO department_stock (department_id, item_id, quantity) VALUES ($1, $2, 0)", [deptId, masterId]);
      }
    }
    
    console.log("Sync complete!");
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

syncItems();
