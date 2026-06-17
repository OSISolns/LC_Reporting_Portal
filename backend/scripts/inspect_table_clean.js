const puppeteer = require('puppeteer-core');

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
    
    const result = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table')).map((t, idx) => ({
        index: idx,
        id: t.id,
        className: t.className,
        textLength: t.innerText.length,
        snippet: t.innerText.substring(0, 100).replace(/\n/g, ' ')
      }));
      
      // Let's find the table that has class containing 'Grid' or 'grid' or ID containing 'Grid' or 'grid'
      const gridTable = document.querySelector('[id*="Grid"], [class*="Grid"], [id*="grid"], [class*="grid"]');
      let gridHtml = '';
      if (gridTable) {
        gridHtml = gridTable.outerHTML.substring(0, 1000);
      }
      
      // Let's also get the first row of any table that has headers
      const firstRow = document.querySelector('tr')?.innerText || 'No rows';
      
      return { tables, gridHtml, firstRow };
    });
    
    console.log('Tables:', JSON.stringify(result.tables, null, 2));
    console.log('Grid Table HTML snippet:', result.gridHtml);
    console.log('First Row text:', result.firstRow);
    
    await browser.close();
  } catch (err) {
    console.error('Error:', err);
  }
})();
