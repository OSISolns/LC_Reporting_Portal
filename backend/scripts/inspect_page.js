const puppeteer = require('puppeteer-core');

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
    
    console.log('Logging in...');
    await page.type('#txtUserName', 'lc_valery');
    await page.type('#txtPassword', 'Amahamba@2110');
    
    // Wait for the login button and click it
    await page.click('#butLogin');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    console.log('Logged in successfully, navigating to Patient Waiting Status page...');
    await page.goto('http://41.173.250.126:8081/Legacy/forms/fm_HM_Patient_Waiting_Status.aspx', { waitUntil: 'networkidle2' });
    
    console.log('Analyzing form elements...');
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
    
    console.log('Inputs:', JSON.stringify(elements.inputs, null, 2));
    console.log('Selects:', JSON.stringify(elements.selects, null, 2));
    console.log('Buttons:', JSON.stringify(elements.buttons, null, 2));
    
    await browser.close();
  } catch (err) {
    console.error('Error:', err);
  }
})();
