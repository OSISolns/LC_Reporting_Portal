require('dotenv').config();
const db = require('../src/config/db');

async function updateJune20() {
  try {
    const reportDate = '2026-06-20';
    console.log(`🔌 Connected. Updating metrics for ${reportDate}...`);

    const updates = {
      'Dr NKUBITO GATERA VALENS': 1,
      'Dr Ntirushwa David': 3,
      'NGABO NTAGANDA FABRICE': 2,
      'Dr BIZIMANA YVES LAURENT': 1,
      'Dr. NKERAGUTABARA Gihana Jacques': 2,
      'Dr GAPIRA GANZA JEAN MARIE VIANNEY': 1,
      'Dr Kabayiza Jean Claude': 5,
      'Dr. KAREKEZI CLAIRE': 2,
      'DR HAKIZIMANA ARISTOTE': 7,
      'Dr Nyiraneza Esperance': 6,
      'DR MUGESERA ERNEST': 1,
      'DR. JAYKAR G SARGUNAR': 11,
      'Mr NAZE Thierry': 4,
      'Miss FRANCINE M.': 1,
      'Mr NSENGIMANA Emmanuel': 4,
      'Miss LEAH MUTESI': 3,
      'Miss UWAMAHORO Sarah': 2
    };

    // First, set all to 0 for 2026-06-20 to ensure clean slate for any previously entered data
    await db.query(`
      UPDATE daily_report_metrics 
      SET patient_count = 0 
      WHERE report_date = $1
    `, [reportDate]);

    // Fetch providers to match their IDs
    const { rows: providers } = await db.query('SELECT id, name FROM providers');
    let matchedCount = 0;

    for (const [name, count] of Object.entries(updates)) {
      // Find exact or case-insensitive match
      const provider = providers.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (provider) {
        await db.query(`
          INSERT INTO daily_report_metrics (report_date, provider_id, patient_count)
          VALUES ($1, $2, $3)
          ON CONFLICT (report_date, provider_id) 
          DO UPDATE SET patient_count = EXCLUDED.patient_count
        `, [reportDate, provider.id, count]);
        console.log(`✅ Updated ${name} -> ${count}`);
        matchedCount++;
      } else {
        console.log(`❌ Provider not found: ${name}`);
      }
    }

    // Now, let's fix missing specialization_ids if any
    await db.query(`
      UPDATE daily_report_metrics 
      SET specialization_id = (SELECT specialization_id FROM providers WHERE providers.id = daily_report_metrics.provider_id)
      WHERE specialization_id IS NULL OR specialization_id = 0
    `);

    console.log(`\n🎉 Finished! Updated ${matchedCount} providers for ${reportDate}.`);
  } catch (err) {
    console.error('Error updating metrics:', err);
  }
}

module.exports = { updateJune20 };
