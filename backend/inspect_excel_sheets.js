const XLSX = require('xlsx');
try {
  const workbook = XLSX.readFile('/home/noble/Documents/DAILY REPORT MAY 2026.xlsx1.xlsx');
  console.log("Sheets:", workbook.SheetNames);
} catch (err) {
  console.error("Error reading file:", err.message);
}
