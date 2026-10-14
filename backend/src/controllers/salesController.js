'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { logAction } = require('../middleware/audit');
const { sendEmail, sendEmailFrom } = require('../services/emailService');

const loadAssetBase64 = (...segments) => {
  try {
    const assetPath = path.join(__dirname, '..', 'assets', ...segments);
    if (fs.existsSync(assetPath)) {
      const ext = path.extname(assetPath).toLowerCase();
      let mime = 'image/png';
      if (ext === '.svg') mime = 'image/svg+xml';
      else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
      return `data:${mime};base64,${fs.readFileSync(assetPath).toString('base64')}`;
    }
  } catch (err) {
    console.error('Failed to load asset for sales controller:', err);
  }
  return '';
};

const logoBase64 = loadAssetBase64('logo.png');
const footerBannerBase64 = loadAssetBase64('legacy_header.svg');

const q  = async (sql, args = []) => (await db.query(sql, args)).rows;
const q1 = async (sql, args = []) => (await db.query(sql, args)).rows[0] || null;

/**
 * Generate sequential invoice number: LC/PI/YYYY/0001
 */
async function generateNextInvoiceNumber() {
  const currentYear = new Date().getFullYear();
  const prefix = `LC/PI/${currentYear}/`;
  
  const row = await q1(
    `SELECT invoice_number FROM proforma_invoices 
     WHERE invoice_number LIKE ? 
     ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let seq = 1;
  if (row && row.invoice_number) {
    const parts = row.invoice_number.split('/');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      seq = lastNum + 1;
    }
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/**
 * GET /api/sales/proformas
 * Fetch proforma invoices with optional filtering and search
 */
async function getProformas(req, res) {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;

    let sql = `SELECT * FROM proforma_invoices WHERE 1=1`;
    const params = [];

    if (status && status !== 'all') {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      sql += ` AND (LOWER(invoice_number) LIKE ? OR LOWER(customer_name) LIKE ? OR LOWER(customer_email) LIKE ? OR LOWER(customer_phone) LIKE ?)`;
      params.push(term, term, term, term);
    }

    sql += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const rows = await q(sql, params);

    // Parse items_json
    const proformas = rows.map(r => ({
      ...r,
      items: (() => {
        try { return JSON.parse(r.items_json || '[]'); } catch { return []; }
      })()
    }));

    // Total count for pagination
    let countSql = `SELECT COUNT(*) as total FROM proforma_invoices WHERE 1=1`;
    const countParams = [];
    if (status && status !== 'all') {
      countSql += ` AND status = ?`;
      countParams.push(status);
    }
    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      countSql += ` AND (LOWER(invoice_number) LIKE ? OR LOWER(customer_name) LIKE ? OR LOWER(customer_email) LIKE ? OR LOWER(customer_phone) LIKE ?)`;
      countParams.push(term, term, term, term);
    }
    const countRow = await q1(countSql, countParams);

    return res.json({
      success: true,
      data: proformas,
      total: countRow?.total || 0,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (err) {
    console.error('Error in getProformas:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch proformas', error: err.message });
  }
}

/**
 * GET /api/sales/proformas/stats
 * Overview KPI metrics
 */
async function getSalesStats(req, res) {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${currentYear}-${currentMonth}`;

    const [totalRow, statusRows, monthRow] = await Promise.all([
      q1(`SELECT COUNT(*) as total_count, COALESCE(SUM(total_amount), 0) as total_value FROM proforma_invoices`),
      q(`SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_value FROM proforma_invoices GROUP BY status`),
      q1(`SELECT COUNT(*) as month_count, COALESCE(SUM(total_amount), 0) as month_value FROM proforma_invoices WHERE invoice_date LIKE ?`, [`${monthPrefix}%`])
    ]);

    const statusCounts = {};
    const statusValues = {};
    for (const r of statusRows) {
      statusCounts[r.status] = Number(r.count);
      statusValues[r.status] = Number(r.total_value);
    }

    return res.json({
      success: true,
      data: {
        totalCount: totalRow?.total_count || 0,
        totalValue: totalRow?.total_value || 0,
        monthCount: monthRow?.month_count || 0,
        monthValue: monthRow?.month_value || 0,
        statusCounts,
        statusValues
      }
    });
  } catch (err) {
    console.error('Error in getSalesStats:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch stats', error: err.message });
  }
}

/**
 * GET /api/sales/proformas/:id
 */
