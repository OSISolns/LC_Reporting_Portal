'use strict';

const db = require('../src/config/db');

const SPECIALIZATIONS = [
  'Cardiologist',
  'Chiropractitioner',
  'Clinical Psychologist',
  'Consultant ENT',
  'Dental Surgeon',
  'Dental Surgeon & Oral Pathology Specialist',
  'Dentistry',
  'Dermatologist',
  'Endocrinologist',
  'Family Physician',
  'Gastroenterologist',
  'General Practitioner',
  'General Surgeon',
  'Hematologist',
  'IMAGING',
  'Internist',
  'LABORATORY',
  'Nephrologist',
  'Neurologist',
  'Obstetrician & Gynaecologist',
  'Oncologist',
  'Ophthalmologist',
  'Orthodontist',
  'Orthopedic Surgeon',
  'Pathologist',
  'Pediatrician',
  'Physiotherapist',
  'Pulmonologist',
  'Radiologist',
  'Rheumatologist',
  'Urologist'
];

const NEW_PROVIDERS = [
  { name: 'Dr. Jean Paul Habimana', title: 'Dr.', spec: 'Cardiologist' },
  { name: 'Dr. Aline Umutoni', title: 'Dr.', spec: 'Dermatologist' },
  { name: 'Dr. Eric Mugisha', title: 'Dr.', spec: 'Endocrinologist' },
  { name: 'Dr. Chantal Uwase', title: 'Dr.', spec: 'Gastroenterologist' },
  { name: 'Dr. Patrick Ndayisaba', title: 'Dr.', spec: 'Nephrologist' },
  { name: 'Dr. Diane Ishimwe', title: 'Dr.', spec: 'Oncologist' },
  { name: 'Dr. Fabrice Manzi', title: 'Dr.', spec: 'Ophthalmologist' },
  { name: 'Dr. Grace Keza', title: 'Dr.', spec: 'Pulmonologist' },
  { name: 'Dr. Claude Niyonzima', title: 'Dr.', spec: 'Rheumatologist' },
  { name: 'Dr. Marie Rose Ingabire', title: 'Dr.', spec: 'Pathologist' },
  { name: 'Dr. Jean de Dieu Nshimiyimana', title: 'Dr.', spec: 'Radiologist' }
];

async function seed() {
  console.log('🌱 Starting Specializations and Providers seeding...');

  try {
    // 1. Seed specializations
    for (const specName of SPECIALIZATIONS) {
      await db.query(
        `INSERT INTO specializations (name) VALUES (?) ON CONFLICT(name) DO NOTHING`,
        [specName]
      );
    }
    console.log('✅ Specializations seeded successfully.');

    // Fetch updated specializations map
    const { rows: specs } = await db.query(`SELECT id, name FROM specializations`);
    const specMap = {};
    specs.forEach(s => {
      specMap[s.name.toLowerCase()] = s.id;
    });

    // 2. Seed missing providers
    let insertedCount = 0;
    for (const p of NEW_PROVIDERS) {
      const specId = specMap[p.spec.toLowerCase()] || null;

      // Check if provider already exists
      const { rows: existing } = await db.query(
        `SELECT id FROM providers WHERE LOWER(name) = LOWER(?)`,
        [p.name]
      );

      if (existing.length === 0) {
        await db.query(
          `INSERT INTO providers (name, title, specialization_id, specialization, is_active) VALUES (?, ?, ?, ?, 1)`,
          [p.name, p.title, specId, p.spec]
        );
        insertedCount++;
      }
    }
    console.log(`✅ Seeded ${insertedCount} new providers into DB.`);

    const { rows: totalSpecs } = await db.query(`SELECT COUNT(*) as count FROM specializations`);
    const { rows: totalProv } = await db.query(`SELECT COUNT(*) as count FROM providers`);

    console.log(`📊 DB Summary: ${totalSpecs[0].count} specializations, ${totalProv[0].count} providers.`);
  } catch (err) {
    console.error('❌ Seeding error:', err);
  } finally {
    process.exit(0);
  }
}

seed();
