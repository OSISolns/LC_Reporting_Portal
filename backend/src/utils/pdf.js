'use strict';
const PDFDocument = require('pdfkit');
const path = require('path');

/**
 * Generates a PDF for a cancellation request.
 */
exports.generateCancellationPDF = (data, stream) => {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(stream);

  const logoPath = path.join(__dirname, '../../../frontend/public/logo.png');
  try {
    // Add logo at top-left
    doc.image(logoPath, 50, 40, { width: 80 });
  } catch (err) {
    console.warn("Could not load logo image for PDF:", err.message);
  }

  // Header
  // Move down to avoid overlapping the logo
  doc.moveDown(2);
  doc.fontSize(20).text('CANCELLATION REQUEST FORM', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Date of Request: ${new Date(data.created_at).toLocaleDateString()}`);
  doc.moveDown();

  // section 1
  doc.fontSize(14).text('Section 1: FORMAL PATIENT IDENTIFICATION', { underline: true });
  doc.fontSize(12);
  doc.text(`Patient's full name: ${data.patient_full_name}`);
  doc.text(`PID number: ${data.pid_number}`);
  doc.text(`Old SID number: ${data.old_sid_number || 'N/A'}`);
  doc.text(`New SID number: ${data.new_sid_number || 'N/A'}`);
  doc.text(`Telephone number: ${data.telephone_number || 'N/A'}`);
  doc.text(`Insurance / Payer: ${data.insurance_payer || 'N/A'}`);
  doc.moveDown();

  // section 2
  doc.fontSize(14).text('Section 2: TRANSACTION DETAILS', { underline: true });
  doc.fontSize(12);
  doc.text(`Total amount to be cancelled: ${data.total_amount_cancelled}`);
  doc.text(`Original receipt / invoice number: ${data.original_receipt_number || 'N/A'}`);
  doc.text(`Rectified receipt/invoice number: ${data.rectified_receipt_number || 'N/A'}`);
  doc.text(`Initial transaction date: ${data.initial_transaction_date ? new Date(data.initial_transaction_date).toLocaleDateString() : 'N/A'}`);
  doc.text(`Rectified date: ${data.rectified_date ? new Date(data.rectified_date).toLocaleDateString() : 'N/A'}`);
  doc.moveDown();
  doc.text('Reason for cancellation (details):');
  doc.text(data.reason_for_cancellation, { indent: 20 });
  doc.moveDown();

  // Workflow
  doc.fontSize(14).text('Section 3: CANCELLATION APPROVAL WORKFLOW', { underline: true });
  doc.fontSize(12);
  doc.text(`1. Initiated by (Customercare/Cashier): ${data.creator_name || 'N/A'} - Status: ${data.status}`);
  doc.text(`2. Verified by: ${data.verifier_name || 'Pending'}`);
  doc.text(`3. Approved by (C.O.O/Sales Manager): ${data.approver_name || 'Pending'}`);
  
  if (data.status === 'rejected') {
    doc.moveDown();
    doc.fillColor('red').text(`REJECTED BY: ${data.rejector_name || 'N/A'}`);
    doc.text(`Comment: ${data.rejection_comment || 'No comment provided'}`);
    
    const stampPath = path.join(__dirname, '../../../frontend/public/images/stamps/rejected.png');
    try {
      doc.image(stampPath, 400, 50, { width: 150 });
    } catch (err) {
      console.warn("Could not load rejected stamp image for PDF:", err.message);
    }
  } else if (data.status === 'approved') {
    const stampPath = path.join(__dirname, '../../../frontend/public/images/stamps/approved.png');
    try {
      doc.image(stampPath, 400, 50, { width: 150 });
    } catch (err) {
      console.warn("Could not load approved stamp image for PDF:", err.message);
    }
  }

  doc.end();
};

/**
 * Generates a PDF for an incident report.
 */
exports.generateIncidentPDF = (data, stream) => {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(stream);

  const logoPath = path.join(__dirname, '../../../frontend/public/logo.png');
  try {
    doc.image(logoPath, 50, 40, { width: 80 });
  } catch (err) {
    console.warn("Could not load logo image for PDF:", err.message);
  }

  doc.moveDown(2);
  doc.fontSize(20).text('INCIDENT/SENTINEL EVENT REPORT FORM', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`Incident Type: ${data.incident_type}`);
  doc.text(`Department: ${data.department}`);
  doc.text(`Area of incident: ${data.area_of_incident}`);
  doc.text(`Names involved: ${data.names_involved}`);
  if (data.pid_number) doc.text(`PID: ${data.pid_number}`);
  doc.moveDown();

  doc.text('Description of what happened:');
  doc.text(data.description, { indent: 20 });
  doc.moveDown();

  doc.text('Suspected contributing factors:');
  doc.text(data.contributing_factors || 'None listed', { indent: 20 });
  doc.moveDown();

  doc.text('Immediate actions and outcome:');
  doc.text(data.immediate_actions || 'None listed', { indent: 20 });
  doc.moveDown();

  doc.text('Prevention measures:');
  doc.text(data.prevention_measures || 'None listed', { indent: 20 });
  doc.moveDown();

  doc.text(`Reported by: ${data.creator_name}`);
  doc.text(`Date: ${new Date(data.created_at).toLocaleString()}`);

  doc.end();
};
