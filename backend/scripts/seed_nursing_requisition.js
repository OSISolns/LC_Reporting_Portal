'use strict';
const db = require('../src/config/db');

const itemsData = [
  { name: "Adrenaline 1mg", qty: 84, exp: "06/2027" },
  { name: "Adrenaline 1mg (Batch 2)", qty: 5, exp: "06/2028" },
  { name: "Aiguille (Needle) G21", qty: 25, exp: "03/2030" },
  { name: "Aiguille (Needle) G23", qty: 75, exp: "02/2029" },
  { name: "Aquabloc 15cm x 10", qty: 4, exp: "05/2028" },
  { name: "Atropine", qty: 2, exp: "10/2027" },
  { name: "B complex", qty: 11, exp: "04/2028" },
  { name: "Buscopan 10mg", qty: 21, exp: "01/2028" },
  { name: "Buscopan 20mg", qty: 25, exp: "01/2028" },
  { name: "Catheter IV G16", qty: 25, exp: "09/2027" },
  { name: "Catheter IV G18", qty: 289, exp: "03/2027" },
  { name: "Catheter IV G18", qty: 129, exp: "03/2027" },
  { name: "Catheter IV G20", qty: 70, exp: "08/2029" },
  { name: "Catheter IV G20 (Batch 2)", qty: 61, exp: "05/2027" },
  { name: "Catheter IV G22", qty: 10, exp: "03/2028" },
  { name: "Catheter IV G22 (Batch 2)", qty: 220, exp: "02/2029" },
  { name: "Catheter IV G24", qty: 203, exp: "12/2029" },
  { name: "Ceftriaxone 1g", qty: 32, exp: "11/2028" },
  { name: "Chlorpromazine 25 mg", qty: 1, exp: "03/2028" },
  { name: "Crepe bandage 10 cm", qty: 13, exp: "07/2030" },
  { name: "Crepe bandage 15 cm", qty: 1, exp: "07/2030" },
  { name: "Crepe bandage 15 cm", qty: 13, exp: "08/2030" },
  { name: "Crepe bandage 7.5 cm", qty: 17, exp: "05/2030" },
  { name: "Dexamethasone", qty: 36, exp: "06/2028" },
  { name: "Dexamethasone", qty: 30, exp: "06/2028" },
  { name: "Dextrose 50%", qty: 18, exp: "03/2028" },
  { name: "Diazepam 10mg", qty: 4, exp: "10/2028" },
  { name: "Diclofenac 75mg", qty: 29, exp: "02/2029" },
  { name: "Diclofenac suppo 100mg", qty: 51, exp: "04/2028" },
  { name: "Dicynone 250mg", qty: 4, exp: "04/2029" },
  { name: "Eau Oxygene", qty: 10, exp: "11/2027" },
  { name: "Emetine", qty: 22, exp: "04/2028" },
  { name: "Face mask oxygen adult", qty: 24, exp: "11/2027" },
  { name: "Face masque Ped", qty: 9, exp: "05/2027" },
  { name: "Fentanyl", qty: 14, exp: "08/2028" },
  { name: "Foley Catheter Size 10", qty: 8, exp: "04/2027" },
  { name: "Foley Catheter Size 16", qty: 10, exp: "12/2030" },
  { name: "Foley Catheter Size 18", qty: 9, exp: "12/2029" },
  { name: "Fragyl", qty: 2, exp: "10/2026" },
  { name: "Furosemide", qty: 10, exp: "07/2027" },
  { name: "Gants propre", qty: 400, exp: "N/A" },
  { name: "Gloves (sterile) Size 7.5 cm", qty: 125, exp: "08/2030" },
  { name: "Gloves (sterile) Size 8 cm", qty: 100, exp: "01/2028" },
  { name: "Hydralazine 20mg", qty: 1, exp: "10/2026" },
  { name: "Hydrocortisone 100mg", qty: 13, exp: "08/2028" },
  { name: "IV Catheter (polyway)", qty: 40, exp: "08/2028" },
  { name: "Lidocaine", qty: 25, exp: "06/2028" },
  { name: "Marcaine", qty: 4, exp: "01/2028" },
  { name: "Masque Neb Ad", qty: 14, exp: "11/2027" },
  { name: "Masque Neb Ped", qty: 18, exp: "05/2030" },
  { name: "Metoclopramide", qty: 20, exp: "02/2028" },
  { name: "Metronidazole 100ml", qty: 2, exp: "10/2026" },
  { name: "Midazolam", qty: 5, exp: "04/2029" },
  { name: "Morphine", qty: 10, exp: "03/2027" },
  { name: "Naloxone", qty: 1, exp: "08/2027" },
  { name: "Nasal oxygen cannula adult", qty: 2, exp: "09/2027" },
  { name: "Nasal oxygen cannula ped", qty: 12, exp: "09/2027" },
  { name: "Nylon 2-0", qty: 33, exp: "09/2029" },
  { name: "Nylon 3-0", qty: 51, exp: "05/2029" },
  { name: "Nylon 4-0", qty: 37, exp: "07/2029" },
  { name: "Nylon 5-0", qty: 12, exp: "09/2029" },
  { name: "Omeprazole", qty: 28, exp: "02/2028" },
  { name: "Pantoprazole", qty: 2, exp: "11/2027" },
  { name: "Pap-Smear", qty: 10, exp: "01/2031" },
  { name: "Paracetamol 125mg", qty: 54, exp: "04/2029" },
  { name: "Paracetamol 250mg", qty: 33, exp: "04/2028" },
  { name: "Paracetamol cp's 500mg", qty: 30, exp: "05/2028" },
  { name: "Paraffin gauze", qty: 233, exp: "01/2027" },
  { name: "Pause 5ml", qty: 10, exp: "03/2027" },
  { name: "Pethidine", qty: 6, exp: "01/2027" },
  { name: "Phenobarbital 100mg", qty: 5, exp: "09/2027" },
  { name: "Phenytoin 5ml", qty: 2, exp: "03/2027" },
  { name: "Povidone", qty: 5, exp: "07/2028" },
  { name: "Propofol", qty: 9, exp: "11/2027" },
  { name: "Phytomenadione (Phytomenadione) 10mg", qty: 3, exp: "04/2027" },
  { name: "Sac A urine", qty: 18, exp: "04/2030" },
  { name: "Salbutamol 2.5mg", qty: 40, exp: "02/2027" },
  { name: "Seringue (Syringe) 10cc", qty: 116, exp: "08/2030" },
  { name: "Seringue (Syringe) 5cc", qty: 167, exp: "04/2030" },
  { name: "Sterile Gauze 10 cm x 10", qty: 101, exp: "12/2028" },
  { name: "Sterile swabs", qty: 70, exp: "11/2031" },
  { name: "Suction tube Size 18", qty: 1, exp: "03/2029" },
  { name: "Sulfate de Magnesium", qty: 1, exp: "10/2026" },
  { name: "Surgical blades G22", qty: 100, exp: "05/2028" },
  { name: "Surgical blades G23", qty: 90, exp: "11/2029" },
  { name: "Syringe 10ml", qty: 28, exp: "08/2030" },
  { name: "Syringe 1ml", qty: 8, exp: "05/2027" },
  { name: "Syringe 20ml", qty: 85, exp: "07/2030" },
  { name: "Syringe 3ml", qty: 5, exp: "11/2026" },
  { name: "Syringe 5ml", qty: 9, exp: "03/2030" },
  { name: "Tramadol", qty: 12, exp: "10/2026" },
  { name: "Trousse", qty: 16, exp: "02/2030" },
  { name: "Tube Mauve", qty: 18, exp: "01/2030" },
  { name: "Tube rouge", qty: 84, exp: "01/2030" },
  { name: "Vicryl 1-0", qty: 5, exp: "08/2030" },
  { name: "Vicryl 2-0", qty: 25, exp: "02/2027" },
  { name: "Vicryl 3-0", qty: 34, exp: "05/2030" },
  { name: "Vicryl 3-0", qty: 12, exp: "02/2031" },
  { name: "Vicryl 4-0", qty: 16, exp: "05/2030" },
  { name: "Vicryl 5-0", qty: 44, exp: "09/2030" },
  { name: "Vicryl 6-0", qty: 18, exp: "02/2029" },
  { name: "Water for injection", qty: 87, exp: "10/2026" },
  { name: "Water for injection", qty: 50, exp: "08/2027" }
];

