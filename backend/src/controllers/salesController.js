'use strict';

const db = require('../config/db');
const { logAction } = require('../middleware/audit');
const { sendEmail } = require('../services/emailService');

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
 * Email proforma directly to customer
 */
async function sendProformaEmail(req, res) {
  try {
    const { id } = req.params;
    const { recipient_email, custom_message = '' } = req.body;

    const row = await q1(`SELECT * FROM proforma_invoices WHERE id = ?`, [id]);
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

    const rowsHtml = items.map((it, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 13px; color: #1e293b;">${it.description}</td>
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 13px; text-align: center; color: #1e293b;">${it.quantity}</td>
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 13px; text-align: right; color: #1e293b;">${Number(it.unit_price).toLocaleString()}</td>
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 13px; text-align: right; font-weight: 600; color: #1e293b;">${Number(it.amount).toLocaleString()}</td>
      </tr>
    `).join('');

    const emailSubject = `Legacy Clinics — Proforma Invoice ${row.invoice_number} for ${row.customer_name}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          .header { padding: 24px 30px; border-bottom: 2px solid #0284c7; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { color: #0284c7; font-size: 26px; font-weight: 800; letter-spacing: 1px; margin: 0; }
          .clinic-info { font-size: 12px; color: #64748b; line-height: 1.5; }
          .content { padding: 24px 30px; }
          .recip-box { background-color: #0284c7; color: #ffffff; padding: 6px 14px; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; border-radius: 4px; margin-bottom: 8px; }
          .client-name { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th { background-color: #0284c7; color: #ffffff; padding: 8px 12px; font-size: 12px; text-align: left; border: 1px solid #0284c7; }
          .totals-table { width: 300px; margin-left: auto; margin-top: 10px; }
          .total-row { background-color: #e0f2fe; color: #0369a1; font-size: 15px; font-weight: 800; }
          .payment-box { margin-top: 24px; padding: 14px 18px; border: 1px solid #94a3b8; border-radius: 6px; background-color: #f8fafc; font-size: 12px; line-height: 1.6; }
          .footer { padding: 18px 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div style="background-color: #003b44; padding: 20px 30px; color: #ffffff;">
            <table style="width: 100%; border: none; margin: 0;">
              <tr>
                <td style="border: none; padding: 0;">
                  <h2 style="margin: 0; color: #ffffff; font-size: 20px;">🏥 LEGACY CLINICS &amp; DIAGNOSTICS</h2>
                  <p style="margin: 4px 0 0; font-size: 12px; color: #cbd5e1;">KG 3 RD 134, Nyarugunga Sector, Kigali - Rwanda | Phone: +250 788 122 100</p>
                  <p style="margin: 2px 0 0; font-size: 11px; color: #94a3b8;">TIN: 103672011 | info@legacyclinics.rw | www.legacyclinic.rw</p>
                </td>
                <td style="border: none; padding: 0; text-align: right; vertical-align: top;">
                  <span style="font-size: 22px; font-weight: 800; color: #38bdf8; letter-spacing: 1.5px;">PROFORMA</span>
                  <div style="font-size: 12px; color: #ffffff; margin-top: 4px;"><strong>INV #:</strong> ${row.invoice_number}</div>
                  <div style="font-size: 12px; color: #cbd5e1;"><strong>DATE:</strong> ${row.invoice_date}</div>
                </td>
              </tr>
            </table>
          </div>

          <div class="content">
            ${custom_message ? `<div style="padding: 12px; background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px; margin-bottom: 18px; font-size: 13px; color: #166534;">${custom_message}</div>` : ''}

            <div class="recip-box">PROFORMA INVOICE TO</div>
            <div class="client-name">${row.customer_name} ${row.customer_phone ? `• ${row.customer_phone}` : ''}</div>

            <table>
              <thead>
                <tr>
                  <th style="width: 50%;">DESCRIPTION</th>
                  <th style="width: 15%; text-align: center;">QUANTITY</th>
                  <th style="width: 17%; text-align: right;">U.P (RWF)</th>
                  <th style="width: 18%; text-align: right;">AMOUNT (RWF)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <table class="totals-table">
              <tr>
                <td style="padding: 6px 10px; font-size: 13px; color: #64748b;">Subtotal:</td>
                <td style="padding: 6px 10px; font-size: 13px; text-align: right; font-weight: 700;">${Number(row.subtotal).toLocaleString()} RWF</td>
              </tr>
              ${row.tax_due > 0 ? `
              <tr>
                <td style="padding: 6px 10px; font-size: 13px; color: #64748b;">Tax / VAT:</td>
                <td style="padding: 6px 10px; font-size: 13px; text-align: right;">${Number(row.tax_due).toLocaleString()} RWF</td>
              </tr>` : ''}
              ${row.other_fees > 0 ? `
              <tr>
                <td style="padding: 6px 10px; font-size: 13px; color: #64748b;">Other:</td>
                <td style="padding: 6px 10px; font-size: 13px; text-align: right;">${Number(row.other_fees).toLocaleString()} RWF</td>
              </tr>` : ''}
              <tr class="total-row">
                <td style="padding: 10px; font-weight: 800; border-top: 2px solid #0284c7;">TOTAL:</td>
                <td style="padding: 10px; text-align: right; font-weight: 800; border-top: 2px solid #0284c7;">${Number(row.total_amount).toLocaleString()} RWF</td>
              </tr>
            </table>

            <div class="payment-box">
              <strong style="color: #0f172a;">TERMS OF PAYMENT AND BANK DETAILS:</strong><br>
              1. Please include the invoice number (<strong>${row.invoice_number}</strong>) on your check / transfer.<br>
              2. Please share proof of payment to confirm reservation/service.<br>
              3. Bank account: <strong>BK 00040-06933483-59</strong><br>
              4. <strong>MOMO PAY CODE: 035884</strong> / Legacy Clinics<br>
              <br>
              <span style="color: #64748b;">Please make all checks payable to <strong>Legacy Clinics &amp; Diagnostics Ltd</strong></span>
            </div>

            <div style="margin-top: 20px; font-size: 12px; color: #475569;">
              <strong>Prepared by:</strong> ${row.prepared_by_name || 'Sales Manager'} (${row.prepared_by_title || 'Sales Manager'})<br>
              <strong>For:</strong> Legacy Clinics Management
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0 0 6px;">${row.contact_person || 'If you have questions, please contact Sofia, 0787363970, E-mail: sofia@legacyclinics.rw'}</p>
            <strong style="color: #0284c7; font-size: 13px;">Thank You For Your Business!</strong>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailRes = await sendEmail({
      to: toEmail,
      subject: emailSubject,
      html: htmlContent
    });

    if (emailRes.success) {
      if (row.status === 'Draft' || row.status === 'Issued') {
        await db.query(`UPDATE proforma_invoices SET status = 'Sent' WHERE id = $1`, [id]);
      }
      try {
        await logAction(req, 'EMAIL_PROFORMA', 'proforma_invoices', id, {
          invoice_number: row.invoice_number,
          to: toEmail
        });
      } catch (e) {}

      return res.json({
        success: true,
        message: `Proforma invoice successfully sent to ${toEmail}`
      });
    } else {
      return res.status(500).json({
        success: false,
        message: `Failed to deliver email: ${emailRes.error || 'SMTP delivery issue'}`
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
    const rows = await q(
      `SELECT * FROM sales_service_catalog WHERE is_active = 1 ORDER BY department ASC, name ASC`
    );
    return res.json({ success: true, data: rows });
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
