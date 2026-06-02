'use strict';
require('dotenv').config();
const { suggestICD10 } = require('../src/utils/clinicalAI');
const db = require('../src/config/db');

async function run() {
  try {
    console.log('Testing ICD-11 suggestion with a cached keyword (e.g. malaria)...');
    const t0 = Date.now();
    const res1 = await suggestICD10('malaria');
    const t1 = Date.now();
    console.log(`Results for "malaria":`, res1);
    console.log(`Time taken: ${t1 - t0}ms\n`);

    console.log('Testing ICD-11 suggestion with a new keyword (e.g. meningitis)...');
    const t2 = Date.now();
    const res2 = await suggestICD10('meningitis');
    const t3 = Date.now();
    console.log(`Results for "meningitis":`, res2);
    console.log(`Time taken: ${t3 - t2}ms\n`);

    console.log('Testing ICD-11 suggestion with subsequent cached call (e.g. meningitis cache hit)...');
    const t4 = Date.now();
    const res3 = await suggestICD10('meningitis');
    const t5 = Date.now();
    console.log(`Results for "meningitis":`, res3);
    console.log(`Time taken: ${t5 - t4}ms\n`);

  } catch (err) {
    console.error('Test run failed:', err);
  } finally {
    process.exit(0);
  }
}

run();
