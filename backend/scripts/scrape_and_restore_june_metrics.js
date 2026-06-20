const axios   = require('axios');
const cheerio = require('cheerio');
const db      = require('../src/config/db');

// Config
const BASE     = 'http://41.173.250.126:8081/Legacy';
const LOGIN    = `${BASE}/forms/fm_login.aspx`;
const PAGE_URL = `${BASE}/forms/fm_HM_Patient_Waiting_Status.aspx`;
const USER     = 'lc_valery';
const PASS     = 'Amahamba@2110';

const DATES = [];
for (let d = 1; d <= 19; d++) {
  const dayStr = String(d).padStart(2, '0');
  DATES.push({
    dateStr: `2026-06-${dayStr}`,
    value: `${dayStr}/06/2026`
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractHiddenFields($) {
  const fields = {};
  $('input[type="hidden"]').each((_, el) => {
    const name = $(el).attr('name');
    const val  = $(el).attr('value') || '';
    if (name) fields[name] = val;
  });
  return fields;
}

function buildFormData(hidden, overrides) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(hidden)) params.set(k, v);
  for (const [k, v] of Object.entries(overrides)) params.set(k, v);
  return params;
}

function parseTable($) {
  const rows = [];
  $('table tr').each((_, tr) => {
    const cells = $(tr).find('td').map((_, td) => $(td).text().trim()).get();
    if (cells.length >= 16) {
      const status = cells[12] || '';
      if (status.toLowerCase() === 'completed') {
        rows.push({
          doctor:        cells[15],
          specialisation: cells[16],
        });
      }
    }
  });
  return rows;
}

const puppeteer = require('puppeteer-core');

function findProvider(doctorName, tursoProviders) {
  const clean = name => name.toLowerCase()
    .replace(/\b(dr|mr|miss|mrs|ms|ps)\.?\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const docTokens = clean(doctorName);
  if (docTokens.length === 0) return null;

  let bestMatch = null;
  let maxOverlap = 0;

  for (const prov of tursoProviders) {
    const provTokens = clean(prov.name);
    const overlap = docTokens.filter(t => provTokens.includes(t)).length;
    if (overlap > maxOverlap) {
      maxOverlap = overlap;
      bestMatch = prov;
    }
  }

  if (maxOverlap >= 1) {
    return bestMatch;
  }
  return null;
}

async function main() {
  console.log('🔌 Connecting to Turso...');
  const { rows: providers } = await db.query('SELECT id, name, specialization_id FROM providers');
  console.log(`Loaded ${providers.length} providers from Turso.`);

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  console.log('⏳ Navigating to login page...');
  await page.goto(LOGIN, { waitUntil: 'networkidle2' });
  
  console.log('⏳ Logging in…');
  await page.type('#txtUserName', USER);
  await page.type('#txtPassword', PASS);
  await page.click('#butLogin');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  
  const currentUrl = page.url();
  if (currentUrl.includes('fm_login')) {
      console.error('❌ Login failed: redirected back to login page.');
      await browser.close();
      process.exit(1);
  }
  console.log('✅ Logged in.');

  console.log('Navigating to Patient Waiting Status...');
  await page.goto(PAGE_URL, { waitUntil: 'networkidle2' });

  for (const { dateStr, value } of DATES) {
    console.log(`\n📅 Fetching ${dateStr} (${value})…`);

    // Set parameters on the page
    await page.select('#ctl00_Main_Content_ddlType', 'O');
    await page.select('#ctl00_Main_Content_ddlAppoitement_Mode', 'W');
    await page.select('#ctl00_Main_Content_ddlBill_Pay', 'B');
    await page.select('#ctl00_Main_Content_ddlFilter', 'O');
    
    // Set Date
    await page.evaluate(() => {
      document.querySelector('#ctl00_Main_Content_txtDate').value = '';
    });
    await page.type('#ctl00_Main_Content_txtDate', value);
    
    // Click View
    await page.click('#ctl00_Main_Content_butView');
    
    // Wait for data to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Scrape rows
    const rows = await page.evaluate(() => {
      const parsedRows = [];
      const trs = document.querySelectorAll('table tr');
      trs.forEach(tr => {
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
        if (cells.length >= 16) {
          const status = cells[12] || '';
          if (status.toLowerCase() === 'completed') {
            parsedRows.push({
              doctor: cells[15],
              specialisation: cells[16]
            });
          }
        }
      });
      return parsedRows;
    });

    console.log(`   ✅ Scraped ${rows.length} completed walk-in patients.`);

    // Group by doctor
    const docCounts = {};
    for (const r of rows) {
      const docName = r.doctor.trim();
      if (!docName) continue;
      docCounts[docName] = (docCounts[docName] || 0) + 1;
    }

    // Match to Turso providers
    const providerCounts = {};
    for (const [docName, count] of Object.entries(docCounts)) {
      const prov = findProvider(docName, providers);
      if (prov) {
        providerCounts[prov.id] = (providerCounts[prov.id] || 0) + count;
      } else {
        console.warn(`      ⚠️ Could not match doctor name "${docName}" to any provider.`);
      }
    }

    // Load existing metrics for this date to preserve follow_up_count
    const { rows: existingMetrics } = await db.query(
      'SELECT provider_id, specialization_id, follow_up_count FROM daily_report_metrics WHERE report_date = $1',
      [dateStr]
    );
    const existingMap = new Map();
    existingMetrics.forEach(m => {
      existingMap.set(m.provider_id, {
        specialization_id: m.specialization_id,
        follow_up_count: m.follow_up_count
      });
    });

    // We want to insert exactly 52 rows (one for each provider) to make the matrix clean
    const stmts = [];
    for (const prov of providers) {
      const patientCount = providerCounts[prov.id] || 0;
      const existing = existingMap.get(prov.id);
      const followUpCount = existing ? (existing.follow_up_count || 0) : 0;

      stmts.push({
        sql: `INSERT OR REPLACE INTO daily_report_metrics (report_date, provider_id, specialization_id, patient_count, follow_up_count)
              VALUES (?, ?, ?, ?, ?)`,
        args: [dateStr, prov.id, prov.specialization_id, patientCount, followUpCount]
      });
    }

    if (stmts.length > 0) {
      console.log(`   Saving metrics for ${dateStr} to Turso...`);
      await db.batch(stmts);
      console.log(`   ✅ Saved ${stmts.length} metrics rows.`);
    }
  }

  await browser.close();
  console.log('\n🎉 Finished scraping and restoring metrics!');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
