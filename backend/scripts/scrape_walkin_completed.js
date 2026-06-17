/**
 * scrape_walkin_completed.js
 * Scrapes Patient Waiting Status page:
 *   Patient Type : Out Patient  (ddlType = "O")
 *   Mode         : Walkin       (ddlAppoitement_Mode = "W")
 *   Dr. Status   : Completed    (rbStatus = "C")
 *   Date         : 09/06/2026 … 14/06/2026
 *
 * Run from repo root:
 *   node backend/scripts/scrape_walkin_completed.js
 *
 * Outputs:
 *   june_9_14_walkin_raw.json           — raw per-patient rows
 *   june_9_14_walkin_completions.md     — final .MD report
 *   june_9_14_walkin_completions.xlsx   — Excel workbook
 */

const axios   = require('axios');
const cheerio = require('cheerio');
const fs      = require('fs');
const path    = require('path');
const ExcelJS = require('exceljs');

// ── Config ────────────────────────────────────────────────────────────────────
const BASE     = 'http://41.173.250.126:8081/Legacy';
const LOGIN    = `${BASE}/forms/fm_login.aspx`;
const PAGE_URL = `${BASE}/forms/fm_HM_Patient_Waiting_Status.aspx`;
const USER     = 'lc_valery';
const PASS     = 'Amahamba@2110';

const DATES = [
  { label: 'June 9, 2026',  value: '09/06/2026' },
  { label: 'June 10, 2026', value: '10/06/2026' },
  { label: 'June 11, 2026', value: '11/06/2026' },
  { label: 'June 12, 2026', value: '12/06/2026' },
  { label: 'June 13, 2026', value: '13/06/2026' },
  { label: 'June 14, 2026', value: '14/06/2026' },
];

const OUT_DIR = path.join(__dirname, '../../');

