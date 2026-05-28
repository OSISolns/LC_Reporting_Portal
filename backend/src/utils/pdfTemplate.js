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
    'RESULT_TRANSFER': 'Results Transfer Form',
    'SAFETY': 'Safety Investigation Report',
    'CLINICAL_SHEET': 'Patient Observation Records Sheet'
  };

  const getDocId = () => {
    const year = new Date().getFullYear();
    const prefix = type === 'INCIDENT' ? 'INC' : type === 'REFUND' ? 'REF' : type === 'RESULT_TRANSFER' ? 'RST' : type === 'SAFETY' ? 'SAF' : type === 'CLINICAL_SHEET' ? 'CLN' : 'CAN';
    return `LC-${prefix}-${year}-${String(data.id || '0').padStart(5, '0')}`;
  };

  let content = '';
  if (type === 'INCIDENT') {
    let parsedVerification = [];
    let parsedActions = [];
    try {
      if (data.rca_verification_json) parsedVerification = typeof data.rca_verification_json === 'string' ? JSON.parse(data.rca_verification_json) : data.rca_verification_json;
      if (data.corrective_actions_json) parsedActions = typeof data.corrective_actions_json === 'string' ? JSON.parse(data.corrective_actions_json) : data.corrective_actions_json;
    } catch (e) { }

    content = `
      <div class="medical-form-modern">
        <div class="medical-form-header">
          <span>Clinical Incident Report</span>
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

        <div class="section-head">Section 2: Narrative & Initial Analysis</div>
        <table class="medical-form-table">
          <tr><th>Detailed Description</th><td>${data.description}</td></tr>
          <tr><th>Contributing Factors</th><td>${data.contributing_factors || 'No factors identified.'}</td></tr>
          <tr><th>Immediate Actions</th><td>${data.immediate_actions || 'No immediate actions recorded.'}</td></tr>
          <tr><th>Prevention Measures</th><td>${data.prevention_measures || 'Pending safety review.'}</td></tr>
          ${data.review_comments ? `<tr><th>Historical Review Comments</th><td style="color:#64748b; font-style:italic;">"${data.review_comments}"</td></tr>` : ''}
        </table>

        ${data.status === 'approved' ? `
          <div class="section-head">Section 3: Root Cause Analysis (Fishbone)</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 15px;">
            <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px;">
              <div style="font-size: 7pt; font-weight: 700; color: #64748b; margin-bottom: 4px;">ENVIRONMENT</div>
              <div style="font-size: 8pt;">${data.rca_environment || 'N/A'}</div>
            </div>
            <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px;">
              <div style="font-size: 7pt; font-weight: 700; color: #64748b; margin-bottom: 4px;">STAFF</div>
              <div style="font-size: 8pt;">${data.rca_staff || 'N/A'}</div>
            </div>
            <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px;">
              <div style="font-size: 7pt; font-weight: 700; color: #64748b; margin-bottom: 4px;">EQUIPMENT</div>
              <div style="font-size: 8pt;">${data.rca_equipment || 'N/A'}</div>
            </div>
            <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px;">
              <div style="font-size: 7pt; font-weight: 700; color: #64748b; margin-bottom: 4px;">POLICY</div>
              <div style="font-size: 8pt;">${data.rca_policy || 'N/A'}</div>
            </div>
          </div>

          ${parsedVerification.length > 0 ? `
            <div style="padding: 0 20px 15px 20px;">
              <div style="font-size: 8pt; font-weight: 700; color: #475569; margin-bottom: 6px;">VERIFICATION TABLE</div>
              <table style="width: 100%; border-collapse: collapse; font-size: 7.5pt; border: 1px solid #e2e8f0;">
                <thead>
                  <tr style="background: #f8fafc;">
                    <th style="padding: 6px; border: 1px solid #e2e8f0; text-align: left;">Cause Factor</th>
                    <th style="padding: 6px; border: 1px solid #e2e8f0; text-align: left;">Verification Method</th>
                    <th style="padding: 6px; border: 1px solid #e2e8f0; text-align: left;">Acceptance</th>
                  </tr>
                </thead>
                <tbody>
                  ${parsedVerification.map(v => `
                    <tr>
                      <td style="padding: 6px; border: 1px solid #e2e8f0;">${v.factor}</td>
                      <td style="padding: 6px; border: 1px solid #e2e8f0;">${v.test}</td>
                      <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight:700;">${v.result}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <div class="section-head">Section 4: Corrective Action Plan</div>
          ${parsedActions.length > 0 ? `
            <div style="padding: 15px 20px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 7.5pt; border: 1px solid #e2e8f0;">
                <thead>
                  <tr style="background: #f8fafc;">
                    <th style="padding: 6px; border: 1px solid #e2e8f0; text-align: left;">Objective</th>
                    <th style="padding: 6px; border: 1px solid #e2e8f0; text-align: left;">Activity</th>
                    <th style="padding: 6px; border: 1px solid #e2e8f0; text-align: left;">Timeline</th>
                    <th style="padding: 6px; border: 1px solid #e2e8f0; text-align: left;">Resp.</th>
                  </tr>
                </thead>
                <tbody>
                  ${parsedActions.map(a => `
                    <tr>
                      <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight:700;">${a.objective}</td>
                      <td style="padding: 6px; border: 1px solid #e2e8f0;">${a.activity}</td>
                      <td style="padding: 6px; border: 1px solid #e2e8f0;">${a.timeline}</td>
                      <td style="padding: 6px; border: 1px solid #e2e8f0;">${a.resp}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <div style="padding: 10px 20px 20px 20px;">
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px;">
              <div style="font-size: 7pt; font-weight: 700; color: #166534; margin-bottom: 4px;">HSFP SUMMARY CONCLUSION</div>
              <div style="font-size: 9pt; color: #14532d; font-style: italic;">"${data.hsfp_comments}"</div>
            </div>
          </div>
        ` : ''}

        <div class="signature-grid" style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
          <div class="sig-box">
            <span class="sig-label">Reported By</span>
            <div class="sig-line">${data.creator_name || '...'}</div>
            <span class="sig-meta">Staff ID: ${data.created_by} | ${new Date(data.created_at).toLocaleDateString()}</span>
          </div>
          <div class="sig-box" style="flex: 2;">
            <span class="sig-label">H.S.F.P Approval & Safety Validation</span>
            <div class="sig-line" style="color: ${data.status === 'approved' ? '#166534' : '#94a3b8'};">
              ${data.approver_name ? `APPROVED: ${data.approver_name}` : 'Awaiting Safety Analysis'}
            </div>
            <span class="sig-meta">${data.approved_at ? new Date(data.approved_at).toLocaleDateString() : 'Pending HSFP Review'}</span>
          </div>
        </div>
      </div>
    `;
  }
  else if (type === 'REFUND') {
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
          <span style="font-size: 8pt; opacity: 0.8;">Laboratory Services</span>
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
  } else if (type === 'SAFETY') {
    content = `
      <div class="medical-form-modern">
        <div class="medical-form-header" style="background-color: #003b44;">
          <span>Consolidated Safety Investigation</span>
          <span style="font-size: 8pt; opacity: 0.8;">Health & Safety Focal Office</span>
        </div>
        
        <div class="section-head">Section 1: Investigation Identification</div>
        <table class="medical-form-table">
          <tr><th>Report Title</th><td class="important-value">${data.title}</td></tr>
          <tr><th>Investigation Period</th><td>${new Date(data.period_start).toLocaleDateString()} — ${new Date(data.period_end).toLocaleDateString()}</td></tr>
          <tr><th>Author / Investigator</th><td>${data.creator_name}</td></tr>
          <tr><th>Submission Date</th><td>${new Date(data.created_at).toLocaleDateString()}</td></tr>
        </table>

        <div class="section-head">Section 2: Executive Summary</div>
        <div style="padding: 15px 20px; font-size: 8.5pt; color: #1e293b; line-height: 1.6; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
          ${data.executive_summary}
        </div>

        <div class="section-head">Section 3: Key Findings & RCA Aggregation</div>
        <div style="padding: 15px 20px; font-size: 8.5pt; color: #1e293b; line-height: 1.6; border-bottom: 1px solid #e2e8f0; white-space: pre-wrap;">
          ${data.key_findings}
        </div>

        <div class="section-head">Section 4: Strategic Recommendations</div>
        <div style="padding: 15px 20px; font-size: 8.5pt; color: #14532d; font-weight: 500; line-height: 1.6; background: #f0fdf4;">
          ${data.recommendations}
        </div>

        <div class="signature-grid" style="border-top: 1.5px solid #003b44; padding-top: 25px;">
          <div class="sig-box">
            <span class="sig-label">Investigator Signature</span>
            <div class="sig-line">${data.creator_name}</div>
            <span class="sig-meta">Digitally Certified: ${new Date(data.created_at).toLocaleString()}</span>
          </div>
          <div class="sig-box" style="grid-column: span 2;">
            <span class="sig-label">Official Approval & Clinical Board Validation</span>
            <div class="sig-line" style="border-bottom-style: dashed; color: #94a3b8;">Awaiting Board Review</div>
            <span class="sig-meta">Final safety certification pending board signature</span>
          </div>
        </div>
      </div>
    `;
  } else if (type === 'CLINICAL_SHEET') {
    const iden = data.identification || {};
    const triage = data.triage || {};
    const notes = data.progress_notes || [];
    const mar = data.medication_mar || {};
    const sbar = data.sbar || {};

    content = `
      <div class="medical-form-modern" style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; font-size: 7.5pt;">
        
        <!-- Header -->
        <div style="background-color: #f1f5f9; padding: 10px 15px; border-bottom: 2px solid ${primaryDark}; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="margin: 0; font-size: 13pt; color: ${primaryDark}; text-transform: uppercase; letter-spacing: 0.5px;">Patient Observation Records</h2>
            <div style="font-size: 7pt; color: #64748b; font-weight: 600; margin-top: 2px;">Legacy Clinics & Diagnostics • Nursing Department</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10pt; font-family: monospace; font-weight: 800; color: ${primaryTeal}; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 4px; background: white;">PID: ${iden.pid || 'N/A'}</div>
          </div>
        </div>

        <!-- I. Identification -->
        <div style="padding: 10px 15px;">
          <div style="font-size: 8.5pt; font-weight: 800; color: ${primaryDark}; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 8px;">I. Patient Identification</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 7.5pt;">
            <tr>
              <td style="width: 15%; color: #64748b; padding: 3px 0;">Patient Name:</td>
              <td style="width: 35%; font-weight: 700; border-bottom: 1px dashed #cbd5e1; padding: 3px 0;">${iden.last_name || ''} ${iden.first_name || ''}</td>
              <td style="width: 15%; color: #64748b; padding: 3px 0; padding-left: 10px;">Date of Birth:</td>
              <td style="width: 35%; font-weight: 700; border-bottom: 1px dashed #cbd5e1; padding: 3px 0;">${iden.dob || ''} (${iden.gender || ''})</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 3px 0;">ID / Passport:</td>
              <td style="font-weight: 700; border-bottom: 1px dashed #cbd5e1; padding: 3px 0;">${iden.national_id || ''}</td>
              <td style="color: #64748b; padding: 3px 0; padding-left: 10px;">Insurance:</td>
              <td style="font-weight: 700; border-bottom: 1px dashed #cbd5e1; padding: 3px 0;">${iden.insurance || ''}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 3px 0;">Appt Date/No:</td>
              <td style="font-weight: 700; border-bottom: 1px dashed #cbd5e1; padding: 3px 0;">${iden.appt_date_no || ''}</td>
              <td style="color: #64748b; padding: 3px 0; padding-left: 10px;">Attending RN:</td>
              <td style="font-weight: 700; border-bottom: 1px dashed #cbd5e1; padding: 3px 0;">${iden.rn || ''} (Time: ${iden.time || ''})</td>
            </tr>
          </table>
        </div>

        <!-- II. Triage & Vitals -->
        <div style="background-color: #f8fafc; padding: 10px 15px; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
          <div style="font-size: 8.5pt; font-weight: 800; color: ${primaryDark}; text-transform: uppercase; margin-bottom: 8px;">II. Triage & Initial Assessment</div>
          
          <div style="display: flex; gap: 15px; margin-bottom: 10px;">
            <div style="flex: 1; border: 1px solid #cbd5e1; background: white; border-radius: 4px; padding: 6px;">
              <div style="font-size: 6.5pt; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 3px;">Prev. Illness (Med/Surg)</div>
              <div style="font-weight: 600;">Med: ${triage.prev_illness_med || 'None'} | Surg: ${triage.prev_illness_surg || 'None'}</div>
            </div>
            <div style="flex: 1; border: 1px solid #fca5a5; background: #fef2f2; border-radius: 4px; padding: 6px;">
              <div style="font-size: 6.5pt; color: #b91c1c; text-transform: uppercase; font-weight: 700; margin-bottom: 3px;">Known Allergies</div>
              <div style="font-weight: 700; color: #7f1d1d;">1. ${triage.allergy_1 || 'None'} <span style="margin: 0 5px;">|</span> 2. ${triage.allergy_2 || 'None'}</div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; text-align: center; border: 1px solid #cbd5e1; background: white;">
            <tr style="background: #e2e8f0; font-size: 7pt; color: #334155;">
              <th style="padding: 4px; border: 1px solid #cbd5e1;">Temp (°C)</th>
              <th style="padding: 4px; border: 1px solid #cbd5e1;">Pulse (bpm)</th>
              <th style="padding: 4px; border: 1px solid #cbd5e1;">Resp (bpm)</th>
              <th style="padding: 4px; border: 1px solid #cbd5e1;">BP (mmHg)</th>
              <th style="padding: 4px; border: 1px solid #cbd5e1;">Weight (kg)</th>
              <th style="padding: 4px; border: 1px solid #cbd5e1;">SpO2 (%)</th>
            </tr>
            <tr style="font-weight: 700; font-size: 8.5pt;">
              <td style="padding: 5px; border: 1px solid #cbd5e1;">${triage.temp || '-'}</td>
              <td style="padding: 5px; border: 1px solid #cbd5e1;">${triage.pulse || '-'}</td>
              <td style="padding: 5px; border: 1px solid #cbd5e1;">${triage.rr || '-'}</td>
              <td style="padding: 5px; border: 1px solid #cbd5e1;">${triage.bp || '-'}</td>
              <td style="padding: 5px; border: 1px solid #cbd5e1;">${triage.weight || '-'}</td>
              <td style="padding: 5px; border: 1px solid #cbd5e1;">${triage.spo2 || '-'}</td>
            </tr>
          </table>
          ${triage.general_comments ? `
            <div style="margin-top: 8px; font-size: 7.5pt;">
              <strong style="color: #475569;">Triage Notes:</strong> <span style="font-style: italic;">${triage.general_comments}</span>
            </div>
          ` : ''}
        </div>

        <!-- III. Progress Notes -->
        <div style="padding: 10px 15px;">
          <div style="font-size: 8.5pt; font-weight: 800; color: ${primaryDark}; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 8px;">III. Clinical Progress Notes</div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; font-size: 7.5pt;">
            <tr style="background: #f1f5f9; color: #475569;">
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1; width: 15%; text-align: left;">Date/Time</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1; width: 65%; text-align: left;">Observation / Intervention Note</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1; width: 20%; text-align: left;">Signature</th>
            </tr>
            ${notes.length > 0 ? notes.map(n => `
              <tr>
                <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 600; vertical-align: top;">${n.datetime || ''}</td>
                <td style="padding: 5px 8px; border: 1px solid #cbd5e1; vertical-align: top; line-height: 1.4;">${n.note || ''}</td>
                <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-style: italic; vertical-align: top; color: #64748b;">${n.signature || ''}</td>
              </tr>
            `).join('') : `
              <tr><td colspan="3" style="padding: 12px; text-align: center; color: #94a3b8; font-style: italic;">No clinical progress notes recorded.</td></tr>
            `}
          </table>
        </div>

        <!-- IV. MAR -->
        <div style="background-color: #f8fafc; padding: 10px 15px; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
            <div style="font-size: 8.5pt; font-weight: 800; color: ${primaryDark}; text-transform: uppercase;">IV. Medication Administration Record (MAR)</div>
            <div style="font-size: 7pt; color: #475569;">Prescriber: <strong>${mar.prescriber || '___________________'}</strong></div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; font-size: 7pt; background: white; text-align: center;">
            <tr style="background: #e2e8f0; color: #334155;">
              <th style="padding: 4px; border: 1px solid #cbd5e1; width: 16%;">Intervention</th>
              <th style="padding: 4px; border: 1px solid #cbd5e1; width: 21%;">Medication 1</th>
              <th style="padding: 4px; border: 1px solid #cbd5e1; width: 21%;">Medication 2</th>
              <th style="padding: 4px; border: 1px solid #cbd5e1; width: 21%;">Medication 3</th>
              <th style="padding: 4px; border: 1px solid #cbd5e1; width: 21%;">Medication 4</th>
            </tr>
            ${[
        { label: 'Name / Drug', key: 'name' },
        { label: 'Dose', key: 'dose' },
        { label: 'Route', key: 'route' },
        { label: 'Frequency', key: 'frequency' },
        { label: 'Time (Start - End)', key: 'time' }
      ].map(field => `
              <tr>
                <td style="padding: 4px; border: 1px solid #cbd5e1; font-weight: 700; text-align: left; background: #f8fafc;">${field.label}</td>
                ${[0, 1, 2, 3].map(i => {
        const item = mar.interventions && mar.interventions[i] ? mar.interventions[i] : {};
        const val = field.key === 'time'
          ? (item.start_time || item.end_time ? `${item.start_time || ''} - ${item.end_time || ''}` : '')
          : (item[field.key] || '');
        return `<td style="padding: 4px; border: 1px solid #cbd5e1; ${field.key === 'name' ? 'font-weight:700;' : ''}">${val}</td>`;
      }).join('')}
              </tr>
            `).join('')}
          </table>

          <div style="margin-top: 10px; display: flex; gap: 15px;">
            <table style="width: 40%; border-collapse: collapse; border: 1px solid #cbd5e1; font-size: 7pt; background: white; text-align: center;">
              <tr style="background: #e2e8f0;">
                <th style="padding: 3px; border: 1px solid #cbd5e1;">Given Time</th>
                <th style="padding: 3px; border: 1px solid #cbd5e1;">Initials</th>
              </tr>
              ${Array(4).fill(0).map((_, i) => `
                <tr>
                  <td style="padding: 3px; border: 1px solid #cbd5e1; height: 14px;">${(mar.admin_logs && mar.admin_logs[i] && mar.admin_logs[i].time) || ''}</td>
                  <td style="padding: 3px; border: 1px solid #cbd5e1; height: 14px; font-style: italic;">${(mar.admin_logs && mar.admin_logs[i] && mar.admin_logs[i].initials) || ''}</td>
                </tr>
              `).join('')}
            </table>
            <div style="flex: 1; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; font-size: 7.5pt;">
              <div style="color: #64748b; font-weight: 700; margin-bottom: 4px; text-transform: uppercase;">Administering Nurses</div>
              <div style="margin-bottom: 6px;"><strong>Initials List:</strong> ${mar.admin_initials || '__________________'}</div>
              <div><strong>Full Names:</strong> ${mar.admin_names || '________________________________________________'}</div>
            </div>
          </div>
        </div>

        <!-- V. SBAR -->
        <div style="padding: 10px 15px;">
          <div style="font-size: 8.5pt; font-weight: 800; color: ${primaryDark}; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 8px;">V. SBAR Hand-Over Summary</div>
          <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px; font-size: 7.5pt; min-height: 40px; margin-bottom: 8px; line-height: 1.5;">
            ${sbar.content || '<span style="color:#94a3b8; font-style:italic;">No SBAR report documented.</span>'}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 7pt; border-top: 1px solid #e2e8f0; padding-top: 8px;">
            <div>
              <div style="margin-bottom: 3px;"><strong>Reported by:</strong> <span style="border-bottom: 1px dashed #cbd5e1; padding: 0 20px 0 5px;">${sbar.reported_by || ''}</span></div>
              <div><strong>Sign / Time:</strong> <span style="border-bottom: 1px dashed #cbd5e1; padding: 0 20px 0 5px;">${sbar.reported_sign_time || ''}</span></div>
            </div>
            <div>
              <div style="margin-bottom: 3px;"><strong>Received by:</strong> <span style="border-bottom: 1px dashed #cbd5e1; padding: 0 20px 0 5px;">${sbar.received_by || ''}</span></div>
              <div><strong>Sign / Time:</strong> <span style="border-bottom: 1px dashed #cbd5e1; padding: 0 20px 0 5px;">${sbar.received_sign_time || ''}</span></div>
            </div>
          </div>
        </div>

        <!-- ── Document Authenticity Footer ── -->
        <div style="border-top: 1.5px solid #e2e8f0; margin: 0 15px; padding: 8px 0; display: flex; align-items: center; gap: 12px;">
          ${data._qrCodeDataUrl ? `
            <img src="${data._qrCodeDataUrl}" alt="Verification QR" style="width: 64px; height: 64px; border: 1px solid #e2e8f0; border-radius: 4px; flex-shrink: 0;" />
          ` : `
            <div style="width: 64px; height: 64px; border: 1px solid #e2e8f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #f8fafc; flex-shrink: 0;">
              <span style="font-size: 6pt; color: #94a3b8; text-align: center;">QR<br>N/A</span>
            </div>
          `}
          <div style="flex: 1;">
            <div style="font-size: 6pt; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px;">Document Authenticity</div>
            <div style="font-size: 7.5pt; font-family: monospace; font-weight: 700; color: #1b669e; letter-spacing: 0.04em; margin-bottom: 2px;">${data._docRef || 'LC-CLN-?????'}</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
              <span style="font-size: 6pt; color: #64748b; font-weight: 600;">SHA-256 CHECKSUM:</span>
              <span style="font-size: 7pt; font-family: monospace; font-weight: 800; color: #0f172a; letter-spacing: 0.1em; background: #f1f5f9; padding: 1px 5px; border-radius: 3px; border: 1px solid #e2e8f0;">${data._checksum || '????????????????'}</span>
            </div>
            <div style="font-size: 5.5pt; color: #94a3b8; line-height: 1.4;">
             
            </div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: 5.5pt; color: #94a3b8; margin-bottom: 2px;">Issued:</div>
            <div style="font-size: 6pt; font-weight: 700; color: #475569;">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div style="font-size: 5.5pt; color: #94a3b8; margin-top: 4px;">Legacy Clinics</div>
            <div style="font-size: 5.5pt; color: #94a3b8;">Nursing Dept.</div>
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