async function getProformaById(req, res) {
  try {
    const { id } = req.params;
    const row = await q1(`SELECT * FROM proforma_invoices WHERE id = ? OR invoice_number = ?`, [id, id]);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Proforma invoice not found' });
    }

    return res.json({
      success: true,
      data: {
        ...row,
        items: (() => {
          try { return JSON.parse(row.items_json || '[]'); } catch { return []; }
        })()
      }
    });
  } catch (err) {
    console.error('Error in getProformaById:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch proforma', error: err.message });
  }
}

/**
 * POST /api/sales/proformas
 * Create a new proforma invoice
 */
async function createProforma(req, res) {
  try {
    const {
      invoice_number,
      invoice_date,
      due_date = 'N/A',
      customer_id = '',
      customer_name,
      customer_email = '',
      customer_phone = '',
      customer_tin = '',
      customer_address = '',
      items = [],
      taxable_amount = 0,
      tax_due = 0,
      other_fees = 0,
      currency = 'RWF',
      terms_details = '',
      bank_details = '',
      momo_details = '',
      prepared_by_title = 'Sales Manager',
      prepared_by_name = '',
      contact_person = 'Sofia, 0787363970, E-mail: sofia@legacyclinics.rw',
      notes = '',
      status = 'Draft'
    } = req.body;

    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({ success: false, message: 'Customer / Recipient name is required' });
    }

    // Auto-calculate subtotal and total amount
    const sanitizedItems = (Array.isArray(items) ? items : []).map(item => {
      const qty = Math.max(1, parseFloat(item.quantity) || 1);
      const up = Math.max(0, parseFloat(item.unit_price) || 0);
      return {
        description: (item.description || '').trim(),
        quantity: qty,
        unit_price: up,
        amount: qty * up
      };
    });

    const subtotal = sanitizedItems.reduce((sum, item) => sum + item.amount, 0);
    const total_amount = subtotal + (parseFloat(tax_due) || 0) + (parseFloat(other_fees) || 0);

    const invNum = invoice_number && invoice_number.trim() 
      ? invoice_number.trim() 
      : await generateNextInvoiceNumber();

    const invDate = invoice_date || new Date().toISOString().split('T')[0];

    const prepName = prepared_by_name || req.user?.fullName || req.user?.full_name || 'Legacy Clinics Sales';

    const insertRes = await db.query(
      `INSERT INTO proforma_invoices (
        invoice_number, invoice_date, due_date, customer_id, customer_name,
        customer_email, customer_phone, customer_tin, customer_address,
        items_json, subtotal, taxable_amount, tax_due, other_fees, total_amount,
        currency, terms_details, bank_details, momo_details,
        prepared_by_title, prepared_by_name, contact_person, notes, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *`,
      [
        invNum, invDate, due_date, customer_id, customer_name.trim(),
        customer_email.trim(), customer_phone.trim(), customer_tin.trim(), customer_address.trim(),
        JSON.stringify(sanitizedItems), subtotal, parseFloat(taxable_amount) || 0,
        parseFloat(tax_due) || 0, parseFloat(other_fees) || 0, total_amount,
        currency, terms_details, bank_details, momo_details,
        prepared_by_title, prepName, contact_person, notes, status, req.user?.id || null
      ]
    );

    const created = insertRes.rows?.[0];

    try {
      await logAction(req, 'CREATE_PROFORMA', 'proforma_invoices', created?.id || 0, {
        invoice_number: invNum,
        customer_name,
        total_amount
      });
    } catch (e) {}

    return res.status(201).json({
      success: true,
      message: `Proforma invoice ${invNum} created successfully`,
      data: {
        ...created,
        items: sanitizedItems
      }
    });
  } catch (err) {
    console.error('Error in createProforma:', err);
    return res.status(500).json({ success: false, message: 'Failed to create proforma', error: err.message });
  }
}

/**
 * PUT /api/sales/proformas/:id
 * Update an existing proforma invoice
 */
