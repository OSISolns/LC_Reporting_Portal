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
    const mimeType = ext === 'svg' ? 'svg+xml' : ext;
    return `data:image/${mimeType};base64,${data.toString('base64')}`;
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
  const headerBase64 = getBase64Image('legacy_header.svg');
  const footerBase64 = getBase64Image('legacy_footer.svg');

  // Determine Stamps
  let stampHtml = '';
  if (type === 'INCIDENT' && data.status === 'reviewed') {
    const verifiedStamp = getBase64Image('stamps/verified.png');
    stampHtml = `<div class="stamp"><img src="${verifiedStamp}" alt="VERIFIED" /></div>`;
  } else if (type === 'CANCELLATION' || type === 'REFUND') {
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

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      width: 210mm;
      height: 297mm;
      font-family: 'Open Sans', sans-serif;
      color: #1e293b;
      line-height: 1.5;
      background: #ffffff;
    }

    body {
      padding: 10mm 12mm 0 12mm;
      display: flex;
      flex-direction: column;
      height: 297mm;
    }

    /* ── Header ── */
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2.5px solid #003B44;
      padding-bottom: 10px;
      margin-bottom: 14px;
      flex-shrink: 0;
    }

    .hospital-info {
      font-size: 9pt;
      color: #003B44;
      font-weight: 700;
      text-align: center;
      line-height: 1.6;
    }

    .doc-meta {
      text-align: right;
      font-size: 7.5pt;
      color: #64748b;
      line-height: 1.7;
    }

    /* ── Main form card — fills remaining space ── */
    .medical-form-modern {
      border: 1.5px solid #cbd5e1;
      background: #ffffff;
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
      margin-bottom: 8px;
      overflow: hidden;
    }

    .medical-form-header {
      background-color: #003B44;
      color: #ffffff;
      padding: 10px 18px;
      font-size: 11pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      flex-shrink: 0;
    }

    /* ── Table ── */
    .medical-form-table {
      width: 100%;
      border-collapse: collapse;
    }

    .medical-form-table th {
      width: 35%;
      padding: 10px 16px;
      background-color: #f8fafc;
      color: #475569;
      font-size: 9pt;
      font-weight: 800;
      text-align: left;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }

    .medical-form-table td {
      width: 65%;
      padding: 10px 16px;
      color: #1e293b;
      font-size: 9.5pt;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }

    .section-head {
      padding: 8px 16px;
      background-color: #f1f5f9;
      border-top: 1px solid #e2e8f0;
      border-bottom: 2px solid #003B44;
      color: #003B44;
      font-weight: 800;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      flex-shrink: 0;
    }

    /* Spacer row that grows to fill empty space inside form */
    .form-spacer {
      flex: 1;
    }

    /* ── Signature grid ── */
    .signature-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      padding: 20px 18px;
      border-top: 1px solid #e2e8f0;
      margin-top: auto;
    }

    .sig-box {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sig-label {
      font-size: 7pt;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .sig-line {
      border-bottom: 1.5px solid #000;
      min-height: 28px;
      font-weight: 700;
      font-size: 10pt;
      padding-bottom: 3px;
      padding-top: 4px;
    }

    .sig-meta {
      font-size: 6.5pt;
      color: #94a3b8;
      font-style: italic;
    }

    /* ── Stamps ── */
    .stamp {
      position: absolute;
      top: 12rem;
      right: 3rem;
      width: 180px;
      transform: rotate(-12deg);
      opacity: 0.8;
      z-index: 100;
      pointer-events: none;
    }

    .stamp img { width: 100%; }

    /* ── Footer — anchored to bottom, full bleed ── */
    .footer {
      flex-shrink: 0;
      width: calc(100% + 24mm);
      margin-left: -12mm;
      margin-top: auto;
    }

    .footer img {
      width: 100%;
      display: block;
    }
  `;


  // Render Logic based on Type
  const titleMap = {
    'INCIDENT': 'Incident / Sentinel Event Report',
    'REFUND': 'Refund Request Form',
    'CANCELLATION': 'Cancellation Request Form'
  };
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
            <div class="sig-label">Quality & Accreditation</div>
            <div class="sig-line">${data.reviewer_name || 'PENDING'}</div>
          </div>
        </div>
      </div>
    `;
  } else if (type === 'REFUND') {
    content = `
      <div class="medical-form-modern">
        <div class="medical-form-header">Refund Request Form</div>
        ${stampHtml}

        <div class="section-head">Section 1: FORMAL PATIENT IDENTIFICATION</div>
        <table class="medical-form-table">
          <tr><th>Patient's Full Name</th><td style="font-weight:800">${data.patient_full_name}</td></tr>
          <tr><th>PID Number</th><td>${data.pid_number}</td></tr>
          <tr><th>SID Number</th><td>${data.sid_number || 'N/A'}</td></tr>
          <tr><th>Telephone Number</th><td>${data.telephone_number || 'N/A'}</td></tr>
          <tr><th>Insurance / Payer</th><td>${data.insurance_payer || 'Private / Walk-in'}</td></tr>
        </table>

        <div class="section-head">Section 2: TRANSACTION DETAILS</div>
        <table class="medical-form-table">
          <tr><th>MOMO Code</th><td>${data.momo_code || 'N/A'}</td></tr>
          <tr><th>Total Amount Paid (RWF)</th><td>${Number(data.total_amount_paid).toLocaleString()}</td></tr>
          <tr><th>Amount to be Cancelled (RWF)</th><td style="font-weight:800">${Number(data.amount_to_be_refunded).toLocaleString()}</td></tr>
          <tr><th>Amount Paid By</th><td>${data.amount_paid_by || 'N/A'}</td></tr>
          <tr><th>Original Receipt / Invoice #</th><td>${data.original_receipt_number || 'N/A'}</td></tr>
          <tr><th>Initial Transaction Date</th><td>${data.initial_transaction_date ? new Date(data.initial_transaction_date).toLocaleDateString() : 'N/A'}</td></tr>
          <tr><th>Reason for Refund</th><td>${data.reason_for_refund}</td></tr>
        </table>

        <div class="section-head">Section 3: REFUND APPROVAL WORKFLOW</div>
        <div class="signature-grid">
          <div class="sig-box">
            <div class="sig-label">1. Initiated By (Cashier)</div>
            <div class="sig-line">${data.creator_name}</div>
            <div class="sig-meta">${new Date(data.created_at).toLocaleDateString()}</div>
          </div>
          <div class="sig-box">
            <div class="sig-label">2. Verified By</div>
            <div class="sig-line">${data.verifier_name || 'PENDING'}</div>
            <div class="sig-meta">${data.verified_at ? new Date(data.verified_at).toLocaleDateString() : 'Official Verification'}</div>
          </div>
          <div class="sig-box">
            <div class="sig-label">3. Approved By (C.O.O)</div>
            <div class="sig-line">${data.approver_name || 'PENDING'}</div>
            <div class="sig-meta">${data.approved_at ? new Date(data.approved_at).toLocaleDateString() : 'Final Authorization'}</div>
          </div>
        </div>

        ${data.status === 'rejected' ? `
          <div style="margin:15pt; padding:10pt; border:2px solid #b91c1c; border-radius:4px; background:#fef2f2">
            <div style="color:#b91c1c;font-weight:800;font-size:8pt;text-transform:uppercase;margin-bottom:4px">Request Rejected</div>
            <div style="font-weight:700;font-size:10pt">Reason: ${data.rejection_comment}</div>
            <div style="font-size:8pt;margin-top:4px;opacity:0.8">Rejected by: ${data.rejector_name}</div>
          </div>` : ''}
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
      <div class="print-header" style="display:flex; flex-direction:column; flex-shrink:0;">
        <img src="${headerBase64}" style="width: 100%; display: block; margin-bottom: 8px;" />
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 2px solid #003B44; margin-bottom: 10px;">
          <div class="hospital-info" style="text-align:left;">
            LEGACY CLINICS / REPORTING PORTAL<br/>
            <strong>${titleMap[type] || 'Report'}</strong>
          </div>
          <div class="doc-meta" style="text-align:right;">
            OFFICIAL DOCUMENT ID<br/>
            <strong>LC-${type === 'INCIDENT' ? 'INC' : type === 'REFUND' ? 'REF' : 'CAN'}-${new Date().getFullYear()}-${String(data.id || '0').padStart(5, '0')}</strong><br/>
            Print Date: ${new Date().toLocaleString()}
          </div>
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
