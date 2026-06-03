const fs = require('fs');
const xlsx = require('xlsx');
const path = '/home/noble/Downloads/STOCK_LC';
const files = fs.readdirSync(path).filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'));

files.forEach(file => {
  const wb = xlsx.readFile(`${path}/${file}`);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
  
  // Find the header row by looking for "DESCRIPTION" or "ITEM"
  let headerRow = [];
  for (let i = 0; i < 10; i++) {
    if (!data[i]) continue;
    if (data[i].some(cell => typeof cell === 'string' && cell.toUpperCase().includes('DESCRIPTION'))) {
      headerRow = data[i];
      break;
    }
  }
  console.log(`\n--- ${file} ---`);
  console.log(headerRow.filter(Boolean).map(h => h.trim()));
});
