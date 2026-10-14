import React from 'react';

/**
 * Pixel-perfect printable Proforma Invoice component matching the official
 * Legacy Clinics & Diagnostics Ltd layout.
 */
export default function ProformaInvoicePrintView({ proforma }) {
  if (!proforma) return null;

  const items = Array.isArray(proforma.items) ? proforma.items : [];
  const fmt = (val) => {
    if (val === undefined || val === null || val === '') return '—';
    const num = Number(val);
    return isNaN(num) ? val : num.toLocaleString();
  };

  return (
    <div className="proforma-print-container" style={{
      width: '100%',
      maxWidth: '820px',
      margin: '0 auto',
      backgroundColor: '#ffffff',
      color: '#111827',
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
      padding: '24px 32px',
      boxSizing: 'border-box'
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        {/* Left: Logo & Company details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <img 
              src="/logo.png" 
              alt="Legacy Clinics" 
              style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none';
              }} 
            />
          </div>
          <div style={{ fontSize: '11px', color: '#374151', lineHeight: '1.45', fontWeight: 500 }}>
            <div>KG 3 RD 134, Nyarugunga Sector</div>
            <div>PO Box 1589 Kigali - Rwanda</div>
            <div>Phone: +250 788 122 100</div>
            <div>
              <a href="mailto:info@legacyclinics.rw" style={{ color: '#0369a1', textDecoration: 'underline' }}>info@legacyclinics.rw</a>
            </div>
            <div>
              <a href="https://www.legacyclinic.rw" target="_blank" rel="noreferrer" style={{ color: '#0369a1', textDecoration: 'underline' }}>www.legacyclinic.rw</a>
            </div>
            <div style={{ fontWeight: 700, marginTop: '2px', color: '#111827' }}>TIN: 103672011</div>
          </div>
        </div>

        {/* Right: PROFORMA title & Meta Table */}
        <div style={{ width: '230px', textAlign: 'right' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#38bdf8',
            letterSpacing: '2px',
            margin: '0 0 10px 0',
            textTransform: 'uppercase',
            fontFamily: 'serif'
          }}>
            PROFORMA
          </h1>

          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11px',
            textAlign: 'left',
            border: '1px solid #64748b'
          }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #64748b', padding: '4px 8px', fontWeight: 700, width: '45%', backgroundColor: '#f8fafc' }}>DATE</td>
                <td style={{ border: '1px solid #64748b', padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>{proforma.invoice_date || '—'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #64748b', padding: '4px 8px', fontWeight: 700, backgroundColor: '#f8fafc' }}>INVOICE #</td>
                <td style={{ border: '1px solid #64748b', padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: '#0369a1' }}>{proforma.invoice_number || '—'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #64748b', padding: '4px 8px', fontWeight: 700, backgroundColor: '#f8fafc' }}>CUSTOMER ID</td>
                <td style={{ border: '1px solid #64748b', padding: '4px 8px', textAlign: 'center' }}>{proforma.customer_id || ''}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #64748b', padding: '4px 8px', fontWeight: 700, backgroundColor: '#f8fafc' }}>DUE DATE</td>
                <td style={{ border: '1px solid #64748b', padding: '4px 8px', textAlign: 'center', backgroundColor: '#e0f2fe', fontWeight: 700, color: '#0369a1' }}>{proforma.due_date || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recipient Section ── */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          backgroundColor: '#2563eb',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '11px',
          letterSpacing: '1px',
          padding: '4px 10px',
          display: 'inline-block',
          width: '280px',
          textTransform: 'uppercase'
        }}>
          PROFORMA INVOICE TO
        </div>
        <div style={{
          padding: '6px 2px 2px 2px',
          fontSize: '14px',
          fontWeight: 800,
          color: '#111827',
          letterSpacing: '0.5px'
        }}>
          {proforma.customer_name?.toUpperCase() || 'VALUED CUSTOMER'}
        </div>
        {(proforma.customer_phone || proforma.customer_email || proforma.customer_tin) && (
          <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>
            {proforma.customer_phone && <span style={{ marginRight: '14px' }}><strong>Tel:</strong> {proforma.customer_phone}</span>}
            {proforma.customer_email && <span style={{ marginRight: '14px' }}><strong>Email:</strong> {proforma.customer_email}</span>}
            {proforma.customer_tin && <span><strong>TIN:</strong> {proforma.customer_tin}</span>}
          </div>
        )}
      </div>

      {/* ── Line Items Table ── */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '11px',
        marginBottom: '16px',
        border: '1.5px solid #1e3a8a'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#2563eb', color: '#ffffff' }}>
            <th style={{ border: '1px solid #1e3a8a', padding: '6px 10px', textAlign: 'left', fontWeight: 800, width: '54%', letterSpacing: '0.5px' }}>
              DESCRIPTION
            </th>
            <th style={{ border: '1px solid #1e3a8a', padding: '6px 10px', textAlign: 'center', fontWeight: 800, width: '12%', letterSpacing: '0.5px' }}>
              Quantity
            </th>
            <th style={{ border: '1px solid #1e3a8a', padding: '6px 10px', textAlign: 'right', fontWeight: 800, width: '16%', letterSpacing: '0.5px' }}>
              U.P
            </th>
            <th style={{ border: '1px solid #1e3a8a', padding: '6px 10px', textAlign: 'right', fontWeight: 800, width: '18%', letterSpacing: '0.5px' }}>
              AMOUNT
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                No line items added yet.
              </td>
            </tr>
          ) : (
            items.map((item, index) => {
              const isEven = index % 2 === 0;
              return (
                <tr key={index} style={{ backgroundColor: isEven ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ border: '1px solid #64748b', padding: '4.5px 10px', fontWeight: 500, color: '#111827' }}>
                    {item.description || '—'}
                  </td>
                  <td style={{ border: '1px solid #64748b', padding: '4.5px 10px', textAlign: 'center', fontWeight: 600 }}>
                    {item.quantity || 1}
                  </td>
                  <td style={{ border: '1px solid #64748b', padding: '4.5px 10px', textAlign: 'right', fontWeight: 500 }}>
                    {fmt(item.unit_price)}
                  </td>
                  <td style={{ border: '1px solid #64748b', padding: '4.5px 10px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                    {fmt(item.amount)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* ── Bottom Section: Terms/Bank (Left) & Totals (Right) ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
        {/* Left: Payment Terms Box */}
        <div style={{ flex: '1', maxWidth: '440px' }}>
          <div style={{
            border: '1.5px solid #475569',
            padding: '10px 14px',
            fontSize: '10.5px',
            lineHeight: '1.6',
            color: '#111827'
          }}>
            <div style={{ fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.3px', color: '#0f172a' }}>
              TERMS OF PAYMENT AND BANK DETAILS
            </div>
            <div>1. Please include the invoice number on your check</div>
            <div>2. Please share the proof of payment before</div>
            <div>3. Bank account: <strong>BK 00040-06933483-59</strong></div>
            <div style={{ fontWeight: 700, color: '#0369a1' }}>
              4. MOMO PAY CODE 035884/Legacy Clinics
            </div>
          </div>

          {/* Prepared by signatures */}
          <div style={{ marginTop: '20px', fontSize: '11px', color: '#1f2937', lineHeight: '1.6' }}>
            <div>
              Prepared by: <strong>{proforma.prepared_by_name || 'Sales Manager'}</strong> {proforma.prepared_by_title ? `(${proforma.prepared_by_title})` : ''}
            </div>
            <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
              For Legacy Clinics Management
            </div>
          </div>
        </div>

        {/* Right: Totals summary */}
        <div style={{ width: '270px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 8px', color: '#374151', fontWeight: 500 }}>Subtotal</td>
                <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                  {fmt(proforma.subtotal)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 8px', color: '#6b7280' }}>Taxable</td>
                <td style={{ padding: '3px 8px', textAlign: 'right', color: '#6b7280' }}>
                  {proforma.taxable_amount ? fmt(proforma.taxable_amount) : ''}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 8px', color: '#6b7280', borderBottom: '1px solid #cbd5e1' }}>Tax due</td>
                <td style={{ padding: '3px 8px', textAlign: 'right', borderBottom: '1px solid #cbd5e1', color: '#6b7280' }}>
                  {proforma.tax_due > 0 ? fmt(proforma.tax_due) : '-'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 8px', color: '#6b7280', borderBottom: '1.5px solid #000000' }}>Other</td>
                <td style={{ padding: '3px 8px', textAlign: 'right', borderBottom: '1.5px solid #000000', color: '#6b7280' }}>
                  {proforma.other_fees > 0 ? fmt(proforma.other_fees) : '-'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 8px', fontWeight: 800, fontSize: '12px', color: '#0f172a' }}>
                  TOTAL
                </td>
                <td style={{
                  padding: '8px 12px',
                  textAlign: 'right',
                  fontWeight: 800,
                  fontSize: '13px',
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  border: '1px solid #bae6fd'
                }}>
                  {fmt(proforma.total_amount)}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{
            fontSize: '10px',
            color: '#1f2937',
            fontWeight: 600,
            textAlign: 'right',
            marginTop: '10px',
            lineHeight: '1.4'
          }}>
            <div>Please make all checks payable to</div>
            <strong style={{ color: '#003b44' }}>Legacy Clinics &amp; Diagnostics Ltd</strong>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        textAlign: 'center',
        borderTop: '1px solid #e2e8f0',
        paddingTop: '14px',
        marginTop: '16px',
        fontSize: '10px',
        color: '#4b5563',
        lineHeight: '1.5'
      }}>
        <div>{proforma.contact_person || 'If you have any questions about this proforma, please contact Sofia, 0787363970, E-mail: sofia@legacyclinics.rw'}</div>
        <div style={{ fontWeight: 800, color: '#0284c7', fontSize: '11px', marginTop: '4px', letterSpacing: '0.5px' }}>
          Thank You For Your Business!
        </div>
      </div>

      {/* ── Official Brand Vector Footer Banner ── */}
      <div style={{ marginTop: '14px' }}>
        <img 
          src="/legacy_header.svg" 
          alt="Legacy Clinics - Health for Life" 
          style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '2px' }} 
        />
      </div>
    </div>
  );
}