async function seedRequisition() {
  console.log('🚀 Starting Nursing Requisition Creation in Turso Database...');
  
  // 1. Get Nursing Department ID (Name = 'NURSING')
  const deptRes = await db.query("SELECT id FROM departments WHERE UPPER(name) = 'NURSING' LIMIT 1");
  let deptId = deptRes.rows[0]?.id;
  if (!deptId) {
    const insertDept = await db.query("INSERT INTO departments (name) VALUES ('NURSING') RETURNING id");
    deptId = insertDept.rows[0].id;
  }
  console.log(`📌 Target Department: NURSING (ID: ${deptId})`);

  // 2. Ensure each item exists in master_inventory (or fetch existing ID)
  const resolvedItems = [];
  for (const item of itemsData) {
    const cleanName = item.name.trim();
    // Search case-insensitive
    const existRes = await db.query("SELECT id FROM master_inventory WHERE UPPER(name) = UPPER($1) LIMIT 1", [cleanName]);
    let itemId = existRes.rows[0]?.id;

    if (!itemId) {
      // Create sku
      const prefix = cleanName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const sku = `${prefix}${randNum}`;
      
      const insertItem = await db.query(
        "INSERT INTO master_inventory (name, sku, category, unit_of_measure) VALUES ($1, $2, 'consumables', 'pcs') RETURNING id",
        [cleanName, sku]
      );
      itemId = insertItem.rows[0].id;
      console.log(`  ➕ Created master_inventory item: ${cleanName} (ID: ${itemId}, SKU: ${sku})`);
    }

    resolvedItems.push({
      item_id: itemId,
      name: cleanName,
      qty: item.qty,
      exp: item.exp
    });
  }

  // 3. Create the Requisition row (Status = 'Pending', Urgency = 'Normal')
  const noteText = `Nursing Department Consumables & Stock Replenishment Requisition (${itemsData.length} items batch request - pending Stock Manager approval)`;
  const reqRes = await db.query(
    "INSERT INTO requisitions (department_id, urgency, status, notes, created_by_name) VALUES ($1, 'Normal', 'Pending', $2, 'Nurse-in-Charge / Nursing Dept') RETURNING id",
    [deptId, noteText]
  );
  const requisitionId = reqRes.rows[0].id;
  console.log(`\n✅ Created Requisition Header (ID: ${requisitionId}, Status: Pending)`);

  // 4. Insert all requisition_items
  let totalQty = 0;
  for (const rItem of resolvedItems) {
    await db.query(
      "INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date) VALUES ($1, $2, $3, 0, $4)",
      [requisitionId, rItem.item_id, rItem.qty, rItem.exp]
    );
    totalQty += rItem.qty;
  }

  console.log(`🎉 Successfully inserted ${resolvedItems.length} line items (Total Quantity: ${totalQty} units) into requisition_items for Requisition #${requisitionId}!`);
}

seedRequisition()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error creating requisition:', err);
    process.exit(1);
  });
