'use strict';
const fs = require('fs');
const path = require('path');

/**
 * Utility to encode local images as Base64 for Puppeteer injection.
 */
const getBase64Image = (relativePath) => {
  try {
    const fullPath = path.resolve(__dirname, '../../../frontend/public', relativePath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Asset not found: ${fullPath}`);
      return '';
    }
    const data = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).slice(1);
    return `data:image/${ext};base64,${data.toString('base64')}`;
  } catch (err) {
    console.error('Error encoding image:', err);
    return '';
  }
};

/**
 * Generates the full HTML markup for the pixel-perfect medical reports.
 */
exports.getMedicalReportHTML = (type, data) => {
  const logoBase64 = getBase64Image('logo.png');
  const footerBase64 = getBase64Image('footer.png');
  
  // Determine Stamps
  let stampHtml = '';
  if (type === 'INCIDENT' && data.status === 'reviewed') {
    const verifiedStamp = getBase64Image('stamps/verified.png');
    stampHtml = `<div class="stamp"><img src="${verifiedStamp}" alt="VERIFIED" /></div>`;
  } else if (type === 'CANCELLATION') {
    if (data.status === 'approved') {
      const approvedStamp = getBase64Image('stamps/approved.png');
      stampHtml = `<div class="stamp"><img src="${approvedStamp}" alt="APPROVED" /></div>`;
    } else if (data.status === 'rejected') {
      const rejectedStamp = getBase64Image('stamps/rejected.png');
      stampHtml = `<div class="stamp"><img src="${rejectedStamp}" alt="REJECTED" /></div>`;
    }
  }

  // Define Styles (Mirrors index.css Gold Standard Framework)
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap');
    
    body {
      font-family: 'Open Sans', sans-serif;
      margin: 0;
      padding: 40px;
      color: #1e293b;
      line-height: 1.5;
    }

    /* Print Header Struct */
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid #003B44;
      padding-bottom: 15px;
      margin-bottom: 30px;
    }

    .hospital-info {
      font-size: 9pt;
      color: #003B44;
      font-weight: 700;
    }

    .doc-meta {
      text-align: right;
      font-size: 8pt;
      color: #64748b;
    }

    /* Form Struct */
    .medical-form-modern {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      position: relative;
    }

    .medical-form-header {
      background-color: #003B44;
      color: #ffffff;
      padding: 12px 20px;
      font-size: 11pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .medical-form-table {
      width: 100%;
      border-collapse: collapse;
    }

    .medical-form-table th {
      width: 30%;
      padding: 12px 20px;
      background-color: #f8fafc;
      color: #475569;
      font-size: 9.5pt;
      font-weight: 800;
      text-align: left;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }

    .medical-form-table td {
      width: 70%;
      padding: 12px 20px;
      color: #1e293b;
      font-size: 10pt;
      border-bottom: 1px solid #e2e8f0;
    }

    .section-head {
      padding: 10px 20px;
      background-color: #f1f5f9;
      border-bottom: 2.5px solid #003B44;
      color: #003B44;
      font-weight: 800;
      font-size: 10pt;
      text-transform: uppercase;
    }

    .signature-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 30px;
      padding: 30px 20px;
    }

    .sig-box {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .sig-label {
      font-size: 7.5pt;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
    }

    .sig-line {
      border-bottom: 1.5px solid #000;
      min-height: 25px;
      font-weight: 700;
      font-size: 10.5pt;
      padding-bottom: 3px;
    }

    .sig-meta {
      font-size: 7pt;
      color: #94a3b8;
      font-style: italic;
    }

    /* Stamps */
    .stamp {
      position: absolute;
      top: 15rem;
      right: 4rem;
      width: 200px;
      transform: rotate(-12deg);
      opacity: 0.8;
      z-index: 100;
    }

    .stamp img {
      width: 100%;
    }

    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 20px;
      text-align: center;
    }

    .footer img {
      width: 100%;
      max-height: 50pt;
    }
  `;

  // Render Logic based on Type
  let content = '';
  if (type === 'INCIDENT') {
    content = `
      <div class="medical-form-modern">
        <div class="medical-form-header">Incident / Sentinel Event Report</div>
        ${stampHtml}
        
        <div class="section-head">Section 1: INCIDENT IDENTIFICATION</div>
        <table class="medical-form-table">
          <tr><th>Report Date</th><td>${new Date(data.created_at).toLocaleDateString()}</td></tr>
          <tr><th>Type</th><td style="color:#b91c1c; font-weight:800">${data.incident_type}</td></tr>
          <tr><th>Department</th><td>${data.department}</td></tr>
          <tr><th>Individuals Involved</th><td>${data.names_involved}</td></tr>
          <tr><th>PID Number</th><td>${data.pid_number || 'N/A'}</td></tr>
        </table>

        <div class="section-head">Section 2: CLINICAL NARRATIVE & ANALYSIS</div>
        <table class="medical-form-table">
          <tr><th>Description</th><td>${data.description}</td></tr>
          <tr><th>Contributing Factors</th><td>${data.contributing_factors || 'None'}</td></tr>
          <tr><th>Actions Taken</th><td>${data.immediate_actions || 'Initial stabilized'}</td></tr>
          <tr><th>QA Comments</th><td>${data.review_comments || 'Verified'}</td></tr>
        </table>

        <div class="signature-grid">
          <div class="sig-box">
            <div class="sig-label">Reported By</div>
            <div class="sig-line">${data.creator_name}</div>
            <div class="sig-meta">ID: ${data.creator_username || 'STAFF'}</div>
          </div>
          <div class="sig-box">
            <div class="sig-label">Date of Entry</div>
            <div class="sig-line">${new Date(data.created_at).toLocaleDateString()}</div>
          </div>
          <div class="sig-box">
            <div class="sig-label">Quality Assurance</div>
            <div class="sig-line">${data.reviewer_name || 'PENDING'}</div>
          </div>
        </div>
      </div>
    `;
  } else {
    // CANCELLATION
    content = `
      <div class="medical-form-modern">
        <div class="medical-form-header">Cancellation Request Form</div>
        ${stampHtml}
        
        <div class="section-head">Section 1: PATIENT IDENTIFICATION</div>
        <table class="medical-form-table">
          <tr><th>Patient Name</th><td>${data.patient_full_name}</td></tr>
          <tr><th>PID Number</th><td>${data.pid_number}</td></tr>
          <tr><th>Old SID</th><td>${data.old_sid_number}</td></tr>
          <tr><th>New SID</th><td>${data.new_sid_number}</td></tr>
          <tr><th>Insurance / Payer</th><td>${data.insurance_payer}</td></tr>
        </table>

        <div class="section-head">Section 2: TRANSACTION & AUDIT DETAILS</div>
        <table class="medical-form-table">
          <tr><th>Amount (RWF)</th><td style="font-weight:800">${data.total_amount_cancelled}</td></tr>
          <tr><th>Original Receipt</th><td>${data.original_receipt_number}</td></tr>
          <tr><th>Reason Details</th><td>${data.reason_for_cancellation}</td></tr>
        </table>

        <div class="signature-grid">
          <div class="sig-box">
            <div class="sig-label">Initiator</div>
            <div class="sig-line">${data.creator_name}</div>
            <div class="sig-meta">Verified Transaction</div>
          </div>
          <div class="sig-box">
            <div class="sig-label">Sales/Manager</div>
            <div class="sig-line">${data.verifier_name || 'PENDING'}</div>
          </div>
          <div class="sig-box">
            <div class="sig-label">C.O.O Approval</div>
            <div class="sig-line">${data.approver_name || 'PENDING'}</div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>${styles}</style>
    </head>
    <body>
      <div class="print-header">
        <div class="logo"><img src="${logoBase64}" height="60" /></div>
        <div class="hospital-info">
          LEGACY CLINICS & DIAGNOSTICS<br/>
          KIGALI, RWANDA<br/>
          CLINICAL REPORTING PORTAL
        </div>
        <div class="doc-meta">
          Doc ID: ${data.id}<br/>
          Type: ${type === 'INCIDENT' ? 'INC' : 'CAN'}<br/>
          Print Date: ${new Date().toLocaleString()}
        </div>
      </div>

      ${content}

      <div class="footer">
        <img src="${footerBase64}" />
      </div>
    </body>
    </html>
  `;
};