// ── Helpers ───────────────────────────────────────────────────────────────────
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
      // Expected layout (0-indexed):
      // 0=SNo, 1=TokenNo, 2=Appt, 3=PatientID, 4=ServDate, 5=PatientName,
      // 6=Mobile, 7=Test/Package, 8=Reason, 9=Time, 10=Arrival, 11=Comp,
      // 12=Status, 13=Created, 14=Edited, 15=DoctorName, 16=Specialisation, 17=Comp(chk)
      const status = cells[12] || '';
      if (status.toLowerCase() === 'completed') {
        rows.push({
          sNo:           cells[0],
          patientId:     cells[3],
          patientName:   cells[5],
          doctor:        cells[15],
          specialisation: cells[16],
        });
      }
    }
  });
  return rows;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const jar = {}; // cookie store

  const client = axios.create({
    baseURL: BASE,
    maxRedirects: 10,
    withCredentials: true,
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  // Attach cookies to every request
  client.interceptors.request.use(cfg => {
    if (Object.keys(jar).length) {
      cfg.headers['Cookie'] = Object.entries(jar)
        .map(([k, v]) => `${k}=${v}`).join('; ');
    }
    return cfg;
  });

  // Harvest cookies from every response
  client.interceptors.response.use(res => {
    const setCookie = res.headers['set-cookie'] || [];
    for (const raw of setCookie) {
      const part = raw.split(';')[0];
      const [k, ...rest] = part.split('=');
      if (k) jar[k.trim()] = rest.join('=').trim();
    }
    return res;
  });

  // ── Step 1: GET login page ────────────────────────────────────────────────
  console.log('⏳ Fetching login page…');
  const loginGet = await client.get('/forms/fm_login.aspx');
  const $login   = cheerio.load(loginGet.data);
  const loginHidden = extractHiddenFields($login);

  // ── Step 2: POST credentials ──────────────────────────────────────────────
  console.log('⏳ Logging in…');
  const loginBody = buildFormData(loginHidden, {
    'ctl00$Main_Content$UserName': USER,
    'ctl00$Main_Content$Password': PASS,
    'ctl00$Main_Content$btnLogin': 'Login',
  });

  const loginPost = await client.post('/forms/fm_login.aspx', loginBody.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (loginPost.data.includes('Invalid') || loginPost.data.includes('login')) {
    const $lp = cheerio.load(loginPost.data);
    const err = $lp('.error, .alert, #ctl00_Main_Content_lblError').text().trim();
    if (err) { console.error('❌ Login failed:', err); process.exit(1); }
  }
  console.log('✅ Logged in.');

  // ── Step 3: GET waiting status page once to get fresh ViewState ───────────
  const pageGet  = await client.get(PAGE_URL);
  const $page    = cheerio.load(pageGet.data);
  let   hidden   = extractHiddenFields($page);

  // ── Step 4: Iterate dates ─────────────────────────────────────────────────
  const allRows  = {};
  const dayTotals = {};

  for (const { label, value } of DATES) {
    console.log(`\n📅 Fetching ${label} (${value})…`);

    const formBody = buildFormData(hidden, {
      // Patient Type = Out Patient
      'ctl00$Main_Content$ddlType':             'O',
      // Specialization = All (empty)
      'ctl00$Main_Content$ddlSpec':             '',
      // Doctor (empty = all)
      'ctl00$Main_Content$txtDoctor_Name':      '',
      'ctl00$Main_Content$hfDoctorID':          '',
      // Date
      'ctl00$Main_Content$txtDate':             value,
      // Arrival type = Arrived (C)
      'ctl00$Main_Content$rbArrival':           'C',
      // Patient name (empty)
      'ctl00$Main_Content$txtPat_Name':         '',
      // Dr. Status = Completed
      'ctl00$Main_Content$rbStatus':            'C',
      // Mode = Walkin
      'ctl00$Main_Content$ddlAppoitement_Mode': 'W',
      // Bill Type = Both
      'ctl00$Main_Content$ddlBill_Pay':         'B',
      // Filter = Doctor
      'ctl00$Main_Content$ddlFilter':           'O',
      // Trigger search (image button — send .x and .y)
      'ctl00$Main_Content$butView.x':           '10',
      'ctl00$Main_Content$butView.y':           '10',
    });

    const res  = await client.post(PAGE_URL, formBody.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const $r = cheerio.load(res.data);
    // Refresh hidden fields for next request
    hidden = extractHiddenFields($r);

    const rows = parseTable($r);
    allRows[label]   = rows;
    dayTotals[label] = rows.length;

    console.log(`   ✅ ${rows.length} completed walk-in patients found.`);
    await sleep(600);
  }

  // ── Step 5: Aggregate by doctor ───────────────────────────────────────────
  const doctorMap  = {}; // doctor → specialisation
  const dayDocCounts = {}; // date → { doctor → count }

  for (const { label } of DATES) {
    dayDocCounts[label] = {};
    for (const row of (allRows[label] || [])) {
      const doc  = row.doctor.trim();
      const spec = row.specialisation.trim();
      if (!doc) continue;
      doctorMap[doc] = spec;
      dayDocCounts[label][doc] = (dayDocCounts[label][doc] || 0) + 1;
    }
  }

  // Save raw JSON
  const rawPath = path.join(OUT_DIR, 'june_9_14_walkin_raw.json');
  fs.writeFileSync(rawPath, JSON.stringify({ dayTotals, allRows }, null, 2));
  console.log(`\n💾 Raw data saved → ${rawPath}`);

  // ── Step 6: Build department map ──────────────────────────────────────────
  const deptMap = {
    'PHYSIOTHERAPIST':            'Physiotherapy',
    'Pediatrician':               'Pediatrics',
    'Internist':                  'Internal Medicine',
    'Obstetrician & Gynaecologist': 'Gynecology',
    'Cardiologist':               'Internal Medicine',
    'DENTAL SURGEON':             'Dental',
    'Dentistry':                  'Dental',
    'Orthopedic Surgeon':         'Orthopedics',
    'General Surgeon':            'Surgery',
    'Urologist':                  'Urology',
    'Family Physcian':            'General Medicine',
    'General Practitioner':       'General Medicine',
    'Consultant ENT':             'ENT',
    'Neurologist':                'Neurology',
    'CLINICAL PSYCHOLOGIST':      'Mental Health',
  };

  const deptOf = (doc) => deptMap[doctorMap[doc]] || doctorMap[doc] || 'Other';
  const days   = DATES.map(d => d.label);
  const sortedDocs = Object.keys(doctorMap).sort((a, b) => {
    const da = deptOf(a), db = deptOf(b);
    return da !== db ? da.localeCompare(db) : a.localeCompare(b);
  });

  // ── Step 7: Write Markdown ────────────────────────────────────────────────
  const dayHeaders = days.map(d => d.replace(', 2026', '')).join(' | ');
  const sepLine    = days.map(() => ':---:').join(' | ');

  let md = `# Institutional Monthly Operational Matrix Report\n\n`;
  md    += `## Period: June 9, 2026 to June 14, 2026\n`;
  md    += `*Filter: Out Patient · Walk-in · Completed Dr. Status*\n\n`;
  md    += `### Patient Completions by Doctor and Department\n\n`;
  md    += `| Staff Specialist | Specialty / Department | ${dayHeaders} | Total |\n`;
  md    += `| :--- | :--- | ${sepLine} | :---: |\n`;

  const deptTotalsMap  = {};
  const allDocTotals   = {};
  days.forEach(d => { allDocTotals[d] = 0; deptTotalsMap[d] = {}; });

  for (const doc of sortedDocs) {
    const dept  = deptOf(doc);
    const vals  = days.map(d => dayDocCounts[d]?.[doc] || 0);
    const total = vals.reduce((s, v) => s + v, 0);
    const cells = vals.map(v => v > 0 ? v : '-').join(' | ');

    vals.forEach((v, i) => {
      allDocTotals[days[i]]      += v;
      deptTotalsMap[days[i]][dept] = (deptTotalsMap[days[i]][dept] || 0) + v;
    });

    md += `| ${doc} | ${dept} | ${cells} | ${total} |\n`;
  }

  const totCells  = days.map(d => allDocTotals[d]).join(' | ');
  const grandTotal = days.reduce((s, d) => s + allDocTotals[d], 0);
  md += `| **TOTAL COMPLETED PATIENTS** | | ${totCells} | **${grandTotal}** |\n\n`;

  // Dept summary
  const allDepts = [...new Set(sortedDocs.map(deptOf))].sort();
  md += `### Summary of Completions by Specialty / Department\n\n`;
  md += `| Specialty / Department | ${dayHeaders} | Total |\n`;
  md += `| :--- | ${sepLine} | :---: |\n`;
  for (const dept of allDepts) {
    const vals  = days.map(d => deptTotalsMap[d][dept] || 0);
    const total = vals.reduce((s, v) => s + v, 0);
    md += `| ${dept} | ${vals.map(v => v || '-').join(' | ')} | ${total} |\n`;
  }
  md += `| **TOTAL** | ${totCells} | **${grandTotal}** |\n\n`;

  md += `---\n*Report generated on ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}.*\n`;

  const mdPath = path.join(OUT_DIR, 'june_9_14_walkin_completions.md');
  fs.writeFileSync(mdPath, md);
  console.log(`📄 Markdown report → ${mdPath}`);

  // ── Step 8: Write Excel ───────────────────────────────────────────────────
  await buildExcel(sortedDocs, days, dayDocCounts, deptTotalsMap,
                   allDocTotals, grandTotal, deptOf, OUT_DIR);

  console.log('\n🎉 All done!');
  console.log('   MD  →', mdPath);
  console.log('   Raw →', rawPath);
}

// ── Excel builder ─────────────────────────────────────────────────────────────
async function buildExcel(sortedDocs, days, dayDocCounts, deptTotalsMap,
                          allDocTotals, grandTotal, deptOf, outDir) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LC Reporting Portal';
  wb.created = new Date();

  const BRAND  = '3453B7';
  const HEADER = '2C7AC3';
  const ALT    = 'F0F6FF';
  const WHITE  = 'FFFFFF';
  const SUBTOT = 'D9E8F8';

  const hFill = hex => ({ type:'pattern', pattern:'solid', fgColor:{ argb:'FF'+hex } });
  const bdr   = () => {
    const s = { style:'thin', color:{ argb:'FFBBCCE0' } };
    return { top:s, left:s, bottom:s, right:s };
  };
  const boldF  = (sz=10, col='FFFFFF') => ({ name:'Calibri', size:sz, bold:true,  color:{ argb:'FF'+col } });
  const normF  = (sz=10, col='2D2D2D') => ({ name:'Calibri', size:sz, bold:false, color:{ argb:'FF'+col } });

  function titleRow(ws, text, cols) {
    ws.mergeCells(`A1:${String.fromCharCode(64+cols)}1`);
    const c = ws.getCell('A1');
    c.value = text; c.font = boldF(14); c.fill = hFill(BRAND);
    c.alignment = { horizontal:'center', vertical:'middle' };
    ws.getRow(1).height = 32;

    ws.mergeCells(`A2:${String.fromCharCode(64+cols)}2`);
    const s = ws.getCell('A2');
    s.value = 'Period: June 9 – June 14, 2026   |   Filter: Out Patient · Walk-in · Completed';
    s.font = normF(10); s.fill = hFill(HEADER);
    s.alignment = { horizontal:'center' };
    ws.getRow(2).height = 20;
  }

  // Sheet 1 — By Doctor
  const ws1 = wb.addWorksheet('Completions by Doctor', { views:[{ state:'frozen', ySplit:3 }] });
  const shortDays = days.map(d => d.replace(', 2026', ''));
  titleRow(ws1, 'LEGACY CLINICS — Walk-in Completions by Doctor & Department', 9+shortDays.length);

  const hdrs1 = ['#', 'Staff Specialist', 'Specialty / Department', ...shortDays, 'Total'];
  const hRow  = ws1.getRow(3);
  hdrs1.forEach((h, i) => {
    const c = hRow.getCell(i+1);
    c.value = h; c.font = boldF(10); c.fill = hFill(HEADER);
    c.alignment = { horizontal: i<3 ? 'left':'center', vertical:'middle' };
    c.border = bdr();
  });
  hRow.height = 22;
  ws1.getColumn(1).width = 5;
  ws1.getColumn(2).width = 36;
  ws1.getColumn(3).width = 24;
  for (let i=4;i<=3+shortDays.length;i++) ws1.getColumn(i).width = 10;
  ws1.getColumn(4+shortDays.length).width = 10;

  let rn = 4, sn = 1;
  const allDepts = [...new Set(sortedDocs.map(deptOf))].sort();

  for (const dept of allDepts) {
    const group = sortedDocs.filter(d => deptOf(d) === dept);
    for (const doc of group) {
      const vals  = days.map(d => dayDocCounts[d]?.[doc] || 0);
      const total = vals.reduce((a,b)=>a+b,0);
      const isAlt = sn % 2 === 0;
      const row   = ws1.getRow(rn);
      [sn, doc, dept, ...vals, total].forEach((v,i) => {
        const c = row.getCell(i+1);
        c.value = (i>=3 && i<3+shortDays.length && v===0) ? '—' : v;
        c.font  = i===3+shortDays.length ? boldF(10,'1A1A2E') : normF(10,'2D2D2D');
        c.fill  = hFill(isAlt ? ALT : WHITE);
        c.alignment = { horizontal: i<3?'left':'center', vertical:'middle' };
        c.border = bdr();
      });
      row.height = 18; rn++; sn++;
    }
    // subtotal
    const subVals  = days.map(d => deptTotalsMap[d][dept] || 0);
    const subTotal = subVals.reduce((a,b)=>a+b,0);
    ws1.mergeCells(`B${rn}:C${rn}`);
    const sr = ws1.getRow(rn);
    sr.getCell(1).value = '';
    sr.getCell(2).value = `${dept} Subtotal`;
    sr.getCell(2).font  = boldF(10,'3453B7');
    sr.getCell(2).alignment = { horizontal:'left' };
    subVals.forEach((v,i) => {
      const c = sr.getCell(4+i);
      c.value = v; c.font = boldF(10,'1A1A2E');
      c.alignment = { horizontal:'center' };
    });
    sr.getCell(4+shortDays.length).value = subTotal;
    sr.getCell(4+shortDays.length).font  = boldF(10,'1A1A2E');
    sr.getCell(4+shortDays.length).alignment = { horizontal:'center' };
    sr.eachCell(c => { c.fill = hFill(SUBTOT); c.border = bdr(); });
    sr.height = 20; rn++;
  }

  // grand total
  const totVals = days.map(d => allDocTotals[d]);
  ws1.mergeCells(`A${rn}:C${rn}`);
  const tr = ws1.getRow(rn);
  tr.getCell(1).value = 'TOTAL COMPLETED PATIENTS';
  tr.getCell(1).font  = boldF(11); tr.getCell(1).fill = hFill(BRAND);
  tr.getCell(1).alignment = { horizontal:'center' };
  totVals.forEach((v,i) => {
    const c = tr.getCell(4+i);
    c.value = v; c.font = boldF(11); c.fill = hFill(BRAND);
    c.alignment = { horizontal:'center' };
  });
  tr.getCell(4+shortDays.length).value = grandTotal;
  tr.getCell(4+shortDays.length).font  = boldF(12); tr.getCell(4+shortDays.length).fill = hFill(BRAND);
  tr.getCell(4+shortDays.length).alignment = { horizontal:'center' };
  tr.eachCell(c => { c.border = bdr(); }); tr.height = 24;

  // Sheet 2 — Dept Summary
  const ws2 = wb.addWorksheet('Department Summary', { views:[{ state:'frozen', ySplit:3 }] });
  titleRow(ws2, 'LEGACY CLINICS — Completions by Specialty / Department', 8+shortDays.length);
  const hdrs2 = ['#', 'Specialty / Department', ...shortDays, 'Total', '% of Total'];
  ws2.getRow(3).values = hdrs2;
  ws2.getRow(3).eachCell((c,i) => {
    c.font = boldF(10); c.fill = hFill(HEADER);
    c.alignment = { horizontal: i<3?'left':'center', vertical:'middle' };
    c.border = bdr();
  });
  ws2.getRow(3).height = 22;
  ws2.getColumn(1).width = 5; ws2.getColumn(2).width = 28;
  for (let i=3;i<=2+shortDays.length;i++) ws2.getColumn(i).width = 11;
  ws2.getColumn(3+shortDays.length).width = 10;
  ws2.getColumn(4+shortDays.length).width = 12;

  allDepts.forEach((dept,idx) => {
    const vals  = days.map(d => deptTotalsMap[d][dept] || 0);
    const total = vals.reduce((a,b)=>a+b,0);
    const pct   = grandTotal > 0 ? ((total/grandTotal)*100).toFixed(1)+'%' : '0%';
    const r = ws2.getRow(4+idx);
    r.values = [idx+1, dept, ...vals, total, pct];
    r.eachCell((c,ci) => {
      c.font  = ci===3+shortDays.length ? boldF(10,'1A1A2E') : normF(10,'2D2D2D');
      c.fill  = hFill(idx%2===0 ? WHITE : ALT);
      c.alignment = { horizontal: ci<3?'left':'center', vertical:'middle' };
      c.border = bdr();
    });
    r.height = 18;
  });

  const tr2 = ws2.getRow(4+allDepts.length);
  ws2.mergeCells(`A${4+allDepts.length}:B${4+allDepts.length}`);
  tr2.getCell(1).value = 'TOTAL'; tr2.getCell(1).font = boldF(11);
  tr2.getCell(1).fill = hFill(BRAND); tr2.getCell(1).alignment = { horizontal:'center' };
  totVals.forEach((v,i) => {
    const c = tr2.getCell(3+i);
    c.value = v; c.font = boldF(11); c.fill = hFill(BRAND);
    c.alignment = { horizontal:'center' };
  });
  tr2.getCell(3+shortDays.length).value = grandTotal;
  tr2.getCell(3+shortDays.length).font  = boldF(12); tr2.getCell(3+shortDays.length).fill = hFill(BRAND);
  tr2.getCell(3+shortDays.length).alignment = { horizontal:'center' };
  tr2.getCell(4+shortDays.length).value = '100%';
  tr2.getCell(4+shortDays.length).font  = boldF(11); tr2.getCell(4+shortDays.length).fill = hFill(BRAND);
  tr2.getCell(4+shortDays.length).alignment = { horizontal:'center' };
  tr2.eachCell(c => { c.border = bdr(); }); tr2.height = 24;

  const xlPath = path.join(outDir, 'june_9_14_walkin_completions.xlsx');
  await wb.xlsx.writeFile(xlPath);
  console.log(`📊 Excel report   → ${xlPath}`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
