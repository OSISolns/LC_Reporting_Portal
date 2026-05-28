const XLSX = require('xlsx');

const workbook = XLSX.readFile('/home/noble/Documents/DAILY REPORT MAY 2026.xlsx1.xlsx');
const sheet = workbook.Sheets['MARCH 2026'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log(JSON.stringify(data.slice(0, 15), null, 2));
