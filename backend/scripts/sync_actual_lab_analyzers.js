const db = require('../src/config/db');

async function syncActualAnalyzers() {
  console.log('🔄 Syncing lab_analyzers table with the user-provided list of analyzers...');

  const actualAnalyzers = [
    {
      name: 'Cobas C 311',
      manufacturer: 'Roche Diagnostics',
      model: 'Cobas C 311',
      department: 'Biochemistry',
      serial_number: 'RCH-C311-9014',
      status: 'Operational',
      last_calibrated: '2026-06-05',
      next_calibration_due: '2026-09-05',
      notes: 'Automated discrete clinical chemistry analyzer with ultrasonic mixing.',
      added_by: 'Laboratory Team Lead'
    },
    {
      name: 'Cobas e411',
      manufacturer: 'Roche Diagnostics',
      model: 'Cobas e411',
      department: 'Biochemistry',
      serial_number: 'RCH-E411-7731',
      status: 'Operational',
      last_calibrated: '2026-05-20',
      next_calibration_due: '2026-08-20',
      notes: 'Electrochemiluminescence (ECLIA) Biochemestry analyzer for thyroid, fertility, and cardiac markers.',
      added_by: 'Laboratory Team Lead'
    },
    {
      name: 'VITEK 2 Compact',
      manufacturer: 'bioMérieux',
      model: 'VITEK 2 Compact',
      department: 'Biochemistry',
      serial_number: 'BMX-VTK2-4412',
      status: 'Operational',
      last_calibrated: '2026-06-12',
      next_calibration_due: '2026-09-12',
      notes: 'Automated platform for rapid diagnostic testing and quantitative cartridges.',
      added_by: 'Laboratory Team Lead'
    },
    {
      name: 'Mispa i3',
      manufacturer: 'Agappe Diagnostics',
      model: 'Mispa i3',
      department: 'Biochemistry',
      serial_number: 'AGP-MI3-8105',
      status: 'Operational',
      last_calibrated: '2026-06-15',
      next_calibration_due: '2026-09-15',
      notes: 'Cartridge-based specific protein analyzer utilizing rate-based nephelometry.',
      added_by: 'Laboratory Team Lead'
    },
    {
      name: 'Mindray BS-430',
      manufacturer: 'Mindray Bio-Medical',
      model: 'BS-430',
      department: 'Biochemistry',
      serial_number: 'MDR-BS430-6721',
      status: 'Operational',
      last_calibrated: '2026-06-10',
      next_calibration_due: '2026-09-10',
      notes: 'Floor-standing discrete random-access clinical chemistry system with CD8 wash monitoring.',
      added_by: 'Laboratory Team Lead'
    },
    {
      name: 'Mindray Bc-780',
      manufacturer: 'Mindray Bio-Medical',
      model: 'Bc-780',
      department: 'Hematology',
      serial_number: 'MDR-BC780-3190',
      status: 'Operational',
      last_calibrated: '2026-06-01',
      next_calibration_due: '2026-09-01',
      notes: 'Automated hematology analyzer with integrated ESR and 5-part differential.',
      added_by: 'Laboratory Team Lead'
    },
    {
      name: 'VITEK 2 Compact (Microbiology)',
      manufacturer: 'bioMérieux',
      model: 'VITEK 2 Compact',
      department: 'Microbiology',
      serial_number: 'BMX-VTK2-4413',
      status: 'Operational',
      last_calibrated: '2026-06-12',
      next_calibration_due: '2026-09-12',
      notes: 'Automated microbial identification and antibiotic susceptibility testing (ID/AST) system.',
      added_by: 'Laboratory Team Lead'
    },
    {
      name: 'Sysmex XN-330',
      manufacturer: 'Sysmex Corporation',
      model: 'XN-330',
      department: 'Hematology',
      serial_number: 'SYS-XN330-5521',
      status: 'Operational',
      last_calibrated: '2026-06-08',
      next_calibration_due: '2026-09-08',
      notes: 'Automated 5-part differential compact hematology analyzer with open tube sampling.',
      added_by: 'Laboratory Team Lead'
    }
  ];

  try {
    await db.query('DELETE FROM lab_analyzers');

    for (const an of actualAnalyzers) {
      await db.query(
        `INSERT INTO lab_analyzers (name, manufacturer, model, department, serial_number, status, last_calibrated, next_calibration_due, notes, added_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [an.name, an.manufacturer, an.model, an.department, an.serial_number, an.status, an.last_calibrated, an.next_calibration_due, an.notes, an.added_by]
      );
    }

    // Erase all expiry dates and lots in lab_inhand_inventory
    await db.query('UPDATE lab_inhand_inventory SET expiry_date = NULL, lot_number = NULL');

    console.log(`✅ Successfully synced all 8 available laboratory analyzers.`);
    console.log('✅ Cleared all expiration dates and lot numbers.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to sync analyzers:', err);
    process.exit(1);
  }
}

syncActualAnalyzers();
