const ExcelJS = require('exceljs');
const path = require('path');

const days = ['June 9', 'June 10', 'June 11', 'June 12', 'June 13', 'June 14'];
const dayKeys = ['Jun9', 'Jun10', 'Jun11', 'Jun12', 'Jun13', 'Jun14'];

// ── RAW DATA ─────────────────────────────────────────────────────────────────
const doctorRows = [
  { name: 'Dr. Roger Anamali',              dept: 'Dental',            Jun9:12, Jun10:23, Jun11:0,  Jun12:16, Jun13:21, Jun14:31 },
  { name: 'Dr. Ernest Mugesera',            dept: 'Dental',            Jun9:2,  Jun10:0,  Jun11:10, Jun12:0,  Jun13:15, Jun14:8  },
  { name: 'Dr. Bede Bana',                  dept: 'Dental',            Jun9:4,  Jun10:0,  Jun11:5,  Jun12:0,  Jun13:0,  Jun14:1  },
  { name: 'Eric Rutaganda',                 dept: 'Dental',            Jun9:0,  Jun10:6,  Jun11:1,  Jun12:7,  Jun13:0,  Jun14:0  },
  { name: 'Ishimwe Gilbert',                dept: 'Dental',            Jun9:0,  Jun10:0,  Jun11:0,  Jun12:0,  Jun13:5,  Jun14:6  },
  { name: 'Kalisa Gilbert',                 dept: 'Dental',            Jun9:3,  Jun10:3,  Jun11:6,  Jun12:8,  Jun13:12, Jun14:0  },
  { name: 'Dr. Esperance Nyiraneza',        dept: 'Dental',            Jun9:0,  Jun10:3,  Jun11:7,  Jun12:5,  Jun13:0,  Jun14:0  },
  { name: 'Dr. Aristote Hakizimana',        dept: 'ENT',               Jun9:10, Jun10:27, Jun11:0,  Jun12:0,  Jun13:26, Jun14:0  },
  { name: 'Dr. JMV Dushimiyimana',          dept: 'ENT',               Jun9:0,  Jun10:0,  Jun11:22, Jun12:0,  Jun13:0,  Jun14:13 },
  { name: 'Dr. Gihana Jacques',             dept: 'General Medicine',  Jun9:21, Jun10:20, Jun11:21, Jun12:1,  Jun13:8,  Jun14:0  },
  { name: 'Ngabo Ntaganda Fabrice',         dept: 'General Medicine',  Jun9:1,  Jun10:0,  Jun11:0,  Jun12:0,  Jun13:0,  Jun14:0  },
  { name: 'Dr. Yves Laurent Bizimana',      dept: 'General Medicine',  Jun9:11, Jun10:26, Jun11:29, Jun12:12, Jun13:0,  Jun14:13 },
  { name: 'Dr. Alphonse Butoyi',            dept: 'Gynecology',        Jun9:47, Jun10:45, Jun11:53, Jun12:22, Jun13:19, Jun14:0  },
  { name: 'Dr. Bertin Sitini',              dept: 'Gynecology',        Jun9:0,  Jun10:0,  Jun11:0,  Jun12:0,  Jun13:29, Jun14:0  },
  { name: 'Dr. David Ntirushwa',            dept: 'Gynecology',        Jun9:0,  Jun10:0,  Jun11:0,  Jun12:26, Jun13:0,  Jun14:22 },
  { name: 'Dr. Valens Nkubito',             dept: 'Gynecology',        Jun9:0,  Jun10:0,  Jun11:0,  Jun12:0,  Jun13:0,  Jun14:27 },
  { name: 'Dr. Darius Dufatanye',           dept: 'Internal Medicine', Jun9:0,  Jun10:0,  Jun11:0,  Jun12:0,  Jun13:28, Jun14:22 },
  { name: 'Dr. Oswald Habyarimana',         dept: 'Internal Medicine', Jun9:67, Jun10:0,  Jun11:0,  Jun12:0,  Jun13:0,  Jun14:42 },
  { name: 'Dr. Maguy Mbabazi',              dept: 'Internal Medicine', Jun9:0,  Jun10:0,  Jun11:0,  Jun12:31, Jun13:0,  Jun14:0  },
  { name: 'Dr. Osee Sebatunzi',             dept: 'Internal Medicine', Jun9:0,  Jun10:0,  Jun11:65, Jun12:0,  Jun13:52, Jun14:0  },
  { name: 'Dr. Anthony Bazatsinda',         dept: 'Internal Medicine', Jun9:0,  Jun10:59, Jun11:0,  Jun12:0,  Jun13:40, Jun14:0  },
  { name: 'Dr. Jean Marie Vianney Ganza',   dept: 'Internal Medicine', Jun9:23, Jun10:19, Jun11:26, Jun12:31, Jun13:0,  Jun14:1  },
  { name: 'Dr. Eric Rutaganda',             dept: 'Internal Medicine', Jun9:0,  Jun10:0,  Jun11:61, Jun12:0,  Jun13:0,  Jun14:71 },
  { name: 'Dr. Shema David Nshuti',         dept: 'Internal Medicine', Jun9:25, Jun10:42, Jun11:0,  Jun12:56, Jun13:0,  Jun14:0  },
  { name: 'Mr. Innocent Nsengiyumva',       dept: 'Mental Health',     Jun9:0,  Jun10:2,  Jun11:2,  Jun12:2,  Jun13:0,  Jun14:0  },
  { name: 'Dr. Sylvestre Mutungirehe',      dept: 'Neurology',         Jun9:0,  Jun10:0,  Jun11:38, Jun12:0,  Jun13:65, Jun14:32 },
  { name: 'Dr. Claire Karekezi',            dept: 'Neurology',         Jun9:0,  Jun10:7,  Jun11:0,  Jun12:3,  Jun13:0,  Jun14:0  },
  { name: 'Dr. Stephen Kwesiga',            dept: 'Orthopedics',       Jun9:26, Jun10:0,  Jun11:35, Jun12:0,  Jun13:27, Jun14:0  },
  { name: 'Dr. Allen Jean De La Croix Ingabire', dept: 'Orthopedics', Jun9:0,  Jun10:4,  Jun11:0,  Jun12:5,  Jun13:0,  Jun14:0  },
  { name: 'Dr. Marie Grace Kansayisa',      dept: 'Orthopedics',       Jun9:0,  Jun10:19, Jun11:0,  Jun12:0,  Jun13:0,  Jun14:15 },
  { name: 'Dr. Agnes Mukaruziga',           dept: 'Pediatrics',        Jun9:0,  Jun10:0,  Jun11:63, Jun12:0,  Jun13:0,  Jun14:0  },
  { name: 'Dr. Aimable Kanyamuhunga',       dept: 'Pediatrics',        Jun9:89, Jun10:0,  Jun11:0,  Jun12:77, Jun13:32, Jun14:81 },
  { name: 'Dr. Jean Claude Kabayiza',       dept: 'Pediatrics',        Jun9:0,  Jun10:73, Jun11:0,  Jun12:0,  Jun13:94, Jun14:0  },
  { name: 'Ingabire Jean Paul',             dept: 'Physiotherapy',     Jun9:6,  Jun10:0,  Jun11:0,  Jun12:19, Jun13:0,  Jun14:17 },
  { name: 'Karimwabo Jean Claude',          dept: 'Physiotherapy',     Jun9:0,  Jun10:0,  Jun11:4,  Jun12:8,  Jun13:0,  Jun14:14 },
  { name: 'Mukarugwiza Francine',           dept: 'Physiotherapy',     Jun9:0,  Jun10:0,  Jun11:9,  Jun12:7,  Jun13:9,  Jun14:0  },
  { name: 'Mutesi Leah',                    dept: 'Physiotherapy',     Jun9:9,  Jun10:11, Jun11:6,  Jun12:8,  Jun13:0,  Jun14:0  },
  { name: 'Naze Thierry',                   dept: 'Physiotherapy',     Jun9:13, Jun10:9,  Jun11:12, Jun12:0,  Jun13:12, Jun14:0  },
  { name: 'Nsengimana Emmanuel',            dept: 'Physiotherapy',     Jun9:17, Jun10:0,  Jun11:0,  Jun12:0,  Jun13:0,  Jun14:0  },
  { name: 'Uwamahoro Sarah',                dept: 'Physiotherapy',     Jun9:0,  Jun10:17, Jun11:4,  Jun12:0,  Jun13:6,  Jun14:0  },
  { name: 'Dr. Desire Rubanguka',           dept: 'Surgery',           Jun9:15, Jun10:0,  Jun11:0,  Jun12:0,  Jun13:0,  Jun14:0  },
  { name: 'Dr. Alexandre Nyirimodoka',      dept: 'Urology',           Jun9:12, Jun10:0,  Jun11:0,  Jun12:0,  Jun13:0,  Jun14:33 },
  { name: 'Dr. Gasana Africa',              dept: 'Urology',           Jun9:0,  Jun10:13, Jun11:0,  Jun12:0,  Jun13:0,  Jun14:0  },
];

