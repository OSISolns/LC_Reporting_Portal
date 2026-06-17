require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const reportDate = '2026-06-11';

const metrics = [
  { provider_id: 420, department_id: 109, patient_count: 0 },
  { provider_id: 421, department_id: 109, patient_count: 0 },
  { provider_id: 422, department_id: 109, patient_count: 0 },
  { provider_id: 423, department_id: 109, patient_count: 0 },
  { provider_id: 424, department_id: 109, patient_count: 30 },
  { provider_id: 425, department_id: 110, patient_count: 0 },
  { provider_id: 426, department_id: 110, patient_count: 14 },
  { provider_id: 427, department_id: 110, patient_count: 13 },
  { provider_id: 428, department_id: 111, patient_count: 0 },
  { provider_id: 429, department_id: 111, patient_count: 0 },
  { provider_id: 430, department_id: 111, patient_count: 0 },
  { provider_id: 431, department_id: 111, patient_count: 19 },
  { provider_id: 432, department_id: 111, patient_count: 39 },
  { provider_id: 433, department_id: 111, patient_count: 0 },
  { provider_id: 434, department_id: 111, patient_count: 0 },
  { provider_id: 435, department_id: 111, patient_count: 0 },
  { provider_id: 436, department_id: 111, patient_count: 0 },
  { provider_id: 437, department_id: 111, patient_count: 39 },
  { provider_id: 438, department_id: 112, patient_count: 0 },
  { provider_id: 439, department_id: 112, patient_count: 0 },
  { provider_id: 440, department_id: 112, patient_count: 0 },
  { provider_id: 441, department_id: 112, patient_count: 41 },
  { provider_id: 442, department_id: 112, patient_count: 0 },
  { provider_id: 443, department_id: 113, patient_count: 0 },
  { provider_id: 444, department_id: 113, patient_count: 27 },
  { provider_id: 445, department_id: 114, patient_count: 0 },
  { provider_id: 446, department_id: 114, patient_count: 0 },
  { provider_id: 447, department_id: 115, patient_count: 23 },
  { provider_id: 448, department_id: 115, patient_count: 0 },
  { provider_id: 449, department_id: 115, patient_count: 0 },
  { provider_id: 450, department_id: 115, patient_count: 0 },
  { provider_id: 451, department_id: 116, patient_count: 0 },
  { provider_id: 452, department_id: 116, patient_count: 22 },
  { provider_id: 453, department_id: 117, patient_count: 0 },
  { provider_id: 454, department_id: 118, patient_count: 2 },
  { provider_id: 455, department_id: 119, patient_count: 7 },
  { provider_id: 456, department_id: 119, patient_count: 0 },
  { provider_id: 457, department_id: 119, patient_count: 9 },
  { provider_id: 458, department_id: 119, patient_count: 5 },
  { provider_id: 459, department_id: 119, patient_count: 0 },
  { provider_id: 460, department_id: 119, patient_count: 0 },
  { provider_id: 461, department_id: 119, patient_count: 0 },
  { provider_id: 462, department_id: 119, patient_count: 6 },
  { provider_id: 463, department_id: 119, patient_count: 1 },
  { provider_id: 464, department_id: 119, patient_count: 0 },
  { provider_id: 465, department_id: 120, patient_count: 12 },
  { provider_id: 466, department_id: 120, patient_count: 9 },
  { provider_id: 467, department_id: 120, patient_count: 4 },
  { provider_id: 468, department_id: 120, patient_count: 0 },
  { provider_id: 469, department_id: 120, patient_count: 6 },
  { provider_id: 470, department_id: 120, patient_count: 4 },
  { provider_id: 471, department_id: 120, patient_count: 0 }
];

const logs = [
  { metric_name: 'Minor', metric_value: '11' },
  { metric_name: 'VAT', metric_value: '1' },
  { metric_name: 'EEG', metric_value: '0' },
  { metric_name: 'Hep. B', metric_value: '0' },
  { metric_name: 'VACCIN (CHILDREN)', metric_value: '0' },
  { metric_name: 'TMT', metric_value: '0' },
  { metric_name: 'ECG', metric_value: '13' },
  { metric_name: 'CASE DONE UNDER SEDATION', metric_value: '1' },
  { metric_name: 'TRANSFER with Ambulance', metric_value: '1' },
  { metric_name: 'Procedure by Surgeons', metric_value: '2' },
  { metric_name: 'Observation', metric_value: '10' },
  { metric_name: 'Incidence', metric_value: '0' },
  { metric_name: 'GYNECO. Assistants', metric_value: 'DENYSE' }
];

async function run() {
  try {
    const statements = [
      {
        sql: 'DELETE FROM daily_report_metrics WHERE report_date = ?',
        args: [reportDate]
      },
      {
        sql: 'DELETE FROM daily_procedure_logs WHERE report_date = ?',
        args: [reportDate]
      }
    ];

    for (const item of metrics) {
      statements.push({
        sql: 'INSERT INTO daily_report_metrics (report_date, provider_id, department_id, patient_count) VALUES (?, ?, ?, ?)',
        args: [reportDate, item.provider_id, item.department_id, item.patient_count]
      });
    }

    for (const log of logs) {
      statements.push({
        sql: 'INSERT INTO daily_procedure_logs (report_date, metric_name, metric_value) VALUES (?, ?, ?)',
        args: [reportDate, log.metric_name, log.metric_value]
      });
    }

    console.log(`Executing ${statements.length} operations on Turso...`);
    await client.batch(statements);
    console.log('🎉 June 11, 2026 data successfully restored to Turso production database!');
  } catch (err) {
    console.error('❌ Error executing operations:', err);
  } finally {
    process.exit(0);
  }
}

run();
