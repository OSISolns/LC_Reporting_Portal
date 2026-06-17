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
    await page.setViewport({ width: 1200, height: 800 });
    
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
    
    // Set Date directly using JS evaluate to avoid masking issues
    console.log('Setting Date via JS evaluate...');
    await page.evaluate(() => {
      const el = document.querySelector('#ctl00_Main_Content_txtDate');
      el.value = '09/06/2026';
      // Trigger events
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    
    // Wait a little bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Click View
    console.log('Clicking View button...');
    await page.click('#ctl00_Main_Content_butView');
    
    // Wait for AJAX update
    console.log('Waiting 5 seconds for data to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: '/home/noble/Documents/LC_APPS/LC_Reporting_Portal/test_page.png' });
    
    console.log('Screenshot saved!');
    await browser.close();
  } catch (err) {
    console.error('Error:', err);
  }
})();