const procedures = [
  { name: 'BLOOD SAMPLE COLLECTION/PRELEVEMENT ADULTE',  count: 345 },
  { name: 'BLOOD SAMPLE COLLECTION/PRELEVEMENT ENFANT',  count: 128 },
  { name: 'NEBULISATION/ENFANT',                         count: 28  },
  { name: 'VACCINATION',                                 count: 28  },
  { name: 'Insertion of IUD COPPER',                     count: 8   },
  { name: 'IV INFUSION/PERFUSION ADULTE',                count: 7   },
  { name: 'MEDICAL REPORT',                              count: 7   },
  { name: 'TOP UP',                                      count: 5   },
  { name: 'I.MINJECTION',                                count: 3   },
  { name: 'IV INFUSION/PERFUSION ENFANT',                count: 3   },
  { name: 'NEBULISATION/ADULTE',                         count: 3   },
  { name: 'POP REMOVAL/ABLATION PLATRE (CAST REMOVAL)',  count: 3   },
  { name: 'WIDE AWAKE LOCAL ANESTHESIA (WALAT)',          count: 3   },
  { name: 'INSERTION OF IMPLANT/INSERTION DE NORPLAN',   count: 2   },
  { name: 'MANUAL VACUUM ASPIRATION (MVA)',               count: 2   },
  { name: 'MEDICAL CERTIFICATE',                         count: 2   },
  { name: 'SEDATION AND ANALGESIA',                      count: 2   },
  { name: 'TOP UP FOR ALPHA FETO PROTEIN',               count: 2   },
  { name: 'BELOW ELBOW CAST',                            count: 1   },
  { name: 'DEPOT PROVERANT',                             count: 1   },
  { name: 'ORAL TOILET',                                 count: 1   },
  { name: 'REMOVAL OF IMPLANT/ABLATION DE NORPLAN',      count: 1   },
  { name: 'REMOVAL OF INGROWING NAIL/ONGLE INCARNEE',    count: 1   },
  { name: 'Removal of IUD/ABLATION IUD',                 count: 1   },
  { name: 'REMOVAL OF SUTURES/ABLATION FILS',            count: 1   },
];

