'use strict';
const fs = require('fs');
const path = require('path');

// Pre-load images to base64 for high-fidelity embedding. Paths must be
// resolved relative to this module -- absolute developer-machine paths do
// not exist on the deployed serverless filesystem.
const loadAssetBase64 = (...segments) => {
  try {
    const assetPath = path.join(__dirname, '..', 'assets', ...segments);
    if (fs.existsSync(assetPath)) {
      return `data:image/png;base64,${fs.readFileSync(assetPath).toString('base64')}`;
    }
    console.error('PDF asset not found:', assetPath);
  } catch (err) {
    console.error(`Failed to load PDF asset ${segments.join('/')}:`, err);
  }
  return '';
};

const logoBase64 = loadAssetBase64('logo.png');
const approvedStampBase64 = loadAssetBase64('stamps', 'approved.png');
const rejectedStampBase64 = loadAssetBase64('stamps', 'rejected.png');
const verifiedStampBase64 = loadAssetBase64('stamps', 'verified.png');

/**
 * Modern PDF Template Generator
 * Designed for High-Fidelity Clinical Reports
 */
const getMedicalReportHTML = (type, data) => {
  const primaryTeal = '#007b8a';
  const primaryDark = '#1b669e';
  const brandGreen = '#71b647';

  let stampHtml = '';
  if (data.status === 'approved' && approvedStampBase64) {
    stampHtml = `<div class="stamp"><img src="${approvedStampBase64}" alt="APPROVED" /></div>`;
  } else if (data.status === 'rejected' && rejectedStampBase64) {
    stampHtml = `<div class="stamp"><img src="${rejectedStampBase64}" alt="REJECTED" /></div>`;
  } else if (data.status === 'verified' && verifiedStampBase64) {
    stampHtml = `<div class="stamp"><img src="${verifiedStampBase64}" alt="VERIFIED" /></div>`;
  }

  const titleMap = {
    'INCIDENT': 'Incident & Safety Report',
    'REFUND': 'Patient Refund Voucher',
    'CANCELLATION': 'Cancellation Form',
    'RESULT_TRANSFER': 'Results Transfer Form',
    'SAFETY': 'Safety Investigation Report',
    'CLINICAL_SHEET': 'Patient Observation Records Sheet',
    'IMAGING_REPORT': 'Radiology / Imaging Report'
  };

  const getDocId = () => {
    const year = new Date().getFullYear();
    const prefix = type === 'INCIDENT' ? 'INC' : type === 'REFUND' ? 'REF' : type === 'RESULT_TRANSFER' ? 'RST' : type === 'SAFETY' ? 'SAF' : type === 'CLINICAL_SHEET' ? 'CLN' : type === 'IMAGING_REPORT' ? 'IMG' : 'CAN';
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
          <tr><th>SID number</th><td>${data.old_sid_number || 'N/A'}</td></tr>
          ${data.new_sid_number ? `<tr><th>Replacement SID</th><td>${data.new_sid_number}</td></tr>` : ''}
          <tr><th>Insurance / Payer</th><td>${data.insurance_payer}</td></tr>
        </table>

        <div class="section-head">Section 2: TRANSACTION DETAILS</div>
        <table class="medical-form-table">
          <tr><th>Amount to be Cancelled</th><td class="important-value" style="font-size: 11pt; color:${primaryTeal}">RWF ${Number(data.total_amount_cancelled).toLocaleString()}</td></tr>
          <tr>
            <th>Original Receipt / Invoice</th>
            <td>
              Number: <strong>${data.original_receipt_number}</strong>
              ${data.original_receipt_amount ? ` | Amount: <strong>RWF ${Number(data.original_receipt_amount).toLocaleString()}</strong>` : ''}
            </td>
          </tr>
          ${data.rectified_receipt_number ? `
            <tr>
              <th>Rectified Receipt #</th>
              <td>
                Number: <strong>${data.rectified_receipt_number}</strong>
                ${data.rectified_receipt_amount ? ` | Amount: <strong>RWF ${Number(data.rectified_receipt_amount).toLocaleString()}</strong>` : ''}
              </td>
            </tr>
          ` : ''}
          <tr><th>Initial transaction date</th><td>${data.initial_transaction_date ? new Date(data.initial_transaction_date).toLocaleDateString() : 'N/A'}</td></tr>
          ${data.rectified_date ? `<tr><th>Rectified Date</th><td>${new Date(data.rectified_date).toLocaleDateString()}</td></tr>` : ''}
          <tr><th>Reason for cancellation</th><td class="handwritten">${data.reason_for_cancellation}</td></tr>
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
    const observations = Array.isArray(data.observations) && data.observations.length > 0
      ? data.observations
      : [data];

    const firstObs = observations[0] || {};
    const iden = data.identification || firstObs.identification || {};
    const patientName = data.patient_name || `${iden.last_name || ''} ${iden.first_name || ''}`.trim() || 'Patient';
    const dob = data.dob || iden.dob || 'N/A';
    const gender = data.gender || iden.gender || 'N/A';
    const nationalId = data.national_id || iden.national_id || 'N/A';
    const insurance = data.insurance || iden.insurance || 'N/A';
    const dateRangeLabel = data.date_range_label || 'Continuous Patient Record';

    const attendedDoctors = data.attended_doctors || [];
    const attendedRNs = data.attended_rns || [];

    const attendingDoctor = data.attending_doctor || iden.attending_doctor || iden.doctor_name || (attendedDoctors.length > 0 ? attendedDoctors[0] : 'Dr. Not Specified');

    content = `
      <div class="medical-form-modern" style="border: 1.5px solid #0f172a; border-radius: 4px; overflow: hidden; font-size: 7.5pt;">
        
        <!-- Header -->
        <div style="padding: 12px 15px; background: #ffffff; display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a;">
          <div>
            <h2 style="margin: 0; font-size: 12pt; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">CONTINUOUS NURSING PROCESS & CLINICAL DOCUMENTATION</h2>
            <div style="font-size: 7pt; color: #475569; font-weight: 600; margin-top: 3px;">Legacy Clinics & Diagnostics • Nursing & Clinical Services</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 9.5pt; font-family: monospace; font-weight: 800; color: #0f172a; border: 1.5px solid #0f172a; padding: 2px 8px; border-radius: 4px; background: #f8fafc; display: inline-block;">PID: ${data.patient_id || iden.pid || 'N/A'}</div>
            <div style="font-size: 6.5pt; color: #475569; margin-top: 3px; font-weight: 600;">Timeframe: <span style="color: #0f172a; font-weight: 700;">${dateRangeLabel}</span></div>
          </div>
        </div>

        <!-- I. Patient Identification -->
        <div style="padding: 10px 15px; background: #ffffff; border-bottom: 1px solid #cbd5e1;">
          <div style="font-size: 8.5pt; font-weight: 800; color: #0f172a; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-bottom: 8px;">I. Patient Identification</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 7.5pt;">
            <tr>
              <td style="width: 15%; color: #475569; padding: 2px 0;">Patient Name:</td>
              <td style="width: 35%; font-weight: 700; color: #0f172a; border-bottom: 1px dashed #cbd5e1;">${patientName}</td>
              <td style="width: 15%; color: #475569; padding: 2px 0; padding-left: 10px;">DoB & Gender:</td>
              <td style="width: 35%; font-weight: 700; color: #0f172a; border-bottom: 1px dashed #cbd5e1;">${dob} (${gender})</td>
            </tr>
            <tr>
              <td style="color: #475569; padding: 2px 0;">National ID / Passport:</td>
              <td style="font-weight: 700; color: #0f172a; border-bottom: 1px dashed #cbd5e1;">${nationalId}</td>
              <td style="color: #475569; padding: 2px 0; padding-left: 10px;">Health Insurance:</td>
              <td style="font-weight: 700; color: #0f172a; border-bottom: 1px dashed #cbd5e1;">${insurance}</td>
            </tr>
            <tr>
              <td style="color: #475569; padding: 2px 0;">Assigned Doctor:</td>
              <td colspan="3" style="font-weight: 700; color: #1b669e; border-bottom: 1px dashed #cbd5e1;">${attendingDoctor}</td>
            </tr>
          </table>
        </div>

        <!-- II. Attended Medical Personnel Roster -->
        <div style="padding: 8px 15px; background: #f8fafc; border-bottom: 1px solid #cbd5e1;">
          <div style="font-size: 8pt; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 4px;">II. Attended Medical Personnel Roster (Selected Timeframe)</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 7.5pt;">
            <tr>
              <td style="width: 50%; vertical-align: top; padding-right: 10px;">
                <strong style="color: #334155;">Attended Doctors / Prescribers:</strong>
                <div style="color: #0f172a; font-weight: 700; margin-top: 2px;">
                  ${attendedDoctors.length > 0 ? attendedDoctors.join(', ') : 'None documented in range'}
                </div>
              </td>
              <td style="width: 50%; vertical-align: top; border-left: 1px solid #cbd5e1; padding-left: 10px;">
                <strong style="color: #334155;">Registered Nurses (RNs):</strong>
                <div style="color: #0f172a; font-weight: 700; margin-top: 2px;">
                  ${attendedRNs.length > 0 ? attendedRNs.join(', ') : 'None documented in range'}
                </div>
              </td>
            </tr>
          </table>
        </div>

        <!-- III. Continuous Observations & 5-Step Nursing Process Flowsheet -->
        <div style="padding: 10px 15px;">
          <div style="font-size: 8.5pt; font-weight: 800; color: #0f172a; text-transform: uppercase; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px; margin-bottom: 10px;">III. Continuous Observations & 5-Step Nursing Process Flowsheet</div>
          
          ${observations.map((obs, idx) => {
      const obsIden = obs.identification || {};
      const obsTriage = obs.triage || {};
      const obsMar = obs.medication_mar || {};
      const obsNotes = obs.progress_notes || [];
      const np = obsTriage.nursing_process || obs.nursing_process || {};
      const step1 = np.step1_assessment || {};
      const step2 = np.step2_diagnosis || {};
      const step3 = np.step3_planning || {};
      const step4 = np.step4_implementation || {};
      const step5 = np.step5_evaluation || {};

      const rnName = (obsIden.rn && obsIden.rn !== 'N/A' && obsIden.rn.trim() !== '') ? obsIden.rn : (obs.created_by_name || obs.created_by_username || 'Duty RN Staff');

      return `
              <div style="border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 12px; background: white; page-break-inside: avoid;">
                
                <!-- Flowsheet Row Header -->
                <div style="background: #f1f5f9; padding: 6px 10px; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-weight: 700;">
                  <span style="color: #0f172a; font-size: 8pt;">Entry #${observations.length - idx} &bull; ${obsIden.date || ''} ${obsIden.time || ''} (Queue #${obs.queue_id || 'N/A'})</span>
                  <span style="font-size: 7pt; color: #334155; background: #e2e8f0; padding: 2px 6px; border-radius: 3px; border: 1px solid #cbd5e1;">Attending RN: <strong>${rnName}</strong> &bull; Status: <strong>${obs.status || 'Draft'}</strong></span>
                </div>

                <!-- 1. Assessment -->
                <div style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">
                  <div style="font-size: 7.5pt; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 3px;">1. Assessment (Subjective, Physical Exam & Objective Vitals)</div>
                  <div style="font-size: 7.5pt; color: #1e293b; margin-bottom: 5px;">
                    <strong>Subjective Symptoms:</strong> ${step1.subjective?.symptoms || obsIden.medical_note || 'Patient assessed by nursing staff.'}
                    ${step1.subjective?.pain_description ? ` &bull; <em>Pain Details:</em> ${step1.subjective.pain_description} (Score: ${step1.subjective.pain_score || '-'}/10)` : ''}
                  </div>
                  <!-- Vitals Grid -->
                  <table style="width: 100%; border-collapse: collapse; text-align: center; border: 1px solid #cbd5e1; background: #ffffff; font-size: 7pt;">
                    <tr style="background: #f1f5f9; color: #0f172a; font-weight: 700;">
                      <th style="padding: 3px; border: 1px solid #cbd5e1;">Temp (°C)</th>
                      <th style="padding: 3px; border: 1px solid #cbd5e1;">Pulse (bpm)</th>
                      <th style="padding: 3px; border: 1px solid #cbd5e1;">Resp (bpm)</th>
                      <th style="padding: 3px; border: 1px solid #cbd5e1;">BP (mmHg)</th>
                      <th style="padding: 3px; border: 1px solid #cbd5e1;">Weight (kg)</th>
                      <th style="padding: 3px; border: 1px solid #cbd5e1;">SpO2 (%)</th>
                    </tr>
                    <tr style="font-weight: 800; font-size: 8pt; color: #0f172a;">
                      <td style="padding: 3px; border: 1px solid #cbd5e1;">${obsTriage.temp || '-'}</td>
                      <td style="padding: 3px; border: 1px solid #cbd5e1;">${obsTriage.pulse || '-'}</td>
                      <td style="padding: 3px; border: 1px solid #cbd5e1;">${obsTriage.rr || '-'}</td>
                      <td style="padding: 3px; border: 1px solid #cbd5e1;">${obsTriage.bp || '-'}</td>
                      <td style="padding: 3px; border: 1px solid #cbd5e1;">${obsTriage.weight || '-'}</td>
                      <td style="padding: 3px; border: 1px solid #cbd5e1;">${obsTriage.spo2 || '-'}</td>
                    </tr>
                  </table>
                  ${obsTriage.allergy_1 || obsTriage.allergy_2 ? `<div style="margin-top: 4px; color: #0f172a; font-weight: 700; font-size: 7pt;">Allergies: 1. ${obsTriage.allergy_1 || 'None'} | 2. ${obsTriage.allergy_2 || 'None'}</div>` : ''}

                  ${step1.physical_exam ? `
                    <div style="margin-top: 6px; padding: 4px 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 7pt;">
                      <strong style="color: #0f172a; text-transform: uppercase;">Head-to-Toe Physical Exam (Inspection, Auscultation, Percussion, Palpation):</strong>
                      <div style="margin-top: 2px; color: #1e293b;">
                        ${step1.physical_exam.head_neck ? `&bull; <strong>Head/Neck/HEENT:</strong> ${step1.physical_exam.head_neck} ` : ''}
                        ${step1.physical_exam.neurological ? `&bull; <strong>Neurological:</strong> ${step1.physical_exam.neurological} ` : ''}
                        ${step1.physical_exam.cardiovascular ? `&bull; <strong>Cardiovascular:</strong> ${step1.physical_exam.cardiovascular} ` : ''}
                        ${step1.physical_exam.respiratory ? `&bull; <strong>Respiratory/Lungs:</strong> ${step1.physical_exam.respiratory} ` : ''}
                        ${step1.physical_exam.chest_lungs && !step1.physical_exam.respiratory ? `&bull; <strong>Chest/Lungs:</strong> ${step1.physical_exam.chest_lungs} ` : ''}
                        ${step1.physical_exam.abdomen ? `&bull; <strong>Abdomen/GI:</strong> ${step1.physical_exam.abdomen} ` : ''}
                        ${step1.physical_exam.genitourinary ? `&bull; <strong>Genitourinary/Renal:</strong> ${step1.physical_exam.genitourinary} ` : ''}
                        ${step1.physical_exam.skin_integumentary ? `&bull; <strong>Skin/Integumentary:</strong> ${step1.physical_exam.skin_integumentary} ` : ''}
                        ${step1.physical_exam.extremities ? `&bull; <strong>Musculoskeletal/Extremities:</strong> ${step1.physical_exam.extremities}` : ''}
                      </div>
                    </div>
                  ` : ''}
                </div>

                <!-- 2. Diagnosis -->
                <div style="padding: 8px 10px; background: #ffffff; border-bottom: 1px solid #e2e8f0;">
                  <div style="font-size: 7.5pt; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 3px;">2. Nursing Diagnosis & 12 Activities of Living</div>
                  <div style="font-size: 7.5pt; color: #1e293b; margin-bottom: 3px;">
                    <strong>Diagnosis:</strong> <span style="font-weight: 800; color: #0f172a;">${step2.nursing_diagnosis_statement || obsIden.diagnosis || 'Standard Observation Care'}</span>
                  </div>
                  ${step2.activities_of_living && step2.activities_of_living.length > 0 ? `
                    <div style="font-size: 7pt; color: #334155;">
                      <strong>Activities of Living Impacted:</strong> ${step2.activities_of_living.join(' &bull; ')}
                    </div>
                  ` : ''}
                </div>

                <!-- 3. Planning -->
                <div style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">
                  <div style="font-size: 7.5pt; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 3px;">3. Planning & SMART Care Goals</div>
                  <div style="font-size: 7.5pt; color: #1e293b;">
                    <strong>SMART Goal:</strong> ${step3.smart_goals?.specific || 'Maintain vital stability and patient comfort.'}
                    ${step3.smart_goals?.measurable ? ` <span style="color: #334155;">(Measurable Target: ${step3.smart_goals.measurable})</span>` : ''}
                  </div>
                  <div style="font-size: 7.5pt; color: #1e293b; margin-top: 2px;">
                    <strong>Intervention Course:</strong> ${step3.care_plan_interventions || 'Regular vitals monitoring & prescribed treatment.'}
                  </div>
                </div>

                <!-- 4. Implementation -->
                <div style="padding: 8px 10px; background: #ffffff; border-bottom: 1px solid #e2e8f0;">
                  <div style="font-size: 7.5pt; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 3px;">4. Implementation & Medication MAR</div>
                  <div style="font-size: 7.5pt; color: #1e293b; margin-bottom: 4px;">
                    <strong>Care Executed:</strong> ${step4.care_plan_executed || 'Care plan interventions carried out as planned.'}
                  </div>
                  ${obsMar.interventions && obsMar.interventions.some(i => i.name) ? `
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; font-size: 7pt; background: white;">
                      <tr style="background: #f1f5f9; color: #0f172a; font-weight: 700;">
                        <th style="padding: 2px 4px; border: 1px solid #cbd5e1; text-align: left;">Medication / Drug</th>
                        <th style="padding: 2px 4px; border: 1px solid #cbd5e1;">Dose</th>
                        <th style="padding: 2px 4px; border: 1px solid #cbd5e1;">Route</th>
                        <th style="padding: 2px 4px; border: 1px solid #cbd5e1;">Freq</th>
                      </tr>
                      ${obsMar.interventions.filter(i => i.name).map(i => `
                        <tr>
                          <td style="padding: 2px 4px; border: 1px solid #cbd5e1; font-weight: 700;">${i.name}</td>
                          <td style="padding: 2px 4px; border: 1px solid #cbd5e1; text-align: center;">${i.dose || '-'}</td>
                          <td style="padding: 2px 4px; border: 1px solid #cbd5e1; text-align: center;">${i.route || '-'}</td>
                          <td style="padding: 2px 4px; border: 1px solid #cbd5e1; text-align: center;">${i.frequency || '-'}</td>
                        </tr>
                      `).join('')}
                    </table>
                    <div style="font-size: 6.5pt; color: #334155; margin-top: 3px;">
                      Prescriber: <strong>${obsMar.prescriber || 'N/A'}</strong> &bull; Administering RN(s): <strong>${obsMar.admin_names || obsMar.admin_initials || 'N/A'}</strong>
                    </div>
                  ` : ''}
                </div>

                <!-- 5. Evaluation -->
                <div style="padding: 8px 10px;">
                  <div style="font-size: 7.5pt; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 3px;">5. Evaluation & Re-Assessment</div>
                  <div style="font-size: 7.5pt; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                    <strong>Goal Status:</strong>
                    <span style="font-weight: 800; background: #f1f5f9; color: #0f172a; padding: 1px 6px; border-radius: 3px; border: 1px solid #cbd5e1;">${step5.goal_achievement_status || 'Ongoing'}</span>
                  </div>
                  <div style="font-size: 7.5pt; color: #1e293b; margin-top: 3px;">
                    <strong>Physical & Vital Trend:</strong> ${step5.vital_physical_trend || obsTriage.general_comments || 'Patient condition monitored.'}
                  </div>
                </div>

                <!-- Progress Notes if present -->
                ${obsNotes && obsNotes.some(n => n.note) ? `
                  <div style="padding: 6px 10px; background: #f8fafc; border-top: 1px dashed #cbd5e1; font-size: 7.5pt;">
                    <strong style="color: #0f172a;">Progress Notes:</strong>
                    ${obsNotes.filter(n => n.note).map(n => `
                      <div style="margin-top: 2px; color: #1e293b;">
                        <span style="color: #475569; font-weight: 600;">[${n.datetime || ''}]</span> ${n.note} <em style="color: #475569;">— ${n.signature || 'Staff'}</em>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}

              </div>
            `;
    }).join('')}
        </div>

        <!-- Document Authenticity Footer -->
        <div style="border-top: 1.5px solid #e2e8f0; margin: 0 15px; padding: 8px 0; display: flex; align-items: center; gap: 12px; background: white;">
          ${data._qrCodeDataUrl ? `
            <img src="${data._qrCodeDataUrl}" alt="Verification QR" style="width: 56px; height: 56px; border: 1px solid #e2e8f0; border-radius: 4px; flex-shrink: 0;" />
          ` : `
            <div style="width: 56px; height: 56px; border: 1px solid #e2e8f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #f8fafc; flex-shrink: 0;">
              <span style="font-size: 6pt; color: #94a3b8; text-align: center;">QR<br>N/A</span>
            </div>
          `}
          <div style="flex: 1;">
            <div style="font-size: 6pt; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;">Document Authenticity & Verification</div>
            <div style="font-size: 7.5pt; font-family: monospace; font-weight: 700; color: #1b669e; letter-spacing: 0.04em; margin-bottom: 2px;">${data._docRef || 'LC-CLN-ONLINE'}</div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 6pt; color: #64748b; font-weight: 600;">CHECKSUM:</span>
              <span style="font-size: 7pt; font-family: monospace; font-weight: 800; color: #0f172a; background: #f1f5f9; padding: 1px 5px; border-radius: 3px; border: 1px solid #e2e8f0;">${data._checksum || 'N/A'}</span>
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
  } else if (type === 'IMAGING_REPORT') {
    // Render a coded value list (LOINC / SNOMED / ICD-11) as compact chips.
    const codeChips = (codes, color) => {
      const list = Array.isArray(codes) ? codes : [];
      if (list.length === 0) return '<span style="color:#94a3b8;font-style:italic;">Not coded</span>';
      return list.map(c => `
        <span style="display:inline-block; background:${color}15; color:${color}; border:1px solid ${color}40; border-radius:4px; padding:1px 6px; margin:2px 3px 2px 0; font-size:7pt; font-weight:600;">
          ${c.display || c.code}${c.code ? ` <span style="opacity:0.7;font-family:monospace;">[${c.code}]</span>` : ''}${c.system ? ` <span style="opacity:0.55;">· ${c.system}</span>` : ''}
        </span>`).join('');
    };
    const isVerified = data.status === 'verified' && !!data.verified_at;

    content = `
      <div class="medical-form-modern">
        <div class="medical-form-header" style="background-color: ${primaryDark};">
          <span>Radiology / Imaging Report</span>
          <span style="font-size: 8pt; opacity: 0.85;">${(data.modality_label || data.modality || 'Imaging')} · ${data.status ? data.status.toUpperCase() : 'DRAFT'}</span>
        </div>

        <div class="section-head">I. Patient &amp; Study</div>
        <table class="medical-form-table">
          <tr><th>Patient Name</th><td class="important-value">${data.patient_name || ''}</td></tr>
          <tr><th>Patient ID (PID)</th><td>${data.patient_id || ''}</td></tr>
          <tr><th>Accession No.</th><td style="font-family: monospace;">${data.accession_number || ''}</td></tr>
          <tr><th>Modality / Unit</th><td>${data.sub_unit || data.modality || ''}</td></tr>
          <tr><th>Study Date</th><td>${data.acquired_at ? new Date(data.acquired_at).toLocaleString() : (data.scheduled_at ? new Date(data.scheduled_at).toLocaleString() : '')}</td></tr>
          <tr><th>Referring Provider</th><td>${data.referring_provider || '—'}</td></tr>
          <tr><th>Exam Type <span style="color:#94a3b8;">(LOINC)</span></th><td>${codeChips(data.exam_type_codes && data.exam_type_codes.length ? data.exam_type_codes : (data.exam_type_display ? [{ display: data.exam_type_display, code: data.exam_type_loinc, system: 'LOINC' }] : []), '#0369a1')}</td></tr>
          <tr><th>Clinical Indication <span style="color:#94a3b8;">(ICD-11)</span></th><td>${data.clinical_indication ? `<div style="margin-bottom:4px;">${data.clinical_indication}</div>` : ''}${codeChips(data.indication_codes, '#7c3aed')}</td></tr>
        </table>

        <div class="section-head">II. Technique</div>
        <div style="padding: 12px 20px; font-size: 8.5pt; color: #1e293b; line-height: 1.6; border-bottom: 1px solid #e2e8f0; white-space: pre-wrap;">${data.technique || '<span style="color:#94a3b8;font-style:italic;">Not recorded.</span>'}</div>

        <div class="section-head">III. Findings <span style="color:#94a3b8; font-weight:600;">(SNOMED CT)</span></div>
        <div style="padding: 12px 20px; font-size: 8.5pt; color: #1e293b; line-height: 1.6; border-bottom: 1px solid #e2e8f0; white-space: pre-wrap;">${data.findings_narrative || '<span style="color:#94a3b8;font-style:italic;">No findings recorded.</span>'}</div>
        <div style="padding: 6px 20px 12px; border-bottom: 1px solid #e2e8f0;">${codeChips(data.findings_codes, '#0f766e')}</div>

        <div class="section-head">IV. Impression</div>
        <div style="padding: 12px 20px; font-size: 9pt; font-weight: 600; color: ${primaryDark}; line-height: 1.6; background: #f8fafc; border-bottom: 1px solid #e2e8f0; white-space: pre-wrap;">${data.impression || '<span style="color:#94a3b8;font-style:italic;font-weight:400;">No impression recorded.</span>'}</div>

        <div class="section-head">V. Diagnosis <span style="color:#94a3b8; font-weight:600;">(ICD-11)</span> &amp; Recommendations</div>
        <div style="padding: 10px 20px; border-bottom: 1px solid #e2e8f0;">${codeChips(data.diagnosis_codes, '#b91c1c')}</div>
        <div style="padding: 10px 20px; font-size: 8.5pt; color: #14532d; line-height: 1.6; background: #f0fdf4; white-space: pre-wrap;">${data.recommendations || '<span style="color:#94a3b8;font-style:italic;">None.</span>'}</div>

        <div class="signature-grid" style="border-top: 1.5px solid ${primaryDark}; padding-top: 25px;">
          <div class="sig-box">
            <span class="sig-label">Reporting Radiologist</span>
            <div class="sig-line">${data.radiologist_name || '—'}</div>
            <span class="sig-meta">${data.created_at ? 'Reported: ' + new Date(data.created_at).toLocaleString() : ''}</span>
          </div>
          <div class="sig-box" style="grid-column: span 2;">
            <span class="sig-label">Verification</span>
            <div class="sig-line" style="${isVerified ? '' : 'border-bottom-style: dashed; color: #94a3b8;'}">${isVerified ? (data.verified_by_name || data.radiologist_name || 'Verified') : 'Awaiting verification'}</div>
            <span class="sig-meta">${isVerified && data.verified_at ? 'Verified: ' + new Date(data.verified_at).toLocaleString() : 'Report not yet finalised/verified'}</span>
          </div>
        </div>
        ${data.checksum ? `<div style="text-align:center; margin-top:10px; font-size:6pt; color:#94a3b8; font-family:monospace;">Integrity SHA-256: ${data.checksum}</div>` : ''}
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
          <div>KK 3 RD 134 KICUKIRO District NYARUGUNGA Sector RWANDA</div>
          <div>Tel: <span style="display:inline-flex;align-items:center;justify-content:center;background:#e11d48;color:white;width:14px;height:14px;border-radius:50%;font-size:9px;margin:0 2px;vertical-align:middle;">📞</span> 8000 | 0788 122 100 | Whatsapp: 0788 382 000</div>
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
