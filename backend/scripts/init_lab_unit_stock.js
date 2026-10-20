const db = require('../src/config/db');

async function initLabUnitStock() {
  console.log('🧪 Initializing Lab Unit Stock in Use tables...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS lab_unit_stock_in_use (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_name TEXT NOT NULL,
      item_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Reagents',
      quantity_in_use REAL DEFAULT 0,
      unit_of_measure TEXT DEFAULT 'pack',
      min_threshold REAL DEFAULT 5,
      storage_location TEXT DEFAULT 'Bench',
      inventory_ref_id INTEGER,
      last_consumed_at DATETIME,
      last_consumed_qty REAL DEFAULT 0,
      last_updated_by TEXT DEFAULT 'Lab Staff',
      created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )
  `);
  console.log('  ✅ Table lab_unit_stock_in_use created.');

  await db.query(`
    CREATE TABLE IF NOT EXISTS lab_unit_consumption_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_stock_id INTEGER,
      unit_name TEXT NOT NULL,
      item_name TEXT NOT NULL,
      action_type TEXT NOT NULL DEFAULT 'CONSUMPTION',
      quantity REAL NOT NULL,
      remaining_balance REAL NOT NULL,
      purpose_remarks TEXT,
      recorded_by_id INTEGER,
      recorded_by_name TEXT,
      created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )
  `);
  console.log('  ✅ Table lab_unit_consumption_logs created.');

  const { rows: countRows } = await db.query('SELECT COUNT(*) as cnt FROM lab_unit_stock_in_use');
  const count = countRows[0]?.cnt || 0;

  if (Number(count) === 0) {
    console.log('  🌱 Seeding initial stock-in-use for the 6 Laboratory Units...');

    const SEED_DATA = [
      // 1. Biochemistry
      { unit: 'Biochemistry', item: 'Assay Buf Elecsys Pro-Cell', cat: 'Reagents', qty: 12, uom: 'pcs', min: 4, loc: 'Cobas e411 Bench' },
      { unit: 'Biochemistry', item: 'Clean-Sol Elecsys Clean-Cell', cat: 'Reagents', qty: 10, uom: 'pcs', min: 4, loc: 'Cobas e411 Bench' },
      { unit: 'Biochemistry', item: 'Cobas ISE Deproteinizer', cat: 'Reagents', qty: 4, uom: 'bot', min: 2, loc: 'Cobas C311 Bench' },
      { unit: 'Biochemistry', item: 'Sysmex ISE Cleaning Solution', cat: 'Reagents', qty: 3, uom: 'bot', min: 1, loc: 'ISE Analyzer Bench' },
      { unit: 'Biochemistry', item: 'Roche Glucose Hexokinase Reagent', cat: 'Reagents', qty: 6, uom: 'kits', min: 2, loc: 'Cobas C311 Bench' },
      { unit: 'Biochemistry', item: 'Roche Creatinine Jaffé Gen.2', cat: 'Reagents', qty: 5, uom: 'kits', min: 2, loc: 'Cobas C311 Bench' },

      // 2. Hematology
      { unit: 'Hematology', item: 'Sysmex Cellpack DCL 20L', cat: 'Reagents', qty: 6, uom: 'box', min: 2, loc: 'Sysmex XN-350 Bench' },
      { unit: 'Hematology', item: 'Sysmex Fluorocell WDF', cat: 'Reagents', qty: 4, uom: 'cartridges', min: 1, loc: 'Sysmex XN-350 Bench' },
      { unit: 'Hematology', item: 'Sysmex Cellclean Solution', cat: 'Reagents', qty: 3, uom: 'bot', min: 1, loc: 'Sysmex XN-350 Bench' },
      { unit: 'Hematology', item: 'Coagulation PT Thromboplastin', cat: 'Reagents', qty: 5, uom: 'kits', min: 2, loc: 'Coagulation Bench' },
      { unit: 'Hematology', item: 'APTT Lyophilized Reagent', cat: 'Reagents', qty: 4, uom: 'kits', min: 2, loc: 'Coagulation Bench' },
      { unit: 'Hematology', item: 'Wright-Giemsa Smear Stain', cat: 'Stains & Buffers', qty: 3, uom: 'bot', min: 1, loc: 'Smear Staining Bench' },

      // 3. Microbiology
      { unit: 'Microbiology', item: 'Gram Stain Kit (4 x 250ml)', cat: 'Stains & Buffers', qty: 5, uom: 'kits', min: 2, loc: 'Gram Staining Station' },
      { unit: 'Microbiology', item: 'BacT/ALERT FA Plus Aerobic Bottles', cat: 'Specimen Containers', qty: 24, uom: 'vials', min: 10, loc: 'Blood Culture Incubator' },
      { unit: 'Microbiology', item: 'BacT/ALERT FN Plus Anaerobic Bottles', cat: 'Specimen Containers', qty: 18, uom: 'vials', min: 8, loc: 'Blood Culture Incubator' },
      { unit: 'Microbiology', item: 'Blood Agar Base Plates (Prepared)', cat: 'Consumables', qty: 30, uom: 'plates', min: 10, loc: 'Unit Refrigerator 4°C' },
      { unit: 'Microbiology', item: 'MacConkey Agar Plates (Prepared)', cat: 'Consumables', qty: 30, uom: 'plates', min: 10, loc: 'Unit Refrigerator 4°C' },
      { unit: 'Microbiology', item: 'Antibiotic Sensitivity Discs (Assorted)', cat: 'Rapid Tests', qty: 12, uom: 'cartridges', min: 4, loc: 'AMR Testing Bench' },

      // 4. Phlebotomy
      { unit: 'Phlebotomy', item: 'Vacutainer SST Gold Gel Tubes 5ml', cat: 'Specimen Containers', qty: 250, uom: 'tubes', min: 50, loc: 'Phlebotomy Station A' },
      { unit: 'Phlebotomy', item: 'Vacutainer EDTA K2 Lavender 4ml', cat: 'Specimen Containers', qty: 220, uom: 'tubes', min: 50, loc: 'Phlebotomy Station B' },
      { unit: 'Phlebotomy', item: 'Vacutainer Sodium Citrate 3.2% Light Blue', cat: 'Specimen Containers', qty: 120, uom: 'tubes', min: 30, loc: 'Phlebotomy Station A' },
      { unit: 'Phlebotomy', item: 'Alcohol Prep Pads 70% Isopropyl', cat: 'Consumables', qty: 15, uom: 'boxes', min: 5, loc: 'Draw Station Trolley' },
      { unit: 'Phlebotomy', item: 'Safety Blood Collection Needles 21G', cat: 'Consumables', qty: 10, uom: 'boxes', min: 3, loc: 'Draw Station Trolley' },
      { unit: 'Phlebotomy', item: 'Tourniquets Latex-Free', cat: 'Consumables', qty: 20, uom: 'pcs', min: 5, loc: 'Draw Station Trolley' },

      // 5. Histopathology
      { unit: 'Histopathology', item: 'Neutral Buffered Formalin 10%', cat: 'Reagents', qty: 18, uom: 'bot', min: 5, loc: 'Grossing Station Bench' },
      { unit: 'Histopathology', item: 'Paraffin Wax Histology Grade', cat: 'Consumables', qty: 10, uom: 'bags', min: 3, loc: 'Tissue Embedding Bench' },
      { unit: 'Histopathology', item: 'Hematoxylin Gill III Stain', cat: 'Stains & Buffers', qty: 4, uom: 'bot', min: 1, loc: 'H&E Staining Bench' },
      { unit: 'Histopathology', item: 'Eosin Y Aqueous Solution', cat: 'Stains & Buffers', qty: 4, uom: 'bot', min: 1, loc: 'H&E Staining Bench' },
      { unit: 'Histopathology', item: 'Biopsy Embedding Cassettes White', cat: 'Consumables', qty: 400, uom: 'pcs', min: 100, loc: 'Grossing Station Bench' },
      { unit: 'Histopathology', item: 'Microtome Blades High Profile (Pack 50)', cat: 'Consumables', qty: 6, uom: 'boxes', min: 2, loc: 'Microtome Station' },

      // 6. Molecular Biology
      { unit: 'Molecular Biology', item: 'GeneXpert MTB/RIF Cartridges', cat: 'Rapid Tests', qty: 30, uom: 'cartridges', min: 10, loc: 'GeneXpert IV Station' },
      { unit: 'Molecular Biology', item: 'Viral Load RNA Extraction Kit', cat: 'Reagents', qty: 4, uom: 'kits', min: 2, loc: 'Extraction Clean Bench' },
      { unit: 'Molecular Biology', item: 'Nuclease-Free Molecular Grade Water', cat: 'Reagents', qty: 12, uom: 'vials', min: 4, loc: 'Pre-PCR Clean Bench' },
      { unit: 'Molecular Biology', item: 'Aerosol Barrier Pipette Tips 200µl', cat: 'Consumables', qty: 10, uom: 'racks', min: 3, loc: 'Pre-PCR Clean Bench' },
      { unit: 'Molecular Biology', item: 'Aerosol Barrier Pipette Tips 10µl', cat: 'Consumables', qty: 10, uom: 'racks', min: 3, loc: 'Pre-PCR Clean Bench' },
      { unit: 'Molecular Biology', item: 'HPV High-Risk Real-Time PCR Mastermix', cat: 'Reagents', qty: 3, uom: 'kits', min: 1, loc: 'Amplification Unit Freezer -20°C' },
    ];

    for (const s of SEED_DATA) {
      await db.query(`
        INSERT INTO lab_unit_stock_in_use 
        (unit_name, item_name, category, quantity_in_use, unit_of_measure, min_threshold, storage_location, last_updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Laboratory Supervisor')
      `, [s.unit, s.item, s.cat, s.qty, s.uom, s.min, s.loc]);
    }

    console.log(`  ✅ Successfully seeded ${SEED_DATA.length} stock-in-use items across all 6 laboratory units.`);
  }

  process.exit(0);
}

initLabUnitStock().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