// ── HELPERS ──────────────────────────────────────────────────────────────────
const BRAND   = '3453B7';
const HEADER  = '2C7AC3';
const SUBTOT  = 'D9E8F8';
const TOTAL   = 'E8F4E8';
const ALT     = 'F5F9FF';
const WHITE   = 'FFFFFF';

function headerFill(hex) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } };
}
function border() {
  const s = { style: 'thin', color: { argb: 'FFBBCCE0' } };
  return { top: s, left: s, bottom: s, right: s };
}
function boldFont(size = 11, color = '1A1A2E') {
  return { name: 'Calibri', size, bold: true, color: { argb: 'FF' + color } };
}
function normalFont(size = 10, color = '2D2D2D') {
  return { name: 'Calibri', size, color: { argb: 'FF' + color } };
}

// ── BUILD WORKBOOK ────────────────────────────────────────────────────────────
async function buildExcel() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LC Reporting Portal';
  wb.created = new Date();

  // ── Sheet 1: Completions by Doctor ────────────────────────────────────────
  const ws1 = wb.addWorksheet('Completions by Doctor', { views: [{ state: 'frozen', ySplit: 3 }] });

  // Title row
  ws1.mergeCells('A1:J1');
  const title1 = ws1.getCell('A1');
  title1.value  = 'LEGACY CLINICS — Patient Completions by Doctor & Department';
  title1.font   = boldFont(14, WHITE);
  title1.fill   = headerFill(BRAND);
  title1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws1.getRow(1).height = 32;

  // Sub-title
  ws1.mergeCells('A2:J2');
  const sub1 = ws1.getCell('A2');
  sub1.value = 'Period: June 9, 2026 – June 14, 2026   |   Source: Patient Waiting Status System (Walk-in / Completed)';
  sub1.font  = normalFont(10, WHITE);
  sub1.fill  = headerFill(HEADER);
  sub1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws1.getRow(2).height = 20;

  // Column headers
  const hdrs1 = ['#', 'Staff Specialist', 'Specialty / Department', ...days, 'Total'];
  const hdrRow1 = ws1.getRow(3);
  hdrs1.forEach((h, i) => {
    const c = hdrRow1.getCell(i + 1);
    c.value = h;
    c.font  = boldFont(10, WHITE);
    c.fill  = headerFill(HEADER);
    c.alignment = { horizontal: i < 3 ? 'left' : 'center', vertical: 'middle' };
    c.border = border();
  });
  hdrRow1.height = 22;

  // Column widths
  ws1.getColumn(1).width = 5;
  ws1.getColumn(2).width = 36;
  ws1.getColumn(3).width = 22;
  for (let i = 4; i <= 9; i++) ws1.getColumn(i).width = 10;
  ws1.getColumn(10).width = 10;

  // Data rows grouped by department
  const depts = [...new Set(doctorRows.map(d => d.dept))].sort();
  let rowNum = 4;
  let sNo = 1;

  for (const dept of depts) {
    const group = doctorRows.filter(d => d.dept === dept);

    // Dept subtotal
    const deptTotals = dayKeys.map(k => group.reduce((s, d) => s + (d[k] || 0), 0));
    const deptGrand  = deptTotals.reduce((a, b) => a + b, 0);

    for (const doc of group) {
      const row = ws1.getRow(rowNum);
      const vals = dayKeys.map(k => doc[k] || 0);
      const total = vals.reduce((a, b) => a + b, 0);
      const isAlt = sNo % 2 === 0;

      [sNo, doc.name, doc.dept, ...vals, total].forEach((v, i) => {
        const c = row.getCell(i + 1);
        c.value = v === 0 && i >= 3 && i < 9 ? '—' : v;
        c.font   = normalFont(10);
        c.fill   = headerFill(isAlt ? ALT : WHITE);
        c.alignment = { horizontal: i < 3 ? 'left' : 'center', vertical: 'middle' };
        c.border = border();
      });
      row.getCell(10).font = boldFont(10);
      row.height = 18;
      rowNum++;
      sNo++;
    }

    // Dept subtotal row
    const subRow = ws1.getRow(rowNum);
    ws1.mergeCells(`B${rowNum}:C${rowNum}`);
    subRow.getCell(1).value = '';
    subRow.getCell(2).value = `${dept} Subtotal`;
    subRow.getCell(2).font  = boldFont(10, BRAND);
    subRow.getCell(2).alignment = { horizontal: 'left' };
    deptTotals.forEach((v, i) => {
      const c = subRow.getCell(4 + i);
      c.value = v; c.font = boldFont(10); c.alignment = { horizontal: 'center' };
    });
    subRow.getCell(10).value = deptGrand;
    subRow.getCell(10).font  = boldFont(10);
    subRow.getCell(10).alignment = { horizontal: 'center' };
    subRow.eachCell(c => {
      c.fill   = headerFill(SUBTOT);
      c.border = border();
    });
    subRow.height = 20;
    rowNum++;
  }

  // Grand total row
  const dayTotals = dayKeys.map(k => doctorRows.reduce((s, d) => s + (d[k] || 0), 0));
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);
  const totRow = ws1.getRow(rowNum);
  ws1.mergeCells(`A${rowNum}:C${rowNum}`);
  totRow.getCell(1).value = 'TOTAL COMPLETED PATIENTS';
  totRow.getCell(1).font  = boldFont(11, WHITE);
  totRow.getCell(1).fill  = headerFill(BRAND);
  totRow.getCell(1).alignment = { horizontal: 'center' };
  dayTotals.forEach((v, i) => {
    const c = totRow.getCell(4 + i);
    c.value = v; c.font = boldFont(11, WHITE);
    c.fill  = headerFill(BRAND); c.alignment = { horizontal: 'center' };
  });
  totRow.getCell(10).value = grandTotal;
  totRow.getCell(10).font  = boldFont(12, WHITE);
  totRow.getCell(10).fill  = headerFill(BRAND);
  totRow.getCell(10).alignment = { horizontal: 'center' };
  totRow.eachCell(c => { c.border = border(); });
  totRow.height = 24;

  // ── Sheet 2: Department Summary ───────────────────────────────────────────
  const ws2 = wb.addWorksheet('Department Summary', { views: [{ state: 'frozen', ySplit: 3 }] });

  ws2.mergeCells('A1:I1');
  const t2 = ws2.getCell('A1');
  t2.value = 'LEGACY CLINICS — Completions by Specialty / Department';
  t2.font  = boldFont(14, WHITE);
  t2.fill  = headerFill(BRAND);
  t2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws2.getRow(1).height = 32;

  ws2.mergeCells('A2:I2');
  const s2 = ws2.getCell('A2');
  s2.value = 'Period: June 9, 2026 – June 14, 2026';
  s2.font  = normalFont(10, WHITE);
  s2.fill  = headerFill(HEADER);
  s2.alignment = { horizontal: 'center' };
  ws2.getRow(2).height = 20;

  const hdrs2 = ['#', 'Specialty / Department', ...days, 'Total', '% of Total'];
  ws2.getRow(3).values = hdrs2;
  ws2.getRow(3).eachCell((c, ci) => {
    c.font  = boldFont(10, WHITE);
    c.fill  = headerFill(HEADER);
    c.alignment = { horizontal: ci < 3 ? 'left' : 'center', vertical: 'middle' };
    c.border = border();
  });
  ws2.getRow(3).height = 22;
  ws2.getColumn(1).width = 5;
  ws2.getColumn(2).width = 26;
  for (let i = 3; i <= 8; i++) ws2.getColumn(i).width = 11;
  ws2.getColumn(9).width  = 10;
  ws2.getColumn(10).width = 12;

  let dRow = 4;
  depts.forEach((dept, idx) => {
    const group = doctorRows.filter(d => d.dept === dept);
    const dv    = dayKeys.map(k => group.reduce((s, d) => s + (d[k] || 0), 0));
    const dt    = dv.reduce((a, b) => a + b, 0);
    const pct   = ((dt / grandTotal) * 100).toFixed(1) + '%';
    const r     = ws2.getRow(dRow);
    r.values    = [idx + 1, dept, ...dv, dt, pct];
    r.eachCell((c, ci) => {
      c.font      = ci === 9 ? boldFont(10) : normalFont(10);
      c.fill      = headerFill(idx % 2 === 0 ? WHITE : ALT);
      c.alignment = { horizontal: ci < 3 ? 'left' : 'center', vertical: 'middle' };
      c.border    = border();
    });
    r.height = 18;
    dRow++;
  });

  // Totals
  const tr2 = ws2.getRow(dRow);
  ws2.mergeCells(`A${dRow}:B${dRow}`);
  tr2.getCell(1).value = 'TOTAL';
  tr2.getCell(1).font  = boldFont(11, WHITE);
  tr2.getCell(1).fill  = headerFill(BRAND);
  tr2.getCell(1).alignment = { horizontal: 'center' };
  dayTotals.forEach((v, i) => {
    const c = tr2.getCell(3 + i);
    c.value = v; c.font = boldFont(11, WHITE);
    c.fill  = headerFill(BRAND); c.alignment = { horizontal: 'center' };
  });
  tr2.getCell(9).value = grandTotal;
  tr2.getCell(9).font  = boldFont(12, WHITE);
  tr2.getCell(9).fill  = headerFill(BRAND);
  tr2.getCell(9).alignment = { horizontal: 'center' };
  tr2.getCell(10).value = '100%';
  tr2.getCell(10).font  = boldFont(11, WHITE);
  tr2.getCell(10).fill  = headerFill(BRAND);
  tr2.getCell(10).alignment = { horizontal: 'center' };
  tr2.eachCell(c => { c.border = border(); });
  tr2.height = 24;

  // ── Sheet 3: Procedures ───────────────────────────────────────────────────
  const ws3 = wb.addWorksheet('Nursing & Ward Procedures', { views: [{ state: 'frozen', ySplit: 3 }] });

  ws3.mergeCells('A1:D1');
  const t3 = ws3.getCell('A1');
  t3.value = 'LEGACY CLINICS — Nursing & Ward Procedures';
  t3.font  = boldFont(14, WHITE);
  t3.fill  = headerFill(BRAND);
  t3.alignment = { horizontal: 'center', vertical: 'middle' };
  ws3.getRow(1).height = 32;

  ws3.mergeCells('A2:D2');
  const s3 = ws3.getCell('A2');
  s3.value = 'Period: June 9, 2026 – June 14, 2026   |   All departments combined';
  s3.font  = normalFont(10, WHITE);
  s3.fill  = headerFill(HEADER);
  s3.alignment = { horizontal: 'center' };
  ws3.getRow(2).height = 20;

  const hdrs3 = ['#', 'Procedure Name', 'Total Count', '% of Total'];
  ws3.getRow(3).values = hdrs3;
  ws3.getRow(3).eachCell(c => {
    c.font  = boldFont(10, WHITE);
    c.fill  = headerFill(HEADER);
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = border();
  });
  ws3.getRow(3).height = 22;
  ws3.getColumn(1).width = 5;
  ws3.getColumn(2).width = 52;
  ws3.getColumn(3).width = 14;
  ws3.getColumn(4).width = 12;

  const totalProc = procedures.reduce((s, p) => s + p.count, 0);
  procedures.forEach((p, idx) => {
    const r   = ws3.getRow(4 + idx);
    const pct = ((p.count / totalProc) * 100).toFixed(1) + '%';
    r.values  = [idx + 1, p.name, p.count, pct];
    r.eachCell((c, ci) => {
      c.font      = ci === 3 ? boldFont(10) : normalFont(10);
      c.fill      = headerFill(idx % 2 === 0 ? WHITE : ALT);
      c.alignment = { horizontal: ci === 2 ? 'left' : 'center', vertical: 'middle' };
      c.border    = border();
    });
    r.height = 18;
  });

  const pTotRow = ws3.getRow(4 + procedures.length);
  ws3.mergeCells(`A${4 + procedures.length}:B${4 + procedures.length}`);
  pTotRow.getCell(1).value = 'TOTAL PROCEDURES';
  pTotRow.getCell(1).font  = boldFont(11, WHITE);
  pTotRow.getCell(1).fill  = headerFill(BRAND);
  pTotRow.getCell(1).alignment = { horizontal: 'center' };
  pTotRow.getCell(3).value = totalProc;
  pTotRow.getCell(3).font  = boldFont(12, WHITE);
  pTotRow.getCell(3).fill  = headerFill(BRAND);
  pTotRow.getCell(3).alignment = { horizontal: 'center' };
  pTotRow.getCell(4).value = '100%';
  pTotRow.getCell(4).font  = boldFont(11, WHITE);
  pTotRow.getCell(4).fill  = headerFill(BRAND);
  pTotRow.getCell(4).alignment = { horizontal: 'center' };
  pTotRow.eachCell(c => { c.border = border(); });
  pTotRow.height = 24;

  // ── Write file ────────────────────────────────────────────────────────────
  const outPath = path.join(__dirname, '../../june_9_14_completions_report.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log('✅ Excel report written to:', outPath);
}

buildExcel().catch(err => { console.error('❌ Error:', err); process.exit(1); });
