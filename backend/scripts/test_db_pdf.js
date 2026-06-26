require('dotenv').config({ path: '../.env.local' });
const db = require('../src/config/db'); // load environment/db
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateClinicalSheetPDF } = require('../src/utils/pdf');
const { decryptField } = require('../src/utils/crypto');
const fs = require('fs');

async function test() {
  console.log('Querying all rows in clinical_observations...');
  try {
    const rows = await prisma.clinical_observations.findMany();
    console.log(`Found ${rows.length} records.`);
    for (const row of rows) {
      console.log(`ID: ${row.id}, Patient ID: ${row.patient_id}, Queue ID: ${row.queue_id}, Status: ${row.status}`);
      
      // Decrypt row
      const decrypted = { ...row };
      const coCols = ['identification_json', 'triage_json', 'progress_notes_json', 'medication_mar_json', 'sbar_json'];
      coCols.forEach(col => {
        if (decrypted[col] && typeof decrypted[col] === 'string') {
          decrypted[col] = decryptField(decrypted[col]);
        }
      });

      let observation;
      try {
        observation = {
          ...decrypted,
          identification: JSON.parse(decrypted.identification_json || '{}'),
          triage: JSON.parse(decrypted.triage_json || '{}'),
          progress_notes: JSON.parse(decrypted.progress_notes_json || '[]'),
          medication_mar: JSON.parse(decrypted.medication_mar_json || '{}'),
          sbar: JSON.parse(decrypted.sbar_json || '{}')
        };
      } catch (err) {
        console.error(`Failed to parse JSON for ID ${row.id}:`, err);
        continue;
      }

      console.log('Attempting to generate PDF for row ID:', row.id);
      const outPath = `./test_out_${row.id}.pdf`;
      const writeStream = fs.createWriteStream(outPath);
      try {
        await generateClinicalSheetPDF(observation, writeStream);
        console.log(`Successfully generated PDF for row ID ${row.id} at ${outPath}`);
      } catch (err) {
        console.error(`Failed to generate PDF for row ID ${row.id}:`, err.stack || err);
      }
    }
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
