const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto('http://41.173.250.126:8081/Legacy/forms/fm_login.aspx', { waitUntil: 'networkidle2' });
    await page.type('#txtUserName', 'lc_valery');
    await page.type('#txtPassword', 'Amahamba@2110');
    await page.click('#butLogin');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    await page.goto('http://41.173.250.126:8081/Legacy/forms/fm_HM_Patient_Waiting_Status.aspx', { waitUntil: 'networkidle2' });
    
    await page.select('#ctl00_Main_Content_ddlAppoitement_Mode', 'W');
    await page.click('#ctl00_Main_Content_rbStatus_1');
    await page.select('#ctl00_Main_Content_ddlBill_Pay', 'B');
    
    await page.evaluate(() => {
      const el = document.querySelector('#ctl00_Main_Content_txtDate');
      el.value = '09/06/2026';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.click('#ctl00_Main_Content_butView');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const tableData = await page.evaluate(() => {
      // Find the grid table
      // Let's look for rows inside tables
      const tables = Array.from(document.querySelectorAll('table'));
      
      // Let's filter for tables that have header cells with "Patient" or "Doctor"
      const mainTable = tables.find(t => t.innerText.includes('Appt.') && t.innerText.includes('Doctor'));
      if (!mainTable) return { error: 'Main table not found' };
      
      const headers = Array.from(mainTable.querySelectorAll('tr')).slice(0, 3).map(tr => 
        Array.from(tr.querySelectorAll('th, td')).map(cell => ({
          text: cell.innerText.trim(),
          colspan: cell.getAttribute('colspan'),
          rowspan: cell.getAttribute('rowspan')
        }))
      );
      
      // Dump the first 10 rows with detailed cell info (including attributes, classes, etc.)
      const rows = Array.from(mainTable.querySelectorAll('tr')).slice(2, 12).map(tr => {
        return Array.from(tr.querySelectorAll('td')).map(td => ({
          text: td.innerText.trim(),
          html: td.innerHTML
        }));
      });
      
      return { headers, rows };
    });
    
    console.log('Headers:', JSON.stringify(tableData.headers, null, 2));
    console.log('Row 0:', JSON.stringify(tableData.rows[0], null, 2));
    console.log('Row 1:', JSON.stringify(tableData.rows[1], null, 2));
    
    await browser.close();
  } catch (err) {
    console.error('Error:', err);
  }
})();
