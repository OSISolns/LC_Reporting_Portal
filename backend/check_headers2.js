const fs = require('fs');
const xlsx = require('xlsx');
const path = '/home/noble/Downloads/STOCK_LC';

const check = (file) => {
  const wb = xlsx.readFile(`${path}/${file}`);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
  console.log(`\n--- ${file} ---`);
  for (let i = 0; i < 5; i++) {
    if (data[i]) console.log(data[i].filter(Boolean));
  }
}

check('Copy of Medical Store status Remaining in departements April-2026.xls');
check('Copy of Physical inventory for labo frigde Biochemestry April-26.xls');
