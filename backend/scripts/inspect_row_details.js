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
        // get details of the last 4 cells (from index 16 to 19)
        const lastCells = cells.slice(16).map((td, cIdx) => {
          const checkbox = td.querySelector('input[type="checkbox"]');
          const img = td.querySelector('img, input[type="image"]');
          return {
            cIdx: 16 + cIdx,
            text: td.innerText.trim(),
            html: td.innerHTML.trim(),
            hasCheckbox: !!checkbox,
            checkboxChecked: checkbox ? checkbox.checked : null,
            hasImg: !!img,
            imgSrc: img ? (img.src || img.getAttribute('src')) : null
          };
        });
        
        // Find if it has any checkbox checked or any special image
        return {
          idx,
          patientId: cells[3]?.innerText.trim(),
          patientName: cells[5]?.innerText.trim(),
          doctorName: cells[15]?.innerText.trim(),
          lastCells
        };
      });
    });
    
    // Print rows where the 18th column (index 17) is a checkbox and check its values
    // Or check index 18 (Review checkbox?)
    const checkedRows = result.filter(r => r.lastCells.some(c => c.checkboxChecked === true || c.checkboxChecked === false || c.hasCheckbox));
    console.log('Total rows found:', result.length);
    console.log('Sample row last cells:', JSON.stringify(result[0]?.lastCells, null, 2));
    
    // Find if any checkbox is checked or if there's a difference in checked state
    const checkboxAnalysis = result.map(r => {
      const cbCell = r.lastCells.find(c => c.hasCheckbox);
      return {
        idx: r.idx,
        patientName: r.patientName,
        doctorName: r.doctorName,
        hasCheckbox: cbCell ? true : false,
        checked: cbCell ? cbCell.checkboxChecked : null,
        html: cbCell ? cbCell.html : ''
      };
    });
    
    const checked = checkboxAnalysis.filter(c => c.checked === true);
    const unchecked = checkboxAnalysis.filter(c => c.checked === false);
    
    console.log('Number of checked checkboxes:', checked.length);
    console.log('Number of unchecked checkboxes:', unchecked.length);
    if (checked.length > 0) {
      console.log('First checked row:', JSON.stringify(checked[0], null, 2));
    }
    if (unchecked.length > 0) {
      console.log('First unchecked row:', JSON.stringify(unchecked[0], null, 2));
    }
    
    await browser.close();
  } catch (err) {
    console.error('Error:', err);
  }
})();
