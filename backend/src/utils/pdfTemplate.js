'use strict';
const fs = require('fs');
const path = require('path');

/**
 * Utility to encode local images as Base64 for Puppeteer injection.
 */
const getBase64Image = (relativePath) => {
  try {
    const fullPath = path.resolve(__dirname, '../assets', relativePath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Asset not found: ${fullPath}`);
      return '';
    }
    const data = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).slice(1);
    const mimeType = ext === 'svg' ? 'svg+xml' : (ext === 'jpg' ? 'jpeg' : ext);
    return `data:image/${mimeType};base64,${data.toString('base64')}`;
  } catch (err) {
    console.error('Error encoding image:', err);
    return '';
  }
};

/**
 * Generates the full HTML markup for the medical reports.
 */
exports.getMedicalReportHTML = (type, data) => {
  const logoBase64 = getBase64Image('logo.png');

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

  const primaryTeal = '#007B8A';
  const primaryDark = '#003B44';

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      width: 210mm;
      height: 297mm;
      font-family: 'Inter', sans-serif;
      color: #1e293b;
      line-height: 1.5;
      background: #ffffff;
    }

    body {
      padding: 15mm 15mm;
      display: flex;
      flex-direction: column;
      height: 297mm;
      position: relative;
    }

    /* ── Watermark ── */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      width: 140mm;
      opacity: 0.03;
      z-index: -1;
      pointer-events: none;
      text-align: center;
    }
    .watermark img { width: 100%; filter: grayscale(100%); }
    .watermark-text { font-size: 40pt; font-weight: 900; color: #000; margin-top: 20px; text-transform: uppercase; letter-spacing: 0.1em; }

    /* ── Header ── */
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      flex-shrink: 0;
    }

    .brand-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .brand-logo {
      height: 55px;
      width: auto;
      display: block;
    }

    .clinic-address {
      font-size: 8pt;
      color: #64748b;
      line-height: 1.4;
      font-weight: 500;
    }

    .doc-headline {
      text-align: right;
    }

    .doc-type-label {
      font-size: 20pt;
      font-weight: 800;
      color: ${primaryDark};
      text-transform: uppercase;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .doc-id-box {
      margin-top: 8px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      border-radius: 6px;
      display: inline-block;
    }

    .doc-id-label { font-size: 7pt; color: #94a3b8; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 2px; }
    .doc-id-value { font-size: 11pt; font-weight: 800; color: ${primaryTeal}; font-family: monospace; }

    /* ── Main form container ── */
    .medical-form-modern {
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      background: #ffffff;
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
    }

    .medical-form-header {
      background-color: ${primaryDark};
      color: #ffffff;
      padding: 14px 20px;
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-head {
      margin-top: 0;
      padding: 10px 20px;
      background-color: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      color: ${primaryDark};
      font-weight: 800;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ── Table ── */
    .medical-form-table {
      width: 100%;
      border-collapse: collapse;
    }

    .medical-form-table tr:last-child td,
    .medical-form-table tr:last-child th {
      border-bottom: none;
    }

    .medical-form-table th {
      width: 35%;
      padding: 12px 20px;
      color: #64748b;
      font-size: 8.5pt;
      font-weight: 600;
      text-align: left;
      border-right: 1px solid #f1f5f9;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }

    .medical-form-table td {
      width: 65%;
      padding: 12px 20px;
      color: #1e293b;
      font-size: 9.5pt;
      font-weight: 500;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }

    .important-value {
      font-weight: 700;
      color: #0f172a;
    }

    /* ── Stamp ── */
    .stamp {
      position: absolute;
      top: 140px;
      right: 40px;
      width: 200px;
      z-index: 20;
      transform: rotate(-15deg);
      opacity: 0.8;
      pointer-events: none;
    }
    .stamp img { width: 100%; }

    /* ── Signature grid ── */
    .signature-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 30px;
      padding: 24px 20px;
      margin-top: auto;
      background-color: #ffffff;
    }

    .sig-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .sig-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .sig-line {
      border-bottom: 1.5px solid #1e293b;
      min-height: 35px;
      font-weight: 700;
      font-size: 10.5pt;
      display: flex;
      align-items: flex-end;
      padding-bottom: 4px;
    }

    .sig-meta {
      font-size: 7pt;
      color: #94a3b8;
      font-weight: 500;
      margin-top: 2px;
    }

    /* ── Footer ── */
    .footer {
      flex-shrink: 0;
      padding: 25px 0 0;
      margin-top: 15px;
      border-top: 1.5px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .clinic-contact {
      font-size: 7.5pt;
      color: #94a3b8;
      font-weight: 600;
    }

    .page-of {
      font-size: 7.5pt;
      color: #cbd5e1;
      font-weight: 700;
    }
  `;

  const titleMap = {
    'INCIDENT': 'Incident & Safety Report',
    'REFUND': 'Patient Refund Voucher',
    'CANCELLATION': 'Service Cancellation Form'
  };

  const getDocId = () => {
    const year = new Date().getFullYear();
    const prefix = type === 'INCIDENT' ? 'INC' : type === 'REFUND' ? 'REF' : 'CAN';
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

        <div class="section-head">Section 2: Narrative Analysis & Actions</div>
        <table class="medical-form-table">
          <tr><th>Description of Event</th><td>${data.description}</td></tr>
          <tr><th>Contributing Factors</th><td>${data.contributing_factors || 'No specific factors identified.'}</td></tr>
          <tr><th>Immediate Remediation</th><td>${data.immediate_actions || 'Standard stabilization protocols followed.'}</td></tr>
          <tr><th>Prevention Measures</th><td>${data.prevention_measures || 'Ongoing training and process review.'}</td></tr>
          ${data.status === 'reviewed' ? `<tr><th>QA Officer Comments</th><td style="color:${primaryTeal}; font-style:italic;">${data.review_comments || 'Reviewed and finalized for accreditation compliance.'}</td></tr>` : ''}
        </table>

        <div class="signature-grid">
          <div class="sig-box">
            <div class="sig-label">Reported By</div>
            <div class="sig-line">${data.creator_name}</div>
            <div class="sig-meta">UID: ${data.creator_id || 'REGISTERED_STAFF'}</div>
          </div>
          <div class="sig-box">
            <div class="sig-label">Submission Date</div>
            <div class="sig-line">${new Date(data.created_at).toLocaleDateString()}</div>
            <div class="sig-meta">Time: ${new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div class="sig-box">
            <div class="sig-label">Quality Assurance Sign-off</div>
            <div class="sig-line" style="color:${data.reviewer_name ? primaryTeal : '#cbd5e1'}">${data.reviewer_name || 'PENDING'}</div>
            <div class="sig-meta">${data.reviewed_at ? new Date(data.reviewed_at).toLocaleDateString() : 'Official Verification Required'}</div>
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

        <div class="section-head">Section 1: Patient Identity</div>
        <table class="medical-form-table">
          <tr><th>Full Name</th><td class="important-value">${data.patient_full_name}</td></tr>
          <tr><th>Patient PID</th><td>${data.pid_number}</td></tr>
          <tr><th>Service SID</th><td>${data.sid_number || 'N/A'}</td></tr>
          <tr><th>Telephone</th><td>${data.telephone_number || 'N/A'}</td></tr>
          <tr><th>Insurance Payer</th><td>${data.insurance_payer || 'Private / Walk-in'}</td></tr>
        </table>

        <div class="section-head">Section 2: Financial Transaction Details</div>
        <table class="medical-form-table">
          <tr><th>Total Original Paid</th><td>RWF ${Number(data.total_amount_paid).toLocaleString()}</td></tr>
          <tr><th>Refundable Amount</th><td class="important-value" style="font-size: 11pt; color:${primaryTeal}">RWF ${Number(data.amount_to_be_refunded).toLocaleString()}</td></tr>
          <tr><th>Payment Reference (MOMO)</th><td>${data.momo_code || 'N/A'}</td></tr>
          <tr><th>Original Receipt No.</th><td>${data.original_receipt_number || 'N/A'}</td></tr>
          <tr><th>Transaction Date</th><td>${data.initial_transaction_date ? new Date(data.initial_transaction_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</td></tr>
          <tr><th>Reason for Refund</th><td>${data.reason_for_refund}</td></tr>
        </table>

        <div class="signature-grid">
          <div class="sig-box">
            <div class="sig-label">Initiated By (Cashier)</div>
            <div class="sig-line">${data.creator_name}</div>
            <div class="sig-meta">${new Date(data.created_at).toLocaleString()}</div>
          </div>
          <div class="sig-box">
            <div class="sig-label">Verified By (Manager)</div>
            <div class="sig-line" style="color:${data.verifier_name ? '#000' : '#cbd5e1'}">${data.verifier_name || 'PENDING'}</div>
            <div class="sig-meta">${data.verified_at ? new Date(data.verified_at).toLocaleDateString() : 'Level 1 Verification'}</div>
          </div>
          <div class="sig-box">
            <div class="sig-label">Approved By (C.O.O)</div>
            <div class="sig-line" style="color:${data.approver_name ? '#000' : '#cbd5e1'}">${data.approver_name || 'PENDING'}</div>
            <div class="sig-meta">${data.approved_at ? new Date(data.approved_at).toLocaleDateString() : 'Final Authorization'}</div>
          </div>
        </div>

        ${data.status === 'rejected' ? `
          <div style="margin:20px; padding:15px; border:1px solid #fee2e2; border-radius:8px; background:#fffcfc">
            <div style="color:#b91c1c; font-weight:800; font-size:7pt; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.05em;">Request Rejected</div>
            <div style="font-weight:700; font-size:9.5pt; color:#991b1b;">Reason: ${data.rejection_comment}</div>
            <div style="font-size:7pt; margin-top:6px; color:#b91c1c; font-style:italic;">Rejected by: ${data.rejector_name}</div>
          </div>` : ''}
      </div>
    `;
  } else {
    // CANCELLATION
    content = `
      <div class="medical-form-modern">
        <div class="medical-form-header">
          <span>Official Service Cancellation Audit</span>
          <span style="font-size: 8pt; opacity: 0.8;">Operational Workflow</span>
        </div>
        ${stampHtml}
        
        <div class="section-head">Section 1: Service Particulars</div>
        <table class="medical-form-table">
          <tr><th>Patient Name</th><td class="important-value">${data.patient_full_name}</td></tr>
          <tr><th>Patient PID</th><td>${data.pid_number}</td></tr>
          <tr><th>Original SID</th><td>${data.old_sid_number}</td></tr>
          <tr><th>Replacement SID</th><td>${data.new_sid_number}</td></tr>
          <tr><th>Insurance Details</th><td>${data.insurance_payer}</td></tr>
        </table>

        <div class="section-head">Section 2: Audit & Reason</div>
        <table class="medical-form-table">
          <tr><th>Total Amount Cancelled</th><td class="important-value" style="font-size: 11pt; color:${primaryTeal}">RWF ${Number(data.total_amount_cancelled).toLocaleString()}</td></tr>
          <tr><th>Receipt Reference</th><td>${data.original_receipt_number}</td></tr>
          <tr><th>Cancellation Rationale</th><td>${data.reason_for_cancellation}</td></tr>
          <tr><th>Staff Justification</th><td style="font-size: 8.5pt; color:#64748b; font-style:italic;">"${data.notes || 'No additional notes provided.'}"</td></tr>
        </table>

        <div class="signature-grid">
          <div class="sig-box">
            <div class="sig-label">Initiated By</div>
            <div class="sig-line">${data.creator_name}</div>
            <div class="sig-meta">System Log: ${new Date(data.created_at).toLocaleDateString()}</div>
          </div>
          <div class="sig-box">
            <div class="sig-label">Division Manager</div>
            <div class="sig-line" style="color:${data.verifier_name ? '#000' : '#cbd5e1'}">${data.verifier_name || 'PENDING'}</div>
            <div class="sig-meta">Verification Compliance</div>
          </div>
          <div class="sig-box">
            <div class="sig-label">Chief Operations Officer</div>
            <div class="sig-line" style="color:${data.approver_name ? '#000' : '#cbd5e1'}">${data.approver_name || 'PENDING'}</div>
            <div class="sig-meta">Strategic Authorization</div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${titleMap[type] || 'Medical Report'}</title>
      <style>${styles}</style>
    </head>
    <body>
      <div class="watermark">
        <img src="${logoBase64}" />
        <div class="watermark-text">OFFICIAL RECORD</div>
      </div>

      <div class="print-header">
        <div class="brand-section">
          <img src="${logoBase64}" class="brand-logo" />
          <div class="clinic-address">
            Legacy Medical Center Rwanda<br/>
            KK3 RD 134, Kicukiro, Kigali<br/>
            Contact: +250 123 456 789
          </div>
        </div>
        <div class="doc-headline">
          <h1 class="doc-type-label">${titleMap[type] || 'Report'}</h1>
          <div class="doc-id-box">
            <span class="doc-id-label">Official Document ID</span>
            <span class="doc-id-value">${getDocId()}</span>
          </div>
          <div style="font-size: 6.5pt; color: #94a3b8; margin-top: 4px; font-weight: 600;">
            ISSUED: ${new Date().toLocaleString()}
          </div>
        </div>
      </div>

      ${content}

      <div class="footer">
        <div class="clinic-contact">
          Legacy Clinics • Specialized Healthcare Solutions • info@legacyclinics.rw • www.legacyclinics.rw
        </div>
        <div class="page-of">
          Page 1 of 1
        </div>
      </div>
    </body>
    </html>
  `;
};