async function updateProforma(req, res) {
  try {
    const { id } = req.params;
    const existing = await q1(`SELECT * FROM proforma_invoices WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Proforma invoice not found' });
    }

    const {
      invoice_date,
      due_date,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      customer_tin,
      customer_address,
      items,
      taxable_amount,
      tax_due,
      other_fees,
      currency,
      terms_details,
      bank_details,
      momo_details,
      prepared_by_title,
      prepared_by_name,
      contact_person,
      notes,
      status
    } = req.body;

    const sanitizedItems = items ? items.map(item => {
      const qty = Math.max(1, parseFloat(item.quantity) || 1);
      const up = Math.max(0, parseFloat(item.unit_price) || 0);
      return {
        description: (item.description || '').trim(),
        quantity: qty,
        unit_price: up,
        amount: qty * up
      };
    }) : JSON.parse(existing.items_json || '[]');

    const subtotal = sanitizedItems.reduce((sum, item) => sum + item.amount, 0);
    const newTaxDue = tax_due !== undefined ? (parseFloat(tax_due) || 0) : existing.tax_due;
    const newOther = other_fees !== undefined ? (parseFloat(other_fees) || 0) : existing.other_fees;
    const total_amount = subtotal + newTaxDue + newOther;

    await db.query(
      `UPDATE proforma_invoices SET
        invoice_date = $1,
        due_date = $2,
        customer_id = $3,
        customer_name = $4,
        customer_email = $5,
        customer_phone = $6,
        customer_tin = $7,
        customer_address = $8,
        items_json = $9,
        subtotal = $10,
        taxable_amount = $11,
        tax_due = $12,
        other_fees = $13,
        total_amount = $14,
        currency = $15,
        terms_details = $16,
        bank_details = $17,
        momo_details = $18,
        prepared_by_title = $19,
        prepared_by_name = $20,
        contact_person = $21,
        notes = $22,
        status = $23,
        updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      WHERE id = $24`,
      [
        invoice_date !== undefined ? invoice_date : existing.invoice_date,
        due_date !== undefined ? due_date : existing.due_date,
        customer_id !== undefined ? customer_id : existing.customer_id,
        customer_name !== undefined ? customer_name.trim() : existing.customer_name,
        customer_email !== undefined ? customer_email.trim() : existing.customer_email,
        customer_phone !== undefined ? customer_phone.trim() : existing.customer_phone,
        customer_tin !== undefined ? customer_tin.trim() : existing.customer_tin,
        customer_address !== undefined ? customer_address.trim() : existing.customer_address,
        JSON.stringify(sanitizedItems),
        subtotal,
        taxable_amount !== undefined ? (parseFloat(taxable_amount) || 0) : existing.taxable_amount,
        newTaxDue,
        newOther,
        total_amount,
        currency !== undefined ? currency : existing.currency,
        terms_details !== undefined ? terms_details : existing.terms_details,
        bank_details !== undefined ? bank_details : existing.bank_details,
        momo_details !== undefined ? momo_details : existing.momo_details,
        prepared_by_title !== undefined ? prepared_by_title : existing.prepared_by_title,
        prepared_by_name !== undefined ? prepared_by_name : existing.prepared_by_name,
        contact_person !== undefined ? contact_person : existing.contact_person,
        notes !== undefined ? notes : existing.notes,
        status !== undefined ? status : existing.status,
        id
      ]
    );

    const updated = await q1(`SELECT * FROM proforma_invoices WHERE id = ?`, [id]);

    try {
      await logAction(req, 'UPDATE_PROFORMA', 'proforma_invoices', id, {
        invoice_number: existing.invoice_number,
        total_amount
      });
    } catch (e) {}

    return res.json({
      success: true,
      message: 'Proforma updated successfully',
      data: {
        ...updated,
        items: sanitizedItems
      }
    });
  } catch (err) {
    console.error('Error in updateProforma:', err);
    return res.status(500).json({ success: false, message: 'Failed to update proforma', error: err.message });
  }
}

/**
 * DELETE /api/sales/proformas/:id
 */
async function deleteProforma(req, res) {
  try {
    const { id } = req.params;
    const existing = await q1(`SELECT * FROM proforma_invoices WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Proforma invoice not found' });
    }

    await db.query(`DELETE FROM proforma_invoices WHERE id = $1`, [id]);

    try {
      await logAction(req, 'DELETE_PROFORMA', 'proforma_invoices', id, {
        invoice_number: existing.invoice_number
      });
    } catch (e) {}

    return res.json({ success: true, message: `Proforma invoice ${existing.invoice_number} deleted` });
  } catch (err) {
    console.error('Error in deleteProforma:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete proforma', error: err.message });
  }
}

/**
 * POST /api/sales/proformas/:id/email
 * Email proforma directly to customer from sales@legacyclinics.rw with PDF attachment
 */
