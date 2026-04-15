const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const { getMedicalReportHTML } = require('./pdfTemplate');

/**
 * Generates a high-fidelity PDF using Puppeteer.
 */
const generateHighFidelityPDF = async (type, data, stream) => {
  let browser;
  try {
    const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';
    
    browser = await puppeteer.launch({
      args: isVercel ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: chromium.defaultViewport,
      executablePath: isVercel ? await chromium.executablePath() : '/usr/bin/google-chrome', // Fallback for local
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    
    // Generate HTML content
    const html = getMedicalReportHTML(type, data);
    
    // Set content and wait for it to render
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generate PDF buffer
    const pdfBuffer = await page.pdf({
      width:  '210mm',
      height: '297mm',
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    // Write buffer to stream
    stream.write(pdfBuffer);
    stream.end();
  } catch (err) {
    console.error('Puppeteer PDF Generation Error:', err);
    throw err;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Generates a PDF for a cancellation request.
 */
exports.generateCancellationPDF = async (data, stream) => {
  return generateHighFidelityPDF('CANCELLATION', data, stream);
};

/**
 * Generates a PDF for an incident report.
 */
exports.generateIncidentPDF = async (data, stream) => {
  return generateHighFidelityPDF('INCIDENT', data, stream);
};

/**
 * Generates a PDF for a refund request.
 */
exports.generateRefundPDF = async (data, stream) => {
  return generateHighFidelityPDF('REFUND', data, stream);
};
