'use strict';
const fs = require('fs');
const path = require('path');

// Pre-load logo to base64 for high-fidelity embedding
let logoBase64 = 'https://i.imgur.com/rN5nO8Q.png'; // Fallback
try {
  const logoPath = '/home/noble/Documents/LC_APPS/LC_Reporting_Portal/backend/src/assets/logo.png';
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  }
} catch (err) {
  console.error('Failed to load local logo for PDF:', err);
}

/**
 * Modern PDF Template Generator
 * Designed for High-Fidelity Clinical Reports
 */
const getMedicalReportHTML = (type, data) => {
  const primaryTeal = '#007b8a';
  const primaryDark = '#1b669e';
  const brandGreen = '#71b647';
  const approvedStamp = 'https://i.imgur.com/8QG3X8N.png'; // Placeholder for actual stamp asset
  
  let stampHtml = '';
  if (data.status === 'approved') {
    stampHtml = `<div class="stamp"><img src="${approvedStamp}" alt="APPROVED" /></div>`;
  }

  const titleMap = {
    'INCIDENT': 'Incident & Safety Report',
    'REFUND': 'Patient Refund Voucher',
    'CANCELLATION': 'Cancellation Form',
    'RESULT_TRANSFER': 'Results Transfer Form'
  };

  const getDocId = () => {
    const year = new Date().getFullYear();
    const prefix = type === 'INCIDENT' ? 'INC' : type === 'REFUND' ? 'REF' : type === 'RESULT_TRANSFER' ? 'RST' : 'CAN';
    return `LC-${prefix}-${year}-${String(data.id || '0').padStart(5, '0')}`;
  };

  let content = '';
  if (type === 'INCIDENT') {
    content = `
      <div class="medical-form-modern">
        <div class="medical-form-header">
          <span>Clinical Quality Assurance Report</span>
          <span style="font-size: 8pt; opacity: 0.8;">Legacy Medical Center</span>
        </div>
        ${stampHtml}
        
        <div class="section-head">Section 1: Event Identification</div>
        <table class="medical-form-table">
          <tr><th>Filing Date</th><td>${new Date(data.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
          <tr><th>Event Classification</th><td><span style="color:#b91c1c; font-weight:700;">${data.incident_type}</span></td></tr>
          <tr><th>Clinical Department</th><td>${data.department}</td></tr>
          <tr><th>Area/Unit of Incident</th><td>${data.area_of_incident}</td></tr>
          <tr><th>Involved Parties</th><td>${data.names_involved}</td></tr>
          <tr><th>Associated Patient PID</th><td class="important-value">${data.pid_number || 'None Linked'}</td></tr>
        </table>

        <div class="section-head">Section 2: Narrative & Analysis</div>
        <table class="medical-form-table">
          <tr><th>Detailed Description</th><td>${data.description}</td></tr>
          <tr><th>Contributing Factors</th><td>${data.contributing_factors || 'No factors identified.'}</td></tr>
          <tr><th>Immediate Actions</th><td>${data.immediate_actions || 'No immediate actions recorded.'}</td></tr>
          <tr><th>Prevention Measures</th><td>${data.prevention_measures || 'Pending safety review.'}</td></tr>
        </table>

        <div class="signature-grid">
          <div class="sig-box">
            <span class="sig-label">Reporter Signature</span>
            <div class="sig-line">${data.creator_name || '...'}</div>
            <span class="sig-meta">${data.creator_role || 'Staff Member'} | ${new Date(data.created_at).toLocaleDateString()}</span>
          </div>
          <div class="sig-box">
            <span class="sig-label">Quality Assurance</span>
            <div class="sig-line">${data.verifier_name || ''}</div>
            <span class="sig-meta">${data.verified_at ? new Date(data.verified_at).toLocaleDateString() : 'Pending Verification'}</span>
          </div>
          <div class="sig-box">
            <span class="sig-label">Chief Operations Officer</span>
            <div class="sig-line">${data.approver_name || ''}</div>
            <span class="sig-meta">${data.approved_at ? new Date(data.approved_at).toLocaleDateString() : 'Pending Approval'}</span>
          </div>
        </div>
      </div>
    `;
  } else if (type === 'REFUND') {
    content = `
      <div class="medical-form-modern">
        <div class="medical-form-header">
          <span>Billing & Reimbursement Voucher</span>
          <span style="font-size: 8pt; opacity: 0.8;">Finance Department</span>
        </div>
        ${stampHtml}

        <div style="font-size: 10pt; font-weight: 700; margin-bottom: 15px; text-decoration: underline; text-transform: uppercase; padding: 15px 20px 0 20px;">
          DATE OF REQUEST: ${new Date(data.created_at).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })}
        </div>

        <div class="section-head">Section 1: FORMAL PATIENT IDENTIFICATION</div>
        <table class="medical-form-table">
          <tr><th>Patient's full name</th><td class="important-value">${data.patient_full_name}</td></tr>
          <tr><th>PID number</th><td>${data.pid_number}</td></tr>
          <tr><th>SID number</th><td>${data.sid_number || 'N/A'}</td></tr>
          <tr><th>Telephone number</th><td>${data.telephone_number || 'N/A'}</td></tr>
          <tr><th>Insurance / Payer</th><td>${data.insurance_payer || 'Private / Walk-in'}</td></tr>
          ${data.billed_by_name ? `<tr><th>Billed by</th><td>${data.billed_by_name}</td></tr>` : ''}
        </table>

        <div class="section-head">Section 2: TRANSACTION DETAILS</div>
        <table class="medical-form-table">
          <tr><th>MOMO CODE</th><td>${data.momo_code || 'N/A'}</td></tr>
          <tr><th>Total Amount paid</th><td>RWF ${Number(data.total_amount_paid).toLocaleString()}</td></tr>
          <tr><th>Amount to be refunded</th><td class="important-value" style="font-size: 11pt; color:${primaryTeal}">RWF ${Number(data.amount_to_be_refunded).toLocaleString()}</td></tr>
          <tr><th>Amount Paid by</th><td>${data.amount_paid_by || 'N/A'}</td></tr>
          <tr><th>Original receipt / invoice number</th><td>${data.original_receipt_number || 'N/A'}</td></tr>
          <tr><th>Initial transaction date</th><td>${data.initial_transaction_date ? new Date(data.initial_transaction_date).toLocaleDateString() : 'N/A'}</td></tr>
          <tr><th>Reason for refund(details)</th><td class="handwritten">${data.reason_for_refund}</td></tr>
        </table>

        <div class="section-head">Section 3: REFUND APPROVAL WORKFLOW</div>
        <div class="signature-grid">
          <div class="sig-box">
            <span class="sig-label">Initiated by (Cashier)</span>
            <div class="sig-line">${data.billed_by_name || data.creator_name}</div>
            <span class="sig-meta">${new Date(data.created_at).toLocaleString()}</span>
          </div>
          <div class="sig-box">
            <span class="sig-label">Verified by (Manager)</span>
            <div class="sig-line">${data.verifier_name || ''}</div>
            <span class="sig-meta">${data.verified_at ? new Date(data.verified_at).toLocaleDateString() : 'Pending'}</span>
          </div>
          <div class="sig-box">
            <span class="sig-label">Approved by (C.O.O)</span>
            <div class="sig-line">${data.approver_name || ''}</div>
            <span class="sig-meta">${data.approved_at ? new Date(data.approved_at).toLocaleDateString() : 'Pending'}</span>
          </div>
        </div>
      </div>
    `;
  } else if (type === 'CANCELLATION') {
    content = `
      <div class="medical-form-modern">
        <div class="medical-form-header" style="background-color: ${brandGreen};">
          <span>Official Service Cancellation Audit</span>
          <span style="font-size: 8pt; opacity: 0.8;">Operational Workflow</span>
        </div>
        ${stampHtml}

        <div style="font-size: 10pt; font-weight: 700; margin-bottom: 15px; text-decoration: underline; text-transform: uppercase; padding: 15px 20px 0 20px;">
          DATE OF REQUEST: ${new Date(data.created_at).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })}
        </div>

        <div class="section-head">Section 1: FORMAL PATIENT IDENTIFICATION</div>
        <table class="medical-form-table">
          <tr><th>Patient's full name</th><td class="important-value">${data.patient_full_name}</td></tr>
          <tr><th>PID number</th><td>${data.pid_number}</td></tr>
          <tr><th>Telephone number</th><td>${data.telephone_number || 'N/A'}</td></tr>
          <tr><th>SID number</th><td>${data.old_sid_number}</td></tr>
          ${data.new_sid_number ? `<tr><th>Replacement SID</th><td>${data.new_sid_number}</td></tr>` : ''}
          <tr><th>Insurance / Payer</th><td>${data.insurance_payer}</td></tr>
        </table>

        <div class="section-head">Section 2: TRANSACTION DETAILS</div>
        <table class="medical-form-table">
          <tr><th>Amount to be refunded</th><td class="important-value" style="font-size: 11pt; color:${primaryTeal}">RWF ${Number(data.total_amount_cancelled).toLocaleString()}</td></tr>
          <tr><th>Original receipt / invoice number</th><td>${data.original_receipt_number}</td></tr>
          ${data.rectified_receipt_number ? `<tr><th>Rectified Receipt No.</th><td>${data.rectified_receipt_number}</td></tr>` : ''}
          <tr><th>Initial transaction date</th><td>${data.initial_transaction_date ? new Date(data.initial_transaction_date).toLocaleDateString() : 'N/A'}</td></tr>
          ${data.rectified_date ? `<tr><th>Rectified Date</th><td>${new Date(data.rectified_date).toLocaleDateString()}</td></tr>` : ''}
          <tr><th>Reason for refund(details)</th><td class="handwritten">${data.reason_for_cancellation}</td></tr>
          ${data.notes ? `<tr><th>Staff Justification</th><td style="font-size: 8.5pt; color:#64748b; font-style:italic;" class="handwritten">"${data.notes}"</td></tr>` : ''}
        </table>

        <div class="section-head">Section 3: REFUND APPROVAL WORKFLOW</div>
        <div class="signature-grid">
          <div class="sig-box">
            <span class="sig-label">Initiated by (Staff)</span>
            <div class="sig-line">${data.creator_name}</div>
            <span class="sig-meta">${new Date(data.created_at).toLocaleString()}</span>
          </div>
          <div class="sig-box">
            <span class="sig-label">Verified by (Manager)</span>
            <div class="sig-line">${data.verifier_name || ''}</div>
            <span class="sig-meta">${data.verified_at ? new Date(data.verified_at).toLocaleDateString() : 'Pending'}</span>
          </div>
          <div class="sig-box">
            <span class="sig-label">Approved by (C.O.O)</span>
            <div class="sig-line">${data.approver_name || ''}</div>
            <span class="sig-meta">${data.approved_at ? new Date(data.approved_at).toLocaleDateString() : 'Pending'}</span>
          </div>
        </div>
      </div>
    `;
  } else if (type === 'RESULT_TRANSFER') {
    content = `
      <div class="medical-form-modern">
        <div class="medical-form-header">
          <span>Laboratory Result Transfer Order</span>
          <span style="font-size: 8pt; opacity: 0.8;">Quality Assurance Unit</span>
        </div>
        ${stampHtml}
        
        <div class="section-head">Section 1: Transfer Identification</div>
        <table class="medical-form-table">
          <tr><th>Transfer Date</th><td>${new Date(data.transfer_date).toLocaleDateString()}</td></tr>
          <tr><th>Source SID (Old)</th><td>${data.old_sid}</td></tr>
          <tr><th>Target SID (New)</th><td class="important-value">${data.new_sid}</td></tr>
          <tr><th>Transfer Reason</th><td class="handwritten">${data.reason}</td></tr>
        </table>

        <div class="signature-grid">
          <div class="sig-box">
            <span class="sig-label">Requested By</span>
            <div class="sig-line">${data.creator_name}</div>
            <span class="sig-meta">${new Date(data.created_at).toLocaleDateString()}</span>
          </div>
          <div class="sig-box">
            <span class="sig-label">Lab Verification</span>
            <div class="sig-line">${data.verifier_name || ''}</div>
            <span class="sig-meta">${data.verified_at ? new Date(data.verified_at).toLocaleDateString() : 'Pending'}</span>
          </div>
          <div class="sig-box">
            <span class="sig-label">Authorized By</span>
            <div class="sig-line">${data.approver_name || ''}</div>
            <span class="sig-meta">${data.approved_at ? new Date(data.approved_at).toLocaleDateString() : 'Pending Approval'}</span>
          </div>
        </div>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Caveat:wght@600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 10mm 5mm 10mm 5mm;
    }
    
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', sans-serif;
      color: #1e293b;
      line-height: 1.3;
      background-color: #ffffff;
      -webkit-print-color-adjust: exact;
    }

    .page-wrapper {
      display: flex;
      flex-direction: column;
      min-height: 277mm; /* Full A4 height minus 10mm top/bottom margin */
      padding: 0 5mm;
      box-sizing: border-box;
    }

    /* ── Header ── */
    .header-container {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 10px;
    }

    .hospital-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .hospital-logo {
      width: 180px;
      height: auto;
    }

    .report-title-container {
      text-align: right;
    }

    .report-title {
      font-size: 16pt;
      font-weight: 800;
      color: ${primaryDark};
      margin: 0;
      text-transform: uppercase;
      letter-spacing: -0.02em;
    }

    .doc-id-box {
      margin-top: 6px;
      padding: 6px 10px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      display: inline-block;
    }

    .doc-id-label { font-size: 6.5pt; color: #94a3b8; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 2px; }
    .doc-id-value { font-size: 10pt; font-weight: 800; color: ${primaryTeal}; font-family: monospace; }

    /* ── Main content area ── */
    .main-content {
      flex: 1; /* Pushes footer to bottom */
    }

    .medical-form-modern {
      width: 100%;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      background: #ffffff;
      position: relative;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
    }

    .medical-form-header {
      background-color: ${primaryDark};
      color: #ffffff;
      padding: 8px 18px;
      font-size: 9.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-head {
      margin-top: 0;
      padding: 8px 18px;
      background-color: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      color: ${primaryDark};
      font-weight: 800;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ── Table ── */
    .medical-form-table {
      width: 100%;
      border-collapse: collapse;
    }

    .medical-form-table th {
      width: 35%;
      padding: 7px 18px;
      color: #64748b;
      font-size: 7.5pt;
      font-weight: 600;
      text-align: left;
      border-right: 1px solid #f1f5f9;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }

    .medical-form-table td {
      width: 65%;
      padding: 6px 16px;
      color: #1e293b;
      font-size: 8pt;
      font-weight: 500;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
      word-break: break-word;
      white-space: pre-wrap;
    }

    .important-value {
      font-weight: 700;
      color: #0f172a;
    }

    .handwritten {
      font-family: 'Caveat', cursive;
      font-size: 12.5pt !important;
      color: #1e40af !important;
      line-height: 1.1;
    }

    /* ── Stamp ── */
    .stamp {
      position: absolute;
      top: 120px;
      right: 30px;
      width: 180px;
      z-index: 20;
      transform: rotate(-15deg);
      opacity: 0.8;
      pointer-events: none;
    }
    .stamp img { 
      width: 100%; 
      mix-blend-mode: multiply; 
      filter: contrast(1.1) brightness(1.05);
    }

    /* ── Signature grid ── */
    .signature-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 25px;
      padding: 12px 18px;
      margin-top: auto;
      background-color: #ffffff;
      page-break-inside: avoid;
    }

    .sig-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .sig-label {
      font-size: 7pt;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .sig-line {
      border-bottom: 1.2px solid #1e293b;
      min-height: 30px;
      font-weight: 700;
      font-size: 10pt;
      display: flex;
      align-items: flex-end;
      padding-bottom: 3px;
    }

    .sig-meta {
      font-size: 6.5pt;
      color: #94a3b8;
      font-weight: 500;
      margin-top: 1px;
    }

    /* ── Footer ── */
    .footer {
      flex-shrink: 0;
      margin-top: auto; /* Pushes to bottom of page-wrapper */
      padding-top: 10mm;
      width: 100%;
      page-break-inside: avoid;
    }
    
    .footer-meta {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0 4px 5px 4px;
      font-size: 6.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .brand-footer-bar {
      display: flex;
      height: 30px;
      width: 100%;
      color: #ffffff;
    }

    .footer-left-bar {
      background-color: #a3cc54;
      width: 45%;
      display: flex;
      align-items: center;
      padding: 0 15px;
      font-weight: 800;
      font-size: 10pt;
      letter-spacing: 0.05em;
    }

    .footer-right-bar {
      background-color: #64748b;
      width: 55%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 0 15px;
      font-size: 5pt;
      line-height: 1.1;
      font-weight: 500;
    }

    .footer-right-bar div {
      display: flex;
      justify-content: flex-end;
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <div class="header-container">
      <div class="hospital-info">
        <img src="${logoBase64}" class="hospital-logo" alt="Legacy Clinics Logo" />
      </div>
      <div class="report-title-container">
        <h1 class="report-title">${titleMap[type] || 'Medical Report'}</h1>
        <div class="doc-id-box">
          <span class="doc-id-label">Official Document ID</span>
          <span class="doc-id-value">${getDocId()}</span>
        </div>
        <div style="font-size: 6pt; color: #94a3b8; margin-top: 4px;">
          ISSUED: ${new Date().toLocaleString()}
        </div>
      </div>
    </div>

    <div class="main-content">
      ${content}
    </div>

    <div class="footer">
      <div class="footer-meta">
        <span>Speciality Clinic | Diagnostics | Dental</span>
        <span>Code: 103872011</span>
      </div>
      <div class="brand-footer-bar">
        <div class="footer-left-bar">HEALTH FOR LIFE</div>
        <div class="footer-right-bar">
          <div>KK3 RD 134, KICUKIRO RWANDA N'ARUSHOZA District, RWANDA</div>
          <div>Tel: 0788302100 | 0732002100 | 0738302300 | 03033</div>
          <div>info@legacyclinics.rw | www.legacyclinics.rw</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = {
  getMedicalReportHTML,
};
