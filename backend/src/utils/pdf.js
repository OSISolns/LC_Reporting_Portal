'use strict';
const puppeteer = require('puppeteer');
const { getMedicalReportHTML } = require('./pdfTemplate');

/**
 * Generates a high-fidelity PDF using Puppeteer.
 */
const generateHighFidelityPDF = async (type, data, stream) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    
    // Generate HTML content
    const html = getMedicalReportHTML(type, data);
    
    // Set content and wait for it to render
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generate PDF buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
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
