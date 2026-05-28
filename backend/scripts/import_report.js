const XLSX = require('xlsx');
const db = require('../src/config/db');
const DailyReport = require('../src/models/dailyReport');

(async () => {
  try {
    const config = await DailyReport.getConfig();
    const providers = config.providers;
    
    // Create a map from provider name to provider ID and department ID
    const providerMap = {};
    providers.forEach(p => {
      providerMap[p.name.trim().toLowerCase()] = { id: p.id, dept_id: p.department_id };
    });

    const workbook = XLSX.readFile('/home/noble/Documents/DAILY REPORT MAY 2026.xlsx1.xlsx');
    
    const months = [
      { sheetName: 'MARCH 2026', year: 2026, month: 3 },
      { sheetName: 'APRIL 2026', year: 2026, month: 4 }
    ];

    for (const { sheetName, year, month } of months) {
      console.log(`Processing ${sheetName}...`);
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        console.log(`Sheet ${sheetName} not found.`);
        continue;
      }
      
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      // data[0] is the header row.
      // Day numbers are typically from index 1 to 31
      
      const numDays = new Date(year, month, 0).getDate();
      
      const dailyData = {}; // { 'YYYY-MM-DD': { metrics: [], logs: [] } }
      
      for (let day = 1; day <= numDays; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dailyData[dateStr] = { metrics: [], logs: [] };
      }

      // Start reading rows from index 1
      for (let r = 1; r < data.length; r++) {
        const row = data[r];
        if (!row || !row[0]) continue;
        const rowName = row[0].toString().trim();
        if (rowName.startsWith('DAILY REPORT') || rowName.toUpperCase() === 'PATIENT COMPLETED') continue;

        // Check if it's a provider or a log metric
        const lowerName = rowName.toLowerCase();
        let matchedProvider = null;
        for (const pName in providerMap) {
           if (lowerName === pName || lowerName.replace('dr.', 'dr').replace('dr ', 'dr. ') === pName || lowerName.replace('dr ', 'dr.') === pName) {
              matchedProvider = providerMap[pName];
              break;
           }
        }
        
        if (!matchedProvider) {
           // Maybe direct match
           const directMatch = providers.find(p => p.name.trim().toLowerCase() === lowerName);
           if (directMatch) matchedProvider = { id: directMatch.id, dept_id: directMatch.department_id };
        }

        // Try fuzzy matching for provider
        if (!matchedProvider) {
          const matched = providers.find(p => lowerName.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(lowerName.replace('dr ', '')));
          if (matched) matchedProvider = { id: matched.id, dept_id: matched.department_id };
        }

        for (let day = 1; day <= numDays; day++) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          let val = row[day];
          if (val === undefined || val === null || val === '') continue;
          
          if (matchedProvider) {
            dailyData[dateStr].metrics.push({
              provider_id: matchedProvider.id,
              department_id: matchedProvider.dept_id,
              patient_count: val
            });
          } else {
            // It's a procedure log
            dailyData[dateStr].logs.push({
              metric_name: rowName,
              metric_value: String(val)
            });
          }
        }
      }

      // Save to DB
      for (const dateStr in dailyData) {
        const { metrics, logs } = dailyData[dateStr];
        if (metrics.length > 0 || logs.length > 0) {
          await DailyReport.saveDaily(dateStr, metrics, logs);
        }
      }
      console.log(`Saved data for ${sheetName}`);
    }
    
    console.log('Import completed!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
