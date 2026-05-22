'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../src/config/db');

const feedbacks = [
  {
    feedbackDate: '2026-05-18',
    receptionCallCenter: 1,
    nursing: 0,
    doctorsRoom: 0,
    receptionCashier: 1,
    callCenter: 0,
    tabaraService: 0,
    laboratory: 0,
    laboratoryResults: 0,
    cafetaria: 0,
    imaging: 0,
    concernDescription: 'The morning rush at the reception was slightly slow today. We need to assign one more helper during Peak Hours (8 AM to 10 AM) to assist with guiding clinical visitors to avoid cashier bottlenecks. Cashiers are performing well but queues are build up.'
  },
  {
    feedbackDate: '2026-05-19',
    receptionCallCenter: 0,
    nursing: 1,
    doctorsRoom: 0,
    receptionCashier: 0,
    callCenter: 0,
    tabaraService: 0,
    laboratory: 1,
    laboratoryResults: 1,
    cafetaria: 0,
    imaging: 0,
    concernDescription: 'A compliment for the nursing team and the lab results dispatch! The integration of results-transfer directly in our portal has dramatically reduced wait times for patients. The staff at Phlebotomy were very professional and handled blood drawing quickly.'
  },
  {
    feedbackDate: '2026-05-20',
    receptionCallCenter: 0,
    nursing: 0,
    doctorsRoom: 1,
    receptionCashier: 0,
    callCenter: 0,
    tabaraService: 1,
    laboratory: 0,
    laboratoryResults: 0,
    cafetaria: 0,
    imaging: 0,
    concernDescription: 'Doctors rooms are clean and fully equipped. However, there was a minor coordination issue with the Tabara wheelchair service. A patient waiting outside Room 3 had to wait 15 minutes for wheelchair assistance after a consultation. We need a more proactive alert system.'
  },
  {
    feedbackDate: '2026-05-21',
    receptionCallCenter: 0,
    nursing: 0,
    doctorsRoom: 0,
    receptionCashier: 0,
    callCenter: 0,
    tabaraService: 0,
    laboratory: 0,
    laboratoryResults: 1,
    cafetaria: 1,
    imaging: 0,
    concernDescription: 'Cafetaria hygiene is excellent and the food is great! On the lab results side, there was a temporary delay in uploading the biochemistry panel. Let us check if there is an intermittent connection problem between our local cache database and the automated analyzers.'
  },
  {
    feedbackDate: '2026-05-21',
    receptionCallCenter: 1,
    nursing: 0,
    doctorsRoom: 0,
    receptionCashier: 0,
    callCenter: 1,
    tabaraService: 0,
    laboratory: 0,
    laboratoryResults: 0,
    cafetaria: 0,
    imaging: 1,
    concernDescription: 'Suggesting a dedicated call-center follow-up script for patients who go through the Imaging department. Many senior patients have questions about receiving their digital X-ray copy, so setting up an automated SMS with the download link would be very helpful.'
  }
];

async function seed() {
  console.log('🌱 Seeding 5 Realistic Anonymous Feedbacks into internal_feedbacks...');
  try {
    // Clear old feedback to keep it clean
    await db.query('DELETE FROM internal_feedbacks');

    for (const item of feedbacks) {
      await db.query(
        `INSERT INTO internal_feedbacks (
          contact_info, feedback_date,
          reception_call_center, nursing, doctors_room,
          reception_cashier, call_center, tabara_service,
          laboratory, laboratory_results, cafetaria, imaging,
          concern_description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          null, // fully anonymous contact
          item.feedbackDate,
          item.receptionCallCenter,
          item.nursing,
          item.doctorsRoom,
          item.receptionCashier,
          item.callCenter,
          item.tabaraService,
          item.laboratory,
          item.laboratoryResults,
          item.cafetaria,
          item.imaging,
          item.concernDescription
        ]
      );
    }
    console.log('✅ Seeding completed! 5 feedbacks created.');
  } catch (err) {
    console.error('❌ Failed to seed feedbacks:', err.message);
  }
}

seed();
