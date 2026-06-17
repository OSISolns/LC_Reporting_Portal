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
      el.value = '10/06/2026';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.click('#ctl00_Main_Content_butView');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const result = await page.evaluate(() => {
      const grid = document.querySelector('#ctl00_Main_Content_gvStatus');
      if (!grid) return [];
      
      const rows = Array.from(grid.querySelectorAll('tr')).slice(2);
      return rows.map((tr, idx) => {
        const cells = Array.from(tr.querySelectorAll('td'));
        const lastCell = cells[19]; // index 19
        const img = lastCell ? lastCell.querySelector('img, input[type="image"]') : null;
        return {
          idx,
          patientName: cells[5]?.innerText.trim(),
          doctorName: cells[15]?.innerText.trim(),
          title: img ? img.getAttribute('title') : null,
          src: img ? img.getAttribute('src') : null
        };
      });
    });
    
    const uniqueFlags = {};
    result.forEach(r => {
      const key = `${r.title} | ${r.src}`;
      uniqueFlags[key] = (uniqueFlags[key] || 0) + 1;
    });
    console.log('Unique flags in column 19:', uniqueFlags);
    
    // Find the one that is different (e.g. not General)
    const nonGeneral = result.filter(r => r.title !== 'General');
    console.log('Non-General rows:', JSON.stringify(nonGeneral, null, 2));
    
    await browser.close();
  } catch (err) {
    console.error('Error:', err);
  }
})();
