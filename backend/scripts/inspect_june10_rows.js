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
      if (!grid) return { error: 'Grid not found' };
      
      const rows = Array.from(grid.querySelectorAll('tr'));
      const headerRow = rows[1]; // S.No, Token No, etc.
      const headers = Array.from(headerRow.querySelectorAll('th, td')).map(c => c.innerText.trim());
      
      const parsedRows = rows.slice(2).map((tr, idx) => {
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
        const html = tr.outerHTML;
        return { index: idx, cells, html };
      });
      
      // Filter for rows containing "Review" in any cell
      const reviewRows = parsedRows.filter(r => r.cells.some(c => c.toLowerCase().includes('review')));
      
      // Let's also check if there is an image/icon or checkmark in the "Review" column
      // We saw the header text has "Review" somewhere?
      // Let's check headers
      return { headers, totalRows: parsedRows.length, reviewRows: reviewRows.map(r => ({ index: r.index, cells: r.cells })), sampleRows: parsedRows.slice(0, 5).map(r => r.cells) };
    });
    
    console.log('Headers:', result.headers);
    console.log('Total rows:', result.totalRows);
    console.log('Review rows by cell text search:', JSON.stringify(result.reviewRows, null, 2));
    console.log('Sample rows:', JSON.stringify(result.sampleRows, null, 2));
    
    // Let's inspect the HTML of the first review row if found, or search for image tags in cells
    const htmlResult = await page.evaluate(() => {
      const grid = document.querySelector('#ctl00_Main_Content_gvStatus');
      if (!grid) return 'No grid';
      const rows = Array.from(grid.querySelectorAll('tr')).slice(2);
      
      // Let's check which cell index contains images or checkboxes
      const rowInfo = rows.map((tr, idx) => {
        const cells = Array.from(tr.querySelectorAll('td')).map((td, cIdx) => {
          const img = td.querySelector('img');
          const input = td.querySelector('input');
          return {
            cIdx,
            text: td.innerText.trim(),
            hasImg: !!img,
            imgSrc: img ? img.src : null,
            hasInput: !!input,
            inputType: input ? input.type : null,
            inputChecked: input ? input.checked : null
          };
        });
        return { idx, cells };
      });
      
      // Filter for rows where any cell has a checked input or an image containing "review" or similar
      const specialRows = rowInfo.filter(r => r.cells.some(c => c.hasImg || (c.hasInput && c.inputType === 'checkbox' && c.inputChecked)));
      
      return specialRows.slice(0, 5);
    });
    
    console.log('Special rows (with inputs/images):', JSON.stringify(htmlResult, null, 2));
    
    await browser.close();
  } catch (err) {
    console.error('Error:', err);
  }
})();