async function sendProformaEmail(req, res) {
  try {
    const { id } = req.params;
    const { recipient_email, custom_message = '' } = req.body;

    const row = await q1(`SELECT * FROM proforma_invoices WHERE id = $1`, [id]);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Proforma invoice not found' });
    }

    const toEmail = (recipient_email || row.customer_email || '').trim();
    if (!toEmail) {
      return res.status(400).json({ success: false, message: 'No recipient email specified' });
    }

    const items = (() => {
      try { return JSON.parse(row.items_json || '[]'); } catch { return []; }
    })();

    // ── Build the email HTML (inline) ──────────────────────────────────────
    const rowsHtml = items.map((it, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 9px 12px; border: 1px solid #cbd5e1; font-size: 13px; text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="padding: 9px 12px; border: 1px solid #cbd5e1; font-size: 13px; color: #1e293b; font-weight: 600;">${it.description || ''}</td>
        <td style="padding: 9px 12px; border: 1px solid #cbd5e1; font-size: 13px; text-align: center; color: #1e293b;">${it.quantity}</td>
        <td style="padding: 9px 12px; border: 1px solid #cbd5e1; font-size: 13px; text-align: right; color: #1e293b;">${Number(it.unit_price).toLocaleString()}</td>
        <td style="padding: 9px 12px; border: 1px solid #cbd5e1; font-size: 13px; text-align: right; font-weight: 700; color: #0f172a;">${Number(it.amount).toLocaleString()}</td>
      </tr>
    `).join('');

    const emailSubject = `Legacy Clinics — Proforma Invoice ${row.invoice_number} for ${row.customer_name}`;
    const safeNum = (row.invoice_number || 'proforma').replace(/[\/\\:*?"<>|]/g, '-');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px; color: #1e293b; }
          .container { max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #003b44 0%, #005f6e 100%); padding: 24px 32px; color: #ffffff; }
          .header-table { width: 100%; border: none; margin: 0; }
          .header-title { margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
          .header-subtitle { margin: 4px 0 0; font-size: 12px; color: #cbd5e1; }
          .header-meta { margin: 2px 0 0; font-size: 11px; color: #94a3b8; }
          .badge { display: inline-block; background-color: #0284c7; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1px; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; }
          .content { padding: 28px 32px; }
          .greeting { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
          .intro { font-size: 13.5px; color: #334155; line-height: 1.6; margin-bottom: 20px; }
          .custom-msg { padding: 12px 16px; background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px; margin-bottom: 20px; font-size: 13px; color: #166534; line-height: 1.5; }
          .info-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
          .info-table { width: 100%; border-collapse: collapse; }
          .info-table td { padding: 4px 8px; font-size: 12.5px; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #cbd5e1; }
          .items-table th { background-color: #0284c7; color: #ffffff; padding: 9px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #0284c7; }
          .totals-table { width: 300px; margin-left: auto; border-collapse: collapse; margin-top: 10px; }
          .totals-table td { padding: 6px 10px; font-size: 13px; }
          .total-row { background-color: #e0f2fe; color: #0369a1; font-size: 14px; font-weight: 800; border-top: 2px solid #0284c7; }
          .payment-box { margin-top: 24px; padding: 16px 20px; border: 1.5px solid #94a3b8; border-radius: 8px; background-color: #f8fafc; font-size: 12px; line-height: 1.6; color: #334155; }
          .attachment-box { margin-top: 20px; padding: 12px 16px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; font-size: 12.5px; color: #1e40af; }
          .footer { padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <table class="header-table">
              <tr>
                <td style="border: none; padding: 0;">
                  <h2 class="header-title">LEGACY CLINICS &amp; DIAGNOSTICS</h2>
                  <p class="header-subtitle">Speciality Clinic • Diagnostics • Dental</p>
                  <p class="header-meta">KG 3 RD 134, Nyarugunga, Kigali | Phone: +250 788 122 100 | TIN: 103672011</p>
                </td>
                <td style="border: none; padding: 0; text-align: right; vertical-align: top;">
                  <span class="badge">PROFORMA INVOICE</span>
                  <div style="font-size: 13px; color: #ffffff; margin-top: 6px; font-weight: 700;">INV #: ${row.invoice_number}</div>
                  <div style="font-size: 12px; color: #cbd5e1;">DATE: ${row.invoice_date}</div>
                </td>
              </tr>
            </table>
          </div>

          <div class="content">
            <div class="greeting">Dear ${row.customer_name},</div>
            <div class="intro">
              Thank you for trusting Legacy Clinics &amp; Diagnostics Ltd. Please find your official Proforma Invoice detailed below. An official printable PDF copy is attached to this email.
            </div>

            ${custom_message ? `<div class="custom-msg"><strong>Message from Sales Team:</strong><br>${custom_message}</div>` : ''}

            <div class="info-card">
              <table class="info-table">
                <tr>
                  <td style="width: 20%; color: #64748b; font-weight: 600;">Recipient:</td>
                  <td style="width: 40%; font-weight: 700; color: #0f172a;">${row.customer_name}</td>
                  <td style="width: 18%; color: #64748b; font-weight: 600;">Due Date:</td>
                  <td style="width: 22%; font-weight: 700; color: #0284c7;">${row.due_date || 'Upon Presentation'}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600;">Phone:</td>
                  <td style="color: #334155;">${row.customer_phone || '—'}</td>
                  <td style="color: #64748b; font-weight: 600;">TIN:</td>
                  <td style="color: #334155;">${row.customer_tin || '—'}</td>
                </tr>
                ${row.customer_email ? `
                <tr>
                  <td style="color: #64748b; font-weight: 600;">Email:</td>
                  <td colspan="3" style="color: #334155;">${row.customer_email}</td>
                </tr>` : ''}
              </table>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 8%; text-align: center;">#</th>
                  <th style="width: 50%;">Description</th>
                  <th style="width: 12%; text-align: center;">Qty</th>
                  <th style="width: 15%; text-align: right;">U.P (RWF)</th>
                  <th style="width: 15%; text-align: right;">Amount (RWF)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <table class="totals-table">
              <tr>
                <td style="color: #64748b;">Subtotal:</td>
                <td style="text-align: right; font-weight: 700;">${Number(row.subtotal).toLocaleString()} RWF</td>
              </tr>
              ${row.tax_due > 0 ? `
              <tr>
                <td style="color: #64748b;">Tax / VAT:</td>
                <td style="text-align: right; color: #64748b;">${Number(row.tax_due).toLocaleString()} RWF</td>
              </tr>` : ''}
              ${row.other_fees > 0 ? `
              <tr>
                <td style="color: #64748b;">Other:</td>
                <td style="text-align: right; color: #64748b;">${Number(row.other_fees).toLocaleString()} RWF</td>
              </tr>` : ''}
              <tr class="total-row">
                <td style="padding: 10px; font-weight: 800;">TOTAL AMOUNT:</td>
                <td style="padding: 10px; text-align: right; font-weight: 800;">${Number(row.total_amount).toLocaleString()} RWF</td>
              </tr>
            </table>

            <div class="payment-box">
              <strong style="color: #0f172a; font-size: 13px;">TERMS OF PAYMENT AND BANK DETAILS:</strong><br>
              1. Please include invoice number (<strong>${row.invoice_number}</strong>) on your check / bank transfer.<br>
              2. Please share proof of payment to confirm reservation or service delivery.<br>
              3. Bank Account: <strong>Bank of Kigali (BK) 00040-06933483-59</strong><br>
              4. <strong>MTN MOMO PAY CODE: 035884</strong> / Legacy Clinics<br>
              <br>
              <span style="color: #64748b;">Please make all checks payable to <strong>Legacy Clinics &amp; Diagnostics Ltd</strong></span>
            </div>

            <div class="attachment-box">
              📎 <strong>Official PDF Attached:</strong> An official, stamped PDF copy (<strong>${safeNum}.pdf</strong>) is attached to this email for your accounting records.
            </div>

            <div style="margin-top: 22px; font-size: 12px; color: #475569; line-height: 1.5;">
              Prepared by: <strong>${row.prepared_by_name || 'Sales Team'}</strong> ${row.prepared_by_title ? `(${row.prepared_by_title})` : ''}<br>
              <strong>For Legacy Clinics Management</strong>
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0 0 6px;">${row.contact_person || 'If you have any questions, please contact our Sales team: sales@legacyclinics.rw | Tel: +250 788 122 100'}</p>
            <strong style="color: #0284c7; font-size: 13px;">Thank You For Your Business!</strong>
            <div style="margin-top: 8px; font-size: 11px; color: #94a3b8;">
              Legacy Clinics &amp; Diagnostics Ltd • Health for Life • Kigali, Rwanda
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // ── Generate PDF using Puppeteer ────────────────────────────────────────
    let pdfBuffer = null;
    try {
      const puppeteerModule = (await import('puppeteer-core')).default;

      // Build a high-fidelity printable proforma PDF
      const pdfHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm 10mm 12mm;
            }
            * { box-sizing: border-box; }
            html, body {
              margin: 0;
              padding: 0;
              height: 100%;
              background-color: #ffffff;
              color: #111827;
              font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
              font-size: 10.5px;
              line-height: 1.35;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page-container {
              display: flex;
              flex-direction: column;
              min-height: 277mm;
              padding: 0;
              justify-content: space-between;
            }
            .header-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 16px;
              padding-bottom: 12px;
              border-bottom: 2px solid #0284c7;
            }
            .brand-left {
              display: flex;
              flex-direction: column;
              gap: 3px;
            }
            .brand-logo {
              height: 48px;
              width: auto;
              max-width: 220px;
              object-fit: contain;
              display: block;
              margin-bottom: 4px;
            }
            .brand-address {
              font-size: 8.5pt;
              color: #374151;
              line-height: 1.4;
              font-weight: 500;
            }
            .meta-right {
              width: 220px;
              text-align: right;
            }
            .doc-title {
              font-size: 26pt;
              font-weight: 800;
              color: #0284c7;
              letter-spacing: 2px;
              margin: 0 0 8px 0;
              text-transform: uppercase;
              font-family: serif;
            }
            .meta-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9pt;
              border: 1px solid #64748b;
              text-align: left;
            }
            .meta-table td {
              border: 1px solid #64748b;
              padding: 3.5px 7px;
            }
            .meta-label {
              font-weight: 700;
              width: 45%;
              background-color: #f8fafc;
            }
            .meta-val {
              text-align: center;
              font-weight: 600;
            }
            .recipient-bar {
              margin-bottom: 14px;
            }
            .recipient-badge {
              background-color: #2563eb;
              color: #ffffff;
              font-weight: 800;
              font-size: 9pt;
              letter-spacing: 1px;
              padding: 3.5px 10px;
              display: inline-block;
              width: 240px;
              text-transform: uppercase;
            }
            .recipient-name {
              padding: 5px 2px 2px 2px;
              font-size: 11pt;
              font-weight: 800;
              color: #111827;
              letter-spacing: 0.4px;
            }
            .recipient-details {
              font-size: 8.5pt;
              color: #374151;
              line-height: 1.45;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 12px 0;
              border: 1px solid #64748b;
            }
            .items-table th {
              background-color: #2563eb;
              color: #ffffff;
              padding: 5px 8px;
              font-size: 8.5pt;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border: 1px solid #1e3a8a;
            }
            .items-table td {
              border: 1px solid #64748b;
              padding: 4px 8px;
              font-size: 8.5pt;
              color: #111827;
            }
            .items-table tr:nth-child(even) td {
              background-color: #f8fafc;
            }
            .summary-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-top: 10px;
              gap: 20px;
            }
            .terms-box {
              flex: 1;
              border: 1px solid #64748b;
              padding: 8px 12px;
              font-size: 8pt;
              line-height: 1.5;
              background-color: #ffffff;
            }
            .terms-box strong {
              color: #0f172a;
            }
            .totals-table {
              width: 250px;
              border-collapse: collapse;
              font-size: 8.5pt;
            }
            .totals-table td {
              padding: 3px 8px;
            }
            .total-grand td {
              padding: 6px 10px;
              font-weight: 800;
              font-size: 10pt;
              background-color: #e0f2fe;
              color: #0369a1;
              border: 1px solid #bae6fd;
            }
            .signoff-section {
              margin-top: 12px;
              display: flex;
              justify-content: space-between;
              font-size: 8.5pt;
              color: #1f2937;
            }
            .footer-note {
              text-align: center;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
              margin-top: 12px;
              font-size: 8pt;
              color: #4b5563;
              line-height: 1.4;
            }
            .footer-note strong {
              color: #0284c7;
              font-size: 8.5pt;
            }
            .footer-banner {
              width: 100%;
              height: auto;
              display: block;
              margin-top: 10px;
              border-radius: 2px;
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div>
              <!-- Header with Official Logo -->
              <div class="header-section">
                <div class="brand-left">
                  <img src="${logoBase64}" class="brand-logo" alt="Legacy Clinics Logo" />
                  <div class="brand-address">
                    <div>KG 3 RD 134, Nyarugunga Sector</div>
                    <div>PO Box 1589 Kigali - Rwanda</div>
                    <div>Phone: +250 788 122 100</div>
                    <div>info@legacyclinics.rw | www.legacyclinic.rw</div>
                    <div style="font-weight: 700; margin-top: 2px; color: #111827;">TIN: 103672011</div>
                  </div>
                </div>

                <div class="meta-right">
                  <h1 class="doc-title">PROFORMA</h1>
                  <table class="meta-table">
                    <tbody>
                      <tr>
                        <td class="meta-label">DATE</td>
                        <td class="meta-val">${row.invoice_date || '—'}</td>
                      </tr>
                      <tr>
                        <td class="meta-label">INVOICE #</td>
                        <td class="meta-val" style="font-weight: 700; color: #0369a1;">${row.invoice_number || '—'}</td>
                      </tr>
                      <tr>
                        <td class="meta-label">CUSTOMER ID</td>
                        <td class="meta-val">${row.customer_id || '—'}</td>
                      </tr>
                      <tr>
                        <td class="meta-label">DUE DATE</td>
                        <td class="meta-val" style="background-color: #e0f2fe; color: #0369a1; font-weight: 700;">${row.due_date || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Recipient -->
              <div class="recipient-bar">
                <div class="recipient-badge">PROFORMA INVOICE TO</div>
                <div class="recipient-name">${row.customer_name || 'Customer'}</div>
                <div class="recipient-details">
                  ${row.customer_phone ? `<div>Phone: ${row.customer_phone}</div>` : ''}
                  ${row.customer_email ? `<div>Email: ${row.customer_email}</div>` : ''}
                  ${row.customer_tin ? `<div>TIN: ${row.customer_tin}</div>` : ''}
                  ${row.customer_address ? `<div>Address: ${row.customer_address}</div>` : ''}
                </div>
              </div>

              <!-- Items Table -->
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 8%; text-align: center;">Item #</th>
                    <th style="width: 52%; text-align: left;">Description</th>
                    <th style="width: 10%; text-align: center;">Qty</th>
                    <th style="width: 15%; text-align: right;">Unit Price (RWF)</th>
                    <th style="width: 15%; text-align: right;">Total (RWF)</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((it, idx) => `
                    <tr>
                      <td style="text-align: center; color: #64748b;">${idx + 1}</td>
                      <td style="font-weight: 600;">${it.description || ''}</td>
                      <td style="text-align: center;">${it.quantity}</td>
                      <td style="text-align: right;">${Number(it.unit_price).toLocaleString()}</td>
                      <td style="text-align: right; font-weight: 700;">${Number(it.amount).toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <!-- Summary & Terms -->
              <div class="summary-section">
                <div class="terms-box">
                  <strong>TERMS OF PAYMENT AND BANK DETAILS:</strong><br>
                  1. Please include invoice number (<strong>${row.invoice_number}</strong>) on your check / transfer.<br>
                  2. Please share proof of payment to confirm reservation/service.<br>
                  3. Bank Account: <strong>BK 00040-06933483-59</strong><br>
                  4. <strong>MTN MOMO PAY CODE: 035884</strong> / Legacy Clinics
                </div>

                <div>
                  <table class="totals-table">
                    <tbody>
                      <tr>
                        <td style="color: #64748b;">Subtotal</td>
                        <td style="text-align: right; font-weight: 700;">${Number(row.subtotal).toLocaleString()} RWF</td>
                      </tr>
                      ${row.tax_due > 0 ? `
                      <tr>
                        <td style="color: #64748b;">Tax / VAT</td>
                        <td style="text-align: right; color: #64748b;">${Number(row.tax_due).toLocaleString()} RWF</td>
                      </tr>` : ''}
                      ${row.other_fees > 0 ? `
                      <tr>
                        <td style="color: #64748b;">Other</td>
                        <td style="text-align: right; color: #64748b;">${Number(row.other_fees).toLocaleString()} RWF</td>
                      </tr>` : ''}
                      <tr class="total-grand">
                        <td>TOTAL</td>
                        <td style="text-align: right;">${Number(row.total_amount).toLocaleString()} RWF</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style="font-size: 7.5pt; color: #1f2937; text-align: right; margin-top: 8px;">
                    Please make all checks payable to<br>
                    <strong style="color: #003b44;">Legacy Clinics &amp; Diagnostics Ltd</strong>
                  </div>
                </div>
              </div>

              <!-- Signoff -->
              <div class="signoff-section">
                <div>
                  Prepared by: <strong>${row.prepared_by_name || 'Sales Manager'}</strong> ${row.prepared_by_title ? `(${row.prepared_by_title})` : ''}<br>
                  <strong>For Legacy Clinics Management</strong>
                </div>
              </div>

              <div class="footer-note">
                <div>${row.contact_person || 'If you have any questions about this proforma, please contact Sofia, 0787363970, E-mail: sofia@legacyclinics.rw'}</div>
                <strong>Thank You For Your Business!</strong>
              </div>
            </div>

            <!-- Official Brand Vector Footer Banner -->
            <div style="margin-top: auto; padding-top: 6px;">
              <img src="${footerBannerBase64}" class="footer-banner" alt="Legacy Clinics - Health for Life" />
            </div>
          </div>
        </body>
        </html>
      `;

      const browser = await puppeteerModule.launch({
        executablePath: process.env.CHROME_EXECUTABLE_PATH || '/usr/bin/google-chrome',
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();
      await page.setContent(pdfHtml, { waitUntil: 'networkidle0' });
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      await browser.close();
      console.log(`📄 PDF generated for proforma ${row.invoice_number} (${pdfBuffer.length} bytes)`);
    } catch (pdfErr) {
      console.error(`⚠️ PDF generation failed for ${row.invoice_number}: ${pdfErr.message}. Sending email without PDF attachment.`);
    }

    // ── Build attachments array ─────────────────────────────────────────────
    const attachments = [];
    if (pdfBuffer) {
      const safeNum = (row.invoice_number || 'proforma').replace(/[\/\\:*?"<>|]/g, '-');
      attachments.push({
        filename: `${safeNum}.pdf`,
        content:  pdfBuffer,
        contentType: 'application/pdf',
      });
    }

    // ── Send email from sales@legacyclinics.rw ─────────────────────────────
    const emailRes = await sendEmailFrom(
      'Legacy Clinics Sales',
      'sales@legacyclinics.rw',
      {
        to: toEmail,
        subject: emailSubject,
        html: htmlContent,
        attachments,
      }
    );

    if (emailRes.success) {
      if (row.status === 'Draft' || row.status === 'Issued') {
        await db.query(`UPDATE proforma_invoices SET status = 'Sent' WHERE id = $1`, [id]);
      }
      try {
        await logAction(req, 'EMAIL_PROFORMA', 'proforma_invoices', id, {
          invoice_number: row.invoice_number,
          to: toEmail,
          pdf_attached: !!pdfBuffer,
        });
      } catch (e) {}

      return res.json({
        success: true,
        message: `Proforma invoice ${row.invoice_number} sent to ${toEmail}${pdfBuffer ? ' with PDF attachment' : ''}`,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: `Failed to deliver email: ${emailRes.error || 'SMTP delivery issue'}`,
      });
    }
  } catch (err) {
    console.error('Error in sendProformaEmail:', err);
    return res.status(500).json({ success: false, message: 'Failed to send email', error: err.message });
  }
}

/**
 * GET /api/sales/catalog
 */
async function getCatalog(req, res) {
  try {
    const { department, search, limit, offset } = req.query;
    let sql = `SELECT * FROM sales_service_catalog WHERE is_active = 1`;
    const params = [];

    if (department && department !== 'All') {
      sql += ` AND department = ?`;
      params.push(department);
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      sql += ` AND (LOWER(name) LIKE ? OR LOWER(code) LIKE ? OR LOWER(COALESCE(ichi_code, '')) LIKE ?)`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY department ASC, name ASC`;

    if (limit) {
      sql += ` LIMIT ?`;
      params.push(Number(limit));
      if (offset) {
        sql += ` OFFSET ?`;
        params.push(Number(offset));
      }
    }

    const rows = await q(sql, params);
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error('Error in getCatalog:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch catalog', error: err.message });
  }
}

/**
 * POST /api/sales/catalog
 */
async function addCatalogItem(req, res) {
  try {
    const { code, name, department = 'General', default_price } = req.body;
    if (!name || default_price === undefined) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }

    const itemCode = code || `SRV-${Date.now().toString().slice(-5)}`;
    const row = await db.query(
      `INSERT INTO sales_service_catalog (code, name, department, default_price, is_active)
       VALUES ($1, $2, $3, $4, 1) RETURNING *`,
      [itemCode, name.trim(), department.trim(), parseFloat(default_price) || 0]
    );

    return res.status(201).json({ success: true, data: row.rows?.[0] });
  } catch (err) {
    console.error('Error in addCatalogItem:', err);
    return res.status(500).json({ success: false, message: 'Failed to add service', error: err.message });
  }
}

/**
 * DELETE /api/sales/catalog/:id
 */
async function deleteCatalogItem(req, res) {
  try {
    const { id } = req.params;
    await db.query(`UPDATE sales_service_catalog SET is_active = 0 WHERE id = $1`, [id]);
    return res.json({ success: true, message: 'Item deactivated' });
  } catch (err) {
    console.error('Error in deleteCatalogItem:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete item', error: err.message });
  }
}

module.exports = {
  getProformas,
  getSalesStats,
  getProformaById,
  createProforma,
  updateProforma,
  deleteProforma,
  sendProformaEmail,
  getCatalog,
  addCatalogItem,
  deleteCatalogItem
};
