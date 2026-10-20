const db = require('../src/config/db');

async function syncActualStorageUnits() {
  console.log('🔄 Syncing lab_storage_units table with actual laboratory cold chain & storage units...');

  const actualUnits = [
    // ── Cold Chain (2°C to 8°C) ──
    {
      id: 'fridge_biochem',
      label: 'Refrigerator 1 - Biochemistry & ECLIA Reagents',
      type: 'fridge',
      temp_range: '2°C to 8°C'
    },
    {
      id: 'fridge_hema',
      label: 'Refrigerator 2 - Hematology & Blood Bank Controls',
      type: 'fridge',
      temp_range: '2°C to 8°C'
    },
    {
      id: 'fridge_micro',
      label: 'Refrigerator 3 - Microbiology & VITEK 2 Cards',
      type: 'fridge',
      temp_range: '2°C to 8°C'
    },
    {
      id: 'fridge_serology',
      label: 'Refrigerator 4 - Serology & Rapid Diagnostic Kits',
      type: 'fridge',
      temp_range: '2°C to 8°C'
    },
    {
      id: 'fridge_samples',
      label: 'Refrigerator 5 - Clinical Specimen Pre/Post-Hold',
      type: 'fridge',
      temp_range: '2°C to 8°C'
    },
    // ── Freezers ──
    {
      id: 'freezer_controls',
      label: 'Deep Freezer 1 - Lyophilized QC & Calibrators',
      type: 'freezer',
      temp_range: '-20°C to -80°C'
    },
    // ── Room Temperature (20°C to 25°C) ──
    {
      id: 'room_temp_biochem',
      label: 'Room Temp Shelf 1 - Biochemistry Wash & Diluents',
      type: 'room_temp',
      temp_range: '20°C to 25°C'
    },
    {
      id: 'room_temp_hema',
      label: 'Room Temp Cabinet 2 - Hematology Dyes & Lysing',
      type: 'room_temp',
      temp_range: '20°C to 25°C'
    },
    {
      id: 'room_temp_micro',
      label: 'Room Temp Bench 3 - Microbiology Saline & Consumables',
      type: 'room_temp',
      temp_range: '20°C to 25°C'
    },
    {
      id: 'room_temp_general',
      label: 'Room Temp Rack 4 - General Diagnostic Consumables',
      type: 'room_temp',
      temp_range: '20°C to 25°C'
    }
  ];

  try {
    // Upsert storage units
    for (const u of actualUnits) {
      await db.query(
        `INSERT INTO lab_storage_units (id, label, type, temp_range, status)
         VALUES (?, ?, ?, ?, 'active')
         ON CONFLICT(id) DO UPDATE SET 
           label = EXCLUDED.label, 
           type = EXCLUDED.type, 
           temp_range = EXCLUDED.temp_range,
           status = 'active'`,
        [u.id, u.label, u.type, u.temp_range]
      );
    }

    // Remap inhand inventory items from old dummy unit IDs to the new clean unit IDs
    // Room temp biochemistry items
    await db.query(
      `UPDATE lab_inhand_inventory 
       SET storage_unit_id = 'room_temp_biochem'
       WHERE storage_temp = 'room_temp' AND department = 'Biochemistry'`
    );

    // Room temp hematology items
    await db.query(
      `UPDATE lab_inhand_inventory 
       SET storage_unit_id = 'room_temp_hema'
       WHERE storage_temp = 'room_temp' AND department = 'Hematology'`
    );

    // Room temp microbiology items
    await db.query(
      `UPDATE lab_inhand_inventory 
       SET storage_unit_id = 'room_temp_micro'
       WHERE storage_temp = 'room_temp' AND department = 'Microbiology'`
    );

    // Refrigerator biochemistry items
    await db.query(
      `UPDATE lab_inhand_inventory 
       SET storage_unit_id = 'fridge_biochem'
       WHERE (storage_temp = 'refrigerator' OR storage_temp = 'fridge_2_8') AND department = 'Biochemistry'`
    );

    // Refrigerator hematology items
    await db.query(
      `UPDATE lab_inhand_inventory 
       SET storage_unit_id = 'fridge_hema'
       WHERE (storage_temp = 'refrigerator' OR storage_temp = 'fridge_2_8') AND department = 'Hematology'`
    );

    // Refrigerator microbiology items
    await db.query(
      `UPDATE lab_inhand_inventory 
       SET storage_unit_id = 'fridge_micro'
       WHERE (storage_temp = 'refrigerator' OR storage_temp = 'fridge_2_8') AND department = 'Microbiology'`
    );

    // Delete obsolete dummy units that are empty
    await db.query(
      `DELETE FROM lab_storage_units WHERE id IN ('fridge_1', 'fridge_2', 'fridge_3', 'fridge_4', 'fridge_5', 'fridge_6', 'fridge_7', 'fridge_8', 'freezer_1', 'room_temp_1', 'room_temp_2', 'room_temp_3')`
    );

    console.log(`✅ Successfully synced ${actualUnits.length} actual laboratory storage units.`);
    console.log('✅ Remapped in-hand inventory items to matching benches & storage units.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to sync storage units:', err);
    process.exit(1);
  }
}

syncActualStorageUnits();
