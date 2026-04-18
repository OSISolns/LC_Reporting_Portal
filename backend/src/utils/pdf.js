const { getMedicalReportHTML } = require('./pdfTemplate');

/**
 * Generates a high-fidelity PDF using Puppeteer.
 * Optimized for Vercel Serverless Functions and local development.
 */
const generateHighFidelityPDF = async (type, data, stream) => {
  let chromium, puppeteer;
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL;

  try {
    if (isProd) {
      // Production (Vercel) setup
      chromium = require('@sparticuz/chromium');
      puppeteer = require('puppeteer-core');
    } else {
      // Local development setup
      // We use puppeteer-core + locally installed chrome to stay lightweight
      puppeteer = require('puppeteer-core');
      // No chromium required for local if we have a direct path to Chrome/Chromium
    }
  } catch (err) {
    console.error('Dependency Loading Error:', err);
    throw new Error('PDF generation dependencies missing. Please install @sparticuz/chromium and puppeteer-core.');
  }

  let browser;
  try {
    const launchConfig = isProd ? {
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    } : {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: '/usr/bin/google-chrome', // Local developer path
      headless: true,
    };

    browser = await puppeteer.launch(launchConfig);
    const page = await browser.newPage();
    
    // Generate HTML content
    const html = getMedicalReportHTML(type, data);
    
    // Set content and wait for it to render
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 15000 
    });
    
    // Generate PDF buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    // Write buffer to stream
    stream.write(pdfBuffer);
    stream.end();
  } catch (err) {
    console.error('Puppeteer high-fidelity PDF generation failed:', err);
    throw err;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Exports for various document types.
 */
exports.generateCancellationPDF = async (data, stream) => generateHighFidelityPDF('CANCELLATION', data, stream);
exports.generateIncidentPDF = async (data, stream) => generateHighFidelityPDF('INCIDENT', data, stream);
exports.generateRefundPDF = async (data, stream) => generateHighFidelityPDF('REFUND', data, stream);
exports.generateResultTransferPDF = async (data, stream) => generateHighFidelityPDF('RESULT_TRANSFER', data, stream);
