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
    
    const elements = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(el => ({
        id: el.id,
        name: el.name,
        type: el.type,
        value: el.value
      }));
      
      const selects = Array.from(document.querySelectorAll('select')).map(el => ({
        id: el.id,
        name: el.name,
        options: Array.from(el.options).map(opt => ({ text: opt.text, value: opt.value }))
      }));
      
      const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(el => ({
        id: el.id,
        name: el.name,
        value: el.value || el.innerText
      }));
      
      return { inputs, selects, buttons };
    });
    
    fs.writeFileSync('elements_status_page.json', JSON.stringify(elements, null, 2));
    console.log('Successfully wrote element info!');
    await browser.close();
  } catch (err) {
    console.error('Error:', err);
  }
})();
