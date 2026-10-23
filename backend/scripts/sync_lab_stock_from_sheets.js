const db = require('../src/config/db');

async function syncStockFromSheets() {
  console.log('🔄 Syncing in-hand laboratory inventory with institutional physical sheets...');

  const roomTempItems = [
    // Cobas e411 Reagents (Biochemestry Reagents)
    { name: 'Assay Buf Elecsys Pro-Cell', group: 'Cobas e411 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 21, uom: 'pcs' },
    { name: 'Clean-Sol Elecsys Clean-Cell', group: 'Cobas e411 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 22, uom: 'pcs' },
    { name: 'Assay tip Elecsys 2010 *IM', group: 'Cobas e411 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 11, uom: 'box' },
    { name: 'Assay cup Elecsys 2010 *IM', group: 'Cobas e411 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 8, uom: 'box' },

    // Cobas C311 Reagents (Clinical Chemistry Reagents)
    { name: 'Sample cup', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 6, uom: 'pack' },
    { name: 'Cell wash solution II Acid wash Solution 2x1.8 L', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 2, uom: 'bot' },
    { name: 'C311 Sample Cleaner 2, 68 ML', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 1, uom: 'bot' },
    { name: 'Cartridge CL', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'pcs' },
    { name: 'Cartridge K', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'pcs' },
    { name: 'Cartridge NA', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'pcs' },
    { name: 'Cobas Integra ALB Gen 2, 300 Tests (Blood)', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 8, uom: 'kit' },
    { name: 'Cobas Integra TP Gen.2, 300 tests', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 7, uom: 'kit' },
    { name: 'CREAJ Gen.2, 700Test, cobas c, Integra', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 9, uom: 'kit' },
    { name: 'Ecotergent (HITERGENT) C311, 60ml (ECO-D)', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 10, uom: 'bot' },
    { name: 'Halogen lamp', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'pcs' },
    { name: 'ISE Diluent int.stand Gen.2, cobas c, Hitachi, 5x300ml', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 6, uom: 'box' },
    { name: 'ISE Internal Stand. Gen.2, cobas c, Hitachi, 5x600ml', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 9, uom: 'box' },
    { name: 'ISE Reference Electrolyte 5x300ml', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 8, uom: 'box' },
    { name: 'ISE Standard high 10x3 ml', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 4, uom: 'box' },
    { name: 'ISE Standard low 10x3 ml', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 5, uom: 'box' },
    { name: 'MG Gen II, 250 tests, Cobas 6000', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 8, uom: 'kit' },
    { name: 'Multiclean, cobas c (Sample cleaner 1), 12x59 ml', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 1, uom: 'box' },
    { name: 'NaOH-D, cobas c, 66 ml', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 19, uom: 'bot' },
    { name: 'Cell wash NaOH-D - Basic Wash 2x1.8 L', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 6, uom: 'bot' },
    { name: 'Reaction cell sets (Pack of 3x6 pcs)', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 1, uom: 'pack' },
    { name: 'Reference Electrode', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'pcs' },
    { name: 'SMS, cobas c, 50 ml', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 9, uom: 'bot' },
    { name: 'BROXO 6-15 VACUUMSALT (1KG)', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 35, uom: 'kg' },
    { name: 'DAYLIFF 10 " BLUE BODY', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'pcs' },
    { name: 'PRETREATMENT MODULE AMB', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 1, uom: 'pcs' },
    { name: 'RO MEMBRAN (OLD 2083)', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 2, uom: 'pcs' },
    { name: 'CONDITIONING MODULE', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 1, uom: 'pcs' },
    { name: 'UV Replacement Lamp for 60 l Tank', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 1, uom: 'pcs' },
    { name: 'DAYLIFF 20 "1 MIC Wound sediment cartidge', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 4, uom: 'pcs' },
    { name: 'DAYLIFF 20 "5 MIC Wound sediment cartidge', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 3, uom: 'pcs' },
    { name: 'DAYLIFF 20 "10 MIC Wound sediment cartidge', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 1, uom: 'pcs' },
    { name: 'DAYLIFF 20 "20 MIC Wound sediment cartidge', group: 'Cobas C311 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 5, uom: 'pcs' },

    // VITEK 2 Compact Reagents (Biochemistry Reagents)
    { name: 'AMH Rapid Kit', group: 'VITEK 2 Compact Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 1, uom: 'kit' },
    { name: 'D-DIMER Rapid Kit', group: 'VITEK 2 Compact Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'kit' },
    { name: 'FERRITIN Rapid Kit', group: 'VITEK 2 Compact Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 6, uom: 'kit' },
    { name: 'TROPONIN I Rapid Test', group: 'VITEK 2 Compact Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'kit' },
    { name: 'B HCG Rapid Cassette', group: 'VITEK 2 Compact Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'kit' },
    { name: 'CRP Rapid Quant', group: 'VITEK 2 Compact Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'kit' },
    { name: 'AFP Rapid Kit', group: 'VITEK 2 Compact Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'kit' },
    { name: 'HBA1C Rapid Cartridge', group: 'VITEK 2 Compact Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'kit' },
    { name: 'NT-PROBNP Rapid Kit', group: 'VITEK 2 Compact Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 2, uom: 'kit' },
    { name: 'T PSA Quantitative Kit', group: 'VITEK 2 Compact Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 3, uom: 'kit' },
    { name: 'VITAMIN D Rapid Kit', group: 'VITEK 2 Compact Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'kit' },
    { name: 'FREE PSA Quantitative Kit', group: 'VITEK 2 Compact Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'kit' },
    { name: 'TSH Quantitative Kit', group: 'VITEK 2 Compact Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 2, uom: 'kit' },
    { name: 'Prolactin Rapid Kit', group: 'VITEK 2 Compact Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'kit' },
    { name: 'TOXO IgG/IgM Rapid Test', group: 'VITEK 2 Compact Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'kit' },
    { name: 'Progesteron Rapid Kit', group: 'VITEK 2 Compact Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 1, uom: 'kit' },

    // Mispa i3 Reagents (Biochemistry Reagents)
    { name: 'Probe Clean (Mispa i3)', group: 'Mispa i3 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'bot' },
    { name: 'Washing Solution (Mispa i3)', group: 'Mispa i3 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 2, uom: 'bot' },
    { name: 'Deionized water (Mispa i3)', group: 'Mispa i3 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 0, uom: 'bot' },

    // Mindray BS-430 Reagents (Biochemistry Reagents)
    { name: 'CD8 Reagent (Mindray BS-430)', group: 'Mindray BS-430 Reagents', dept: 'Biochemistry', unit: 'room_temp_1', qty: 8, uom: 'bot' },

    // Mindray Bc-780 Reagents(Hematology Reagents)
    { name: 'DS-DILUENT (BC-780)', group: 'Mindray Bc-780 Reagents', dept: 'Hematology', unit: 'room_temp_2', qty: 0, uom: 'box' },
    { name: 'M-6 LD LYSE', group: 'Mindray Bc-780 Reagents', dept: 'Hematology', unit: 'room_temp_2', qty: 0, uom: 'bot' },
    { name: 'M-6 LH LYSE', group: 'Mindray Bc-780 Reagents', dept: 'Hematology', unit: 'room_temp_2', qty: 2, uom: 'bot' },
    { name: 'M-6 DR DILUENT', group: 'Mindray Bc-780 Reagents', dept: 'Hematology', unit: 'room_temp_2', qty: 0, uom: 'box' },
    { name: 'M-6 FD DYE', group: 'Mindray Bc-780 Reagents', dept: 'Hematology', unit: 'room_temp_2', qty: 5, uom: 'bot' },
    { name: 'M-6 FR DYE', group: 'Mindray Bc-780 Reagents', dept: 'Hematology', unit: 'room_temp_2', qty: 1, uom: 'bot' },
    { name: 'ESR SOLUTION', group: 'Mindray Bc-780 Reagents', dept: 'Hematology', unit: 'room_temp_2', qty: 0, uom: 'bot' },
    { name: 'PROBE CLEANSER', group: 'Mindray Bc-780 Reagents', dept: 'Hematology', unit: 'room_temp_2', qty: 0, uom: 'bot' },

    // VITEK 2 Compact Reagents(Microbiology Reagents)
    { name: 'SALINE SOLUTION (Microbiology)', group: 'VITEK 2 Compact Reagents', dept: 'Microbiology', unit: 'room_temp_2', qty: 12, uom: 'bot' },
    { name: 'UNSENSITIZED TUBES', group: 'VITEK 2 Compact Reagents', dept: 'Microbiology', unit: 'room_temp_2', qty: 1, uom: 'pack' }
  ];

  let updatedCount = 0;
  for (const item of roomTempItems) {
    const res = await db.query(
      `UPDATE lab_inhand_inventory 
       SET quantity_in_hand = ?, storage_temp = 'room_temp', storage_unit_id = ?
       WHERE item_name = ?`,
      [item.qty, item.unit, item.name]
    );
    if (res.rowCount > 0) {
      updatedCount++;
    } else {
      // Insert if missing
      await db.query(
        `INSERT INTO lab_inhand_inventory (item_name, category, equipment_group, department, storage_temp, storage_unit_id, quantity_in_hand, unit_of_measure, min_threshold, expiry_date, lot_number)
         VALUES (?, 'Reagents', ?, ?, 'room_temp', ?, ?, ?, 5, '2027-12-31', 'LOT-2026-RT')`,
        [item.name, item.group, item.dept, item.unit, item.qty, item.uom]
      );
      updatedCount++;
    }
  }

  console.log(`✅ Synced ${updatedCount} room temperature reagents matching physical count.`);
  process.exit(0);
}

syncStockFromSheets().catch(err => {
  console.error('Error syncing:', err);
  process.exit(1);
});
