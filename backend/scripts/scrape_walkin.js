const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    console.log('Navigating to login page...');
    await page.goto('http://41.173.250.126:8081/Legacy/forms/fm_login.aspx', { waitUntil: 'networkidle2' });
    await page.type('#txtUserName', 'lc_valery');
    await page.type('#txtPassword', 'Amahamba@2110');
    await page.click('#butLogin');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    console.log('Navigating to Patient Waiting Status...');
    await page.goto('http://41.173.250.126:8081/Legacy/forms/fm_HM_Patient_Waiting_Status.aspx', { waitUntil: 'networkidle2' });
    
    // Set Mode to Walkin (value "W")
    console.log('Selecting Walkin mode...');
    await page.select('#ctl00_Main_Content_ddlAppoitement_Mode', 'W');
    
    // Set Status to Completed (click rbStatus_1)
    console.log('Selecting Completed status...');
    await page.click('#ctl00_Main_Content_rbStatus_1');
    
    // Set Bill Pay to Both (value "B")
    console.log('Selecting Bill Pay Both...');
    await page.select('#ctl00_Main_Content_ddlBill_Pay', 'B');
    
    // Set Date to 09/06/2026
    console.log('Setting Date...');
    await page.evaluate(() => {
      document.querySelector('#ctl00_Main_Content_txtDate').value = '';
    });
    await page.type('#ctl00_Main_Content_txtDate', '09/06/2026');
    
    // Click View
    console.log('Clicking View button...');
    await page.click('#ctl00_Main_Content_butView');
    
    // Wait for AJAX update
    console.log('Waiting 5 seconds for data to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Scraping table rows...');
    const tableData = await page.evaluate(() => {
      // Find the grid/table. Let's find all tables and print their IDs.
      const tables = Array.from(document.querySelectorAll('table')).map(t => ({ id: t.id, className: t.className }));
      
      const rows = [];
      const allRows = document.querySelectorAll('tr');
      allRows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.innerText.trim());
        if (cells.length > 0) {
          rows.push(cells);
        }
      });
      
      return { tables, rowCount: allRows.length, rows: rows.slice(0, 15) };
    });
    
    console.log('Found tables:', tableData.tables);
    console.log('Row count:', tableData.rowCount);
    console.log('Sample rows (first 15):');
    tableData.rows.forEach((r, idx) => {
      console.log(`Row ${idx}:`, r.join(' | '));
    });
    
    await browser.close();
  } catch (err) {
    console.error('Error:', err);
  }
})();
