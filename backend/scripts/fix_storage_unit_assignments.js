const db = require('../src/config/db');

async function fixStorageUnits() {
  console.log('🔄 Re-mapping lab inventory items to correct Fridges, Freezers and Room Temp units...');

  // 1. Ensure all 10 standard storage units exist in lab_storage_units
  const units = [
    { id: 'fridge_biochem', label: 'Refrigerator 1 - Biochemistry & ECLIA Reagents', type: 'fridge', temp_range: '2°C to 8°C' },
    { id: 'fridge_hema', label: 'Refrigerator 2 - Hematology & Blood Bank Controls', type: 'fridge', temp_range: '2°C to 8°C' },
    { id: 'fridge_micro', label: 'Refrigerator 3 - Microbiology & VITEK 2 Cards', type: 'fridge', temp_range: '2°C to 8°C' },
    { id: 'fridge_serology', label: 'Refrigerator 4 - Serology & Rapid Diagnostic Kits', type: 'fridge', temp_range: '2°C to 8°C' },
    { id: 'fridge_samples', label: 'Refrigerator 5 - Clinical Specimen Pre/Post-Hold', type: 'fridge', temp_range: '2°C to 8°C' },
    { id: 'freezer_controls', label: 'Deep Freezer 1 - Lyophilized QC & Calibrators', type: 'freezer', temp_range: '-20°C to -80°C' },
    { id: 'room_temp_biochem', label: 'Room Temp Shelf 1 - Biochemistry Wash & Diluents', type: 'room_temp', temp_range: '20°C to 25°C' },
    { id: 'room_temp_hema', label: 'Room Temp Cabinet 2 - Hematology Dyes & Lysing', type: 'room_temp', temp_range: '20°C to 25°C' },
    { id: 'room_temp_micro', label: 'Room Temp Bench 3 - Microbiology Saline & Consumables', type: 'room_temp', temp_range: '20°C to 25°C' },
    { id: 'room_temp_general', label: 'Room Temp Rack 4 - General Diagnostic Consumables', type: 'room_temp', temp_range: '20°C to 25°C' }
  ];

  for (const u of units) {
    await db.query(
      `INSERT INTO lab_storage_units (id, label, type, temp_range, status)
       VALUES (?, ?, ?, ?, 'active')
       ON CONFLICT(id) DO UPDATE SET label = EXCLUDED.label, type = EXCLUDED.type, temp_range = EXCLUDED.temp_range, status = 'active'`,
      [u.id, u.label, u.type, u.temp_range]
    );
  }

  // 2. Re-map items based on clinical laboratory standards:

  // Refrigerator 1: Biochemistry & ECLIA Reagents (Cobas C311 tests, Cobas e411 ECLIA packs, CD8)
  const fridgeBiochemItems = [
    'Cobas Integra ALB Gen 2, 300 Tests (Blood)',
    'Cobas Integra TP Gen.2, 300 tests',
    'CREAJ Gen.2, 700Test, cobas c, Integra',
    'MG Gen II, 250 tests, Cobas 6000',
    'ISE Standard high 10x3 ml',
    'ISE Standard low 10x3 ml',
    'Elecsys Anti-HBs Gen 2',
    'Elecsys Anti-HCV II Gen 2 100',
    'Elecsys Anti-HIV',
    'Elecsys FT4',
    'Elecsys TSH 200 Tests',
    'CD8 Reagent (Mindray BS-430)'
  ];

  for (const name of fridgeBiochemItems) {
    await db.query(
      `UPDATE lab_inhand_inventory 
       SET storage_temp = 'refrigerator', storage_unit_id = 'fridge_biochem' 
       WHERE item_name = ?`,
      [name]
    );
  }

  // Refrigerator 2: Hematology & Blood Bank Controls
  const fridgeHemaItems = [
    'M-6 FD DYE',
    'M-6 FR DYE',
    'ESR SOLUTION'
  ];

  for (const name of fridgeHemaItems) {
    await db.query(
      `UPDATE lab_inhand_inventory 
       SET storage_temp = 'refrigerator', storage_unit_id = 'fridge_hema', department = 'Hematology' 
       WHERE item_name = ?`,
      [name]
    );
  }

  // Refrigerator 3: Microbiology & VITEK 2 Cards
  const fridgeMicroItems = [
    'AST-N222 VITEK 2 Card',
    'GP CARDS VITEK 2'
  ];

  for (const name of fridgeMicroItems) {
    await db.query(
      `UPDATE lab_inhand_inventory 
       SET storage_temp = 'refrigerator', storage_unit_id = 'fridge_micro', department = 'Microbiology' 
       WHERE item_name = ?`,
      [name]
    );
  }

  // Refrigerator 4: Serology & Rapid Diagnostic Kits
  const fridgeSerologyItems = [
    'AFP Rapid Kit',
    'AMH Rapid Kit',
    'B HCG Rapid Cassette',
    'CRP Rapid Quant',
    'D-DIMER Rapid Kit',
    'FERRITIN Rapid Kit',
    'FREE PSA Quantitative Kit',
    'HBA1C Rapid Cartridge',
    'NT-PROBNP Rapid Kit',
    'Progesteron Rapid Kit',
    'Prolactin Rapid Kit',
    'T PSA Quantitative Kit',
    'TOXO IgG/IgM Rapid Test',
    'TROPONIN I Rapid Test',
    'TSH Quantitative Kit',
    'VITAMIN D Rapid Kit',
    'ASOT Latex Kit',
    'CRP Latex Kit'
  ];

  for (const name of fridgeSerologyItems) {
    await db.query(
      `UPDATE lab_inhand_inventory 
       SET storage_temp = 'refrigerator', storage_unit_id = 'fridge_serology', equipment_group = 'Serology & Rapid Tests', department = 'Biochemistry' 
       WHERE item_name = ?`,
      [name]
    );
  }

  // Deep Freezer 1: Seed lyophilized controls/calibrators if missing
  const freezerItems = [
    { name: 'Lyophilized Chemistry Multical (Cobas C311)', group: 'Cobas C311 Reagents', dept: 'Biochemistry', qty: 6, uom: 'vials' },
    { name: 'Lyophilized Precicontrol Universal (Cobas e411)', group: 'Cobas e411 Reagents', dept: 'Biochemistry', qty: 4, uom: 'vials' },
    { name: 'Lyophilized Molecular MasterMix (-20°C)', group: 'Molecular Biology Reagents', dept: 'Molecular Biology', qty: 8, uom: 'kits' }
  ];

  for (const fi of freezerItems) {
    const { rows } = await db.query('SELECT id FROM lab_inhand_inventory WHERE item_name = ?', [fi.name]);
    if (rows.length === 0) {
      await db.query(
        `INSERT INTO lab_inhand_inventory (item_name, category, equipment_group, department, storage_temp, storage_unit_id, quantity_in_hand, unit_of_measure, min_threshold, expiry_date, lot_number)
         VALUES (?, 'Calibrators', ?, ?, 'freezer', 'freezer_controls', ?, ?, 3, '2028-06-30', 'LOT-FREEZE-2026')`,
        [fi.name, fi.group, fi.dept, fi.qty, fi.uom]
      );
    } else {
      await db.query(
        `UPDATE lab_inhand_inventory SET storage_temp = 'freezer', storage_unit_id = 'freezer_controls' WHERE id = ?`,
        [rows[0].id]
      );
    }
  }

  // Room Temp Shelf 1: Biochemistry Wash & Diluents
  const roomTempBiochemItems = [
    'Assay Buf Elecsys Pro-Cell',
    'Clean-Sol Elecsys Clean-Cell',
    'Cell wash NaOH-D - Basic Wash 2x1.8 L',
    'Cell wash solution II Acid wash Solution 2x1.8 L',
    'C311 Sample Cleaner 2, 68 ML',
    'Ecotergent (HITERGENT) C311, 60ml (ECO-D)',
    'ISE Diluent int.stand Gen.2, cobas c, Hitachi, 5x300ml',
    'ISE Internal Stand. Gen.2, cobas c, Hitachi, 5x600ml',
    'ISE Reference Electrolyte 5x300ml',
    'Multiclean, cobas c (Sample cleaner 1), 12x59 ml',
    'NaOH-D, cobas c, 66 ml',
    'SMS, cobas c, 50 ml',
    'Deionized water (Mispa i3)',
    'Probe Clean (Mispa i3)',
    'Washing Solution (Mispa i3)'
  ];

  for (const name of roomTempBiochemItems) {
    await db.query(
      `UPDATE lab_inhand_inventory 
       SET storage_temp = 'room_temp', storage_unit_id = 'room_temp_biochem', department = 'Biochemistry' 
       WHERE item_name = ?`,
      [name]
    );
  }

  // Room Temp Cabinet 2: Hematology Dyes & Lysing
  const roomTempHemaItems = [
    'DS-DILUENT (BC-780)',
    'M-6 DR DILUENT',
    'M-6 LD LYSE',
    'M-6 LH LYSE',
    'PROBE CLEANSER'
  ];

  for (const name of roomTempHemaItems) {
    await db.query(
      `UPDATE lab_inhand_inventory 
       SET storage_temp = 'room_temp', storage_unit_id = 'room_temp_hema', department = 'Hematology' 
       WHERE item_name = ?`,
      [name]
    );
  }

  // Room Temp Bench 3: Microbiology Saline & Consumables
  const roomTempMicroItems = [
    'SALINE SOLUTION (Microbiology)',
    'UNSENSITIZED TUBES'
  ];

  for (const name of roomTempMicroItems) {
    await db.query(
      `UPDATE lab_inhand_inventory 
       SET storage_temp = 'room_temp', storage_unit_id = 'room_temp_micro', department = 'Microbiology' 
       WHERE item_name = ?`,
      [name]
    );
  }

  // Room Temp Rack 4: General Diagnostic Consumables & Lab Hardware
  const roomTempGeneralItems = [
    'Assay tip Elecsys 2010 *IM',
    'Assay cup Elecsys 2010 *IM',
    'Sample cup',
    'Reaction cell sets (Pack of 3x6 pcs)',
    'BROXO 6-15 VACUUMSALT (1KG)',
    'DAYLIFF 10 " BLUE BODY',
    'DAYLIFF 20 "1 MIC Wound sediment cartidge',
    'DAYLIFF 20 "5 MIC Wound sediment cartidge',
    'DAYLIFF 20 "10 MIC Wound sediment cartidge',
    'DAYLIFF 20 "20 MIC Wound sediment cartidge',
    'PRETREATMENT MODULE AMB',
    'RO MEMBRAN (OLD 2083)',
    'UV Replacement Lamp for 60 l Tank',
    'CONDITIONING MODULE',
    'Halogen lamp',
    'Reference Electrode',
    'Cartridge CL',
    'Cartridge K',
    'Cartridge NA'
  ];

  for (const name of roomTempGeneralItems) {
    await db.query(
      `UPDATE lab_inhand_inventory 
       SET storage_temp = 'room_temp', storage_unit_id = 'room_temp_general' 
       WHERE item_name = ?`,
      [name]
    );
  }

  // Print summary per storage unit
  const summary = await db.query(
    `SELECT u.id, u.label, u.type, u.temp_range, COUNT(i.id) as item_count 
     FROM lab_storage_units u 
     LEFT JOIN lab_inhand_inventory i ON u.id = i.storage_unit_id 
     GROUP BY u.id, u.label, u.type, u.temp_range 
     ORDER BY u.type, u.id`
  );

  console.log('\n📊 STORAGE UNITS SUMMARY WITH REAGENTS:');
  const rows = summary.rows || summary;
  for (const s of rows) {
    console.log(`[${s.type.toUpperCase()}] ${s.label} (${s.temp_range}) → ${s.item_count} items`);
  }

  console.log('✅ Storage units update completed successfully.');
  process.exit(0);
}

fixStorageUnits().catch(err => {
  console.error(err);
  process.exit(1);
});
