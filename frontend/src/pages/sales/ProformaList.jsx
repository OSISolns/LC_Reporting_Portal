import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Plus, Printer, Mail, Edit3, Trash2, Eye, Download,
  CheckCircle2, Clock, XCircle, FileSpreadsheet, RefreshCw, Copy, Send
} from 'lucide-react';
import { getProformas, deleteProforma, updateProforma, sendProformaEmail } from '../../api/sales';
import ProformaInvoicePrintView from './ProformaInvoicePrintView';
import toast from 'react-hot-toast';

export default function ProformaList({
  onCreateNew = () => {},
  onEditProforma = () => {}
}) {
  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedForPreview, setSelectedForPreview] = useState(null);
  const [selectedForEmail, setSelectedForEmail] = useState(null);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailNote, setEmailNote] = useState('');
  const [emailing, setEmailing] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await getProformas({
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      setProformas(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load proforma invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchList();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleDelete = async (p) => {
    if (!window.confirm(`Are you sure you want to delete proforma ${p.invoice_number} for ${p.customer_name}?`)) {
      return;
    }
    try {
      await deleteProforma(p.id);
      toast.success(`Proforma ${p.invoice_number} deleted`);
      fetchList();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete proforma');
    }
  };

  const handleStatusChange = async (p, newStatus) => {
    try {
      await updateProforma(p.id, { status: newStatus });
      toast.success(`Proforma ${p.invoice_number} status updated to ${newStatus}`);
      fetchList();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  const handleSendEmailSubmit = async (e) => {
    e.preventDefault();
    if (!selectedForEmail || !emailRecipient) return;

    setEmailing(true);
    try {
      const res = await sendProformaEmail(selectedForEmail.id, {
        recipient_email: emailRecipient,
        custom_message: emailNote
      });
      toast.success(res.data.message || 'Email sent successfully!');
      setSelectedForEmail(null);
      fetchList();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to send email');
    } finally {
      setEmailing(false);
    }
  };

  const handleExportCSV = () => {
    if (proformas.length === 0) {
      toast.error('No proformas to export');
      return;
    }
    const headers = ['Invoice #', 'Date', 'Customer Name', 'Phone', 'Email', 'Items Count', 'Subtotal', 'Tax', 'Total Amount', 'Status'];
    const rows = proformas.map(p => [
      p.invoice_number,
      p.invoice_date,
      `"${p.customer_name || ''}"`,
      p.customer_phone || '',
      p.customer_email || '',
      p.items?.length || 0,
      p.subtotal || 0,
      p.tax_due || 0,
      p.total_amount || 0,
      p.status || 'Draft'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Legacy_Clinics_Proformas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusStyles = {
    Paid: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
    Sent: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
    Draft: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
    Cancelled: { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Toolbar: Search, Filters, Export, New ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        backgroundColor: '#ffffff',
        padding: '16px 20px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        {/* Left: Search input */}
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by invoice #, customer, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Center: Status Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {['all', 'Draft', 'Sent', 'Paid', 'Cancelled'].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: statusFilter === st ? '#0284c7' : '#ffffff',
                borderColor: statusFilter === st ? '#0284c7' : '#cbd5e1',
                color: statusFilter === st ? '#ffffff' : '#64748b'
              }}
            >
              {st === 'all' ? 'All Proformas' : st}
            </button>
          ))}
        </div>

        {/* Right: Export & New Proforma */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchList}
            title="Refresh list"
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <Download size={14} /> Export CSV
          </button>

          <button
            type="button"
            onClick={onCreateNew}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '8px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(22,163,74,0.25)'
            }}
          >
            <Plus size={16} /> Create Proforma
          </button>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: '8px', color: '#0284c7' }} />
            <div>Loading proforma invoices...</div>
          </div>
        ) : proformas.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <FileSpreadsheet size={40} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 6px', color: '#0f172a' }}>No Proforma Invoices Found</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.85rem' }}>
              {search ? 'No proformas matching your search criteria.' : 'Create your first official Legacy Clinics proforma invoice now.'}
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              style={{
                padding: '8px 20px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              + Create Proforma Invoice
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>INVOICE #</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>DATE</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>CUSTOMER / RECIPIENT</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>ITEMS</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>TOTAL (RWF)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {proformas.map((p) => {
                  const badge = statusStyles[p.status] || statusStyles.Draft;
                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {/* Invoice # */}
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0369a1' }}>
                        {p.invoice_number}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.8rem' }}>
                        {p.invoice_date}
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.customer_name}</div>
                        {(p.customer_phone || p.customer_email) && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            {p.customer_phone && <span style={{ marginRight: '8px' }}>📞 {p.customer_phone}</span>}
                            {p.customer_email && <span>✉️ {p.customer_email}</span>}
                          </div>
                        )}
                      </td>

                      {/* Items */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: '#f1f5f9',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#475569'
                        }}>
                          {p.items?.length || 0} tests
                        </span>
                      </td>

                      {/* Total */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                        {Number(p.total_amount).toLocaleString()} RWF
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <select
                          value={p.status}
                          onChange={(e) => handleStatusChange(p, e.target.value)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            border: `1px solid ${badge.border}`,
                            backgroundColor: badge.bg,
                            color: badge.text,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="Draft">Draft</option>
                          <option value="Sent">Sent</option>
                          <option value="Paid">Paid</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedForPreview(p)}
                            title="Preview / Print Sheet"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#0284c7',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '6px'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(2,132,199,0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedForEmail(p);
                              setEmailRecipient(p.customer_email || '');
                            }}
                            title="Email to Client"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2563eb',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '6px'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <Mail size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditProforma(p)}
                            title="Edit Proforma"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#0d9488',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '6px'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(13,148,136,0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <Edit3 size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            title="Delete Proforma"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '6px'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Preview & Print ── */}
      {selectedForPreview && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Proforma #{selectedForPreview.invoice_number}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {selectedForPreview.customer_name} • {Number(selectedForPreview.total_amount).toLocaleString()} RWF
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#003b44',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={15} /> Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedForPreview(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.4rem',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '0 4px'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body: Printable sheet */}
            <div style={{ overflowY: 'auto', padding: '24px', backgroundColor: '#f1f5f9' }}>
              <div style={{
                maxWidth: '820px',
                margin: '0 auto',
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                borderRadius: '4px'
              }}>
                <ProformaInvoicePrintView proforma={selectedForPreview} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Email Client ── */}
      {selectedForEmail && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={20} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Email Proforma Invoice
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForEmail(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSendEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '10px 14px', backgroundColor: '#eff6ff', borderRadius: '8px', fontSize: '0.8rem', color: '#1e3a8a' }}>
                Sending <strong>{selectedForEmail.invoice_number}</strong> for <strong>{selectedForEmail.customer_name}</strong> ({Number(selectedForEmail.total_amount).toLocaleString()} RWF) via <strong>mail.legacyclinics.rw</strong>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Recipient Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="client@example.com"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Custom Note / Cover Message
                </label>
                <textarea
                  rows="3"
                  placeholder="Dear client, please find attached your proforma invoice quotation..."
                  value={emailNote}
                  onChange={(e) => setEmailNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedForEmail(null)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailing}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    cursor: emailing ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Send size={15} /> {emailing ? 'Sending...' : 'Send Email Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
