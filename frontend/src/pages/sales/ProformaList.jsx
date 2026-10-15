import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Plus, Printer, Mail, Edit3, Trash2, Eye, Download,
  CheckCircle2, Clock, XCircle, FileSpreadsheet, RefreshCw, Copy, Send, X,
  Calendar, RotateCcw
} from 'lucide-react';
import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { getProformas, deleteProforma, updateProforma, sendProformaEmail } from '../../api/sales';
import ProformaInvoicePrintView from './ProformaInvoicePrintView';
import { printProformaDocument } from './printUtils';
import toast from 'react-hot-toast';

export default function ProformaList({
  onCreateNew = () => {},
  onEditProforma = () => {}
}) {
  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeDatePreset, setActiveDatePreset] = useState('all');
  const [exportingXLS, setExportingXLS] = useState(false);

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
        status: statusFilter !== 'all' ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 100
      });
      setProformas(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load proforma invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDatePreset = (preset) => {
    setActiveDatePreset(preset);
    const today = new Date();
    const toYMD = (d) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const todayStr = toYMD(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'this_week') {
      const curr = new Date();
      const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1);
      const monday = new Date(curr.setDate(first));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setStartDate(toYMD(monday));
      setEndDate(toYMD(sunday));
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(lastDay));
    } else if (preset === 'last_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(lastDay));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setActiveDatePreset('all');
    setSearch('');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchList();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter, startDate, endDate]);

  // Handle Escape key to close open modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedForPreview(null);
        setSelectedForEmail(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleExportXLS = async () => {
    setExportingXLS(true);
    const toastId = toast.loading('Generating Proforma Invoices Excel Report...');
    try {
      // Fetch full list without pagination limit matching active filters
      let exportData = proformas;
      try {
        const fullRes = await getProformas({
          search: search.trim() || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          limit: 10000
        });
        if (fullRes.data?.data && Array.isArray(fullRes.data.data)) {
          exportData = fullRes.data.data;
        }
      } catch (e) {
        console.warn('Could not fetch all records for export, using currently loaded records', e);
      }

      if (exportData.length === 0) {
        toast.error('No proformas found for the selected filter criteria', { id: toastId });
        setExportingXLS(false);
        return;
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Legacy Clinics & Diagnostics — Lumina Portal';
      workbook.created = new Date();

      const primaryColor = '007B8A'; // Legacy Clinics Cyan/Teal
      const darkColor    = '003B44'; // Legacy Charcoal Teal
      const subtleBorder = 'E2E8F0'; // Slate Border
      const headerBorder = 'CBD5E1';

      // ── Sheet: Proforma Invoices ──
      const ws = workbook.addWorksheet('Proforma Invoices', {
        views: [{ showGridLines: true }]
      });

      // Define columns
      ws.columns = [
        { key: 'index', width: 6 },
        { key: 'invoice_number', width: 18 },
        { key: 'invoice_date', width: 14 },
        { key: 'due_date', width: 14 },
        { key: 'customer_name', width: 28 },
        { key: 'customer_phone', width: 16 },
        { key: 'customer_email', width: 26 },
        { key: 'customer_tin', width: 16 },
        { key: 'items_count', width: 12 },
        { key: 'items_summary', width: 42 },
        { key: 'currency', width: 10 },
        { key: 'subtotal', width: 16 },
        { key: 'tax_due', width: 14 },
        { key: 'other_fees', width: 14 },
        { key: 'total_amount', width: 18 },
        { key: 'status', width: 14 },
        { key: 'prepared_by', width: 28 },
        { key: 'contact_person', width: 34 }
      ];

      // ── Title Banner ──
      ws.mergeCells('A1:R1');
      const titleCell = ws.getCell('A1');
      titleCell.value = 'LEGACY CLINICS & DIAGNOSTICS LTD — PROFORMA INVOICES REPORT';
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: darkColor } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      ws.getRow(1).height = 36;

      // ── Metadata / Filter Summary Row ──
      ws.mergeCells('A2:R2');
      const metaCell = ws.getCell('A2');
      const dateRangeText = startDate && endDate
        ? `${startDate} to ${endDate}`
        : startDate
        ? `From ${startDate}`
        : endDate
        ? `Up to ${endDate}`
        : 'All Dates';
      const statusText = statusFilter === 'all' ? 'All Statuses' : statusFilter;
      const totalSum = exportData.reduce((acc, p) => acc + (Number(p.total_amount) || 0), 0);

      metaCell.value = `Date Range: ${dateRangeText}  |  Status: ${statusText}  |  Total Proformas: ${exportData.length}  |  Total Value: ${totalSum.toLocaleString()} RWF  |  Generated: ${new Date().toLocaleString()}`;
      metaCell.font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FFFFFF' } };
      metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
      metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
      ws.getRow(2).height = 22;

      // ── Blank spacing row ──
      ws.getRow(3).height = 10;

      // ── Header Row ──
      const headers = [
        '#',
        'Invoice #',
        'Invoice Date',
        'Due Date',
        'Customer / Client',
        'Phone Number',
        'Email Address',
        'TIN',
        'Items Count',
        'Line Items Description',
        'Currency',
        'Subtotal (RWF)',
        'Tax Due (RWF)',
        'Other Fees (RWF)',
        'Total Amount (RWF)',
        'Status',
        'Prepared By',
        'Inquiries Contact'
      ];

      const headerRow = ws.getRow(4);
      headerRow.values = headers;
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: headerBorder } },
          bottom: { style: 'medium', color: { argb: darkColor } },
          left: { style: 'thin', color: { argb: headerBorder } },
          right: { style: 'thin', color: { argb: headerBorder } }
        };
      });

      // ── Data Rows ──
      exportData.forEach((p, idx) => {
        const rowIdx = idx + 5;
        const r = ws.getRow(rowIdx);
        r.height = 22;

        const itemsArr = Array.isArray(p.items) ? p.items : [];
        const itemsSummary = itemsArr.map(it => `${it.description || 'Item'} (x${it.quantity || 1})`).join('; ');
        const prepName = p.prepared_by_name || '';
        const prepTitle = p.prepared_by_title ? ` (${p.prepared_by_title})` : '';

        r.values = [
          idx + 1,
          p.invoice_number || `PF-${p.id}`,
          p.invoice_date || '',
          p.due_date || 'N/A',
          p.customer_name || 'N/A',
          p.customer_phone || '',
          p.customer_email || '',
          p.customer_tin || '',
          itemsArr.length,
          itemsSummary,
          p.currency || 'RWF',
          Number(p.subtotal) || 0,
          Number(p.tax_due) || 0,
          Number(p.other_fees) || 0,
          Number(p.total_amount) || 0,
          p.status || 'Draft',
          `${prepName}${prepTitle}`,
          p.contact_person || 'Sofia, 0787363970, E-mail: sofia@legacyclinics.rw'
        ];

        // Format and style cells
        const isZebra = idx % 2 === 1;
        r.eachCell((cell, colNum) => {
          cell.font = { name: 'Calibri', size: 9.5, color: { argb: '1F2937' } };
          cell.border = {
            top: { style: 'thin', color: { argb: subtleBorder } },
            bottom: { style: 'thin', color: { argb: subtleBorder } },
            left: { style: 'thin', color: { argb: subtleBorder } },
            right: { style: 'thin', color: { argb: subtleBorder } }
          };

          if (isZebra) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
          }

          // Alignments & Number formats
          if (colNum === 1 || colNum === 3 || colNum === 4 || colNum === 11) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else if (colNum === 9) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.numFmt = '#,##0';
          } else if (colNum === 12 || colNum === 13 || colNum === 14 || colNum === 15) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            cell.numFmt = '#,##0';
          } else if (colNum === 16) {
            // Status styling
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            const st = p.status || 'Draft';
            if (st === 'Paid') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } };
              cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '15803D' } };
            } else if (st === 'Sent') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0F2FE' } };
              cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '0369A1' } };
            } else if (st === 'Cancelled') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
              cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'DC2626' } };
            } else {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
              cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'B45309' } };
            }
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          }
        });
      });

      // ── Total Summary Row ──
      const totalRowIdx = exportData.length + 5;
      const totalRow = ws.getRow(totalRowIdx);
      totalRow.height = 26;

      ws.mergeCells(`A${totalRowIdx}:K${totalRowIdx}`);
      const totalLabelCell = ws.getCell(`A${totalRowIdx}`);
      totalLabelCell.value = 'TOTAL (RWF)';
      totalLabelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: darkColor } };
      totalLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };
      totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6F4F6' } };

      const subtotalFormulaCell = ws.getCell(`L${totalRowIdx}`);
      subtotalFormulaCell.value = { formula: `SUM(L5:L${totalRowIdx - 1})` };
      subtotalFormulaCell.numFmt = '#,##0';

      const taxFormulaCell = ws.getCell(`M${totalRowIdx}`);
      taxFormulaCell.value = { formula: `SUM(M5:M${totalRowIdx - 1})` };
      taxFormulaCell.numFmt = '#,##0';

      const feesFormulaCell = ws.getCell(`N${totalRowIdx}`);
      feesFormulaCell.value = { formula: `SUM(N5:N${totalRowIdx - 1})` };
      feesFormulaCell.numFmt = '#,##0';

      const totalAmountFormulaCell = ws.getCell(`O${totalRowIdx}`);
      totalAmountFormulaCell.value = { formula: `SUM(O5:O${totalRowIdx - 1})` };
      totalAmountFormulaCell.numFmt = '#,##0';

      totalRow.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: darkColor } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6F4F6' } };
        cell.border = {
          top: { style: 'medium', color: { argb: primaryColor } },
          bottom: { style: 'double', color: { argb: darkColor } },
          left: { style: 'thin', color: { argb: subtleBorder } },
          right: { style: 'thin', color: { argb: subtleBorder } }
        };
      });

      // Generate buffer and trigger browser download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Legacy_Clinics_Proforma_Invoices_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);

      toast.success('Proforma Invoices Excel report exported successfully!', { id: toastId });
    } catch (err) {
      console.error('Excel Export Error:', err);
      toast.error('Failed to export Excel report', { id: toastId });
    } finally {
      setExportingXLS(false);
    }
  };

  const statusStyles = {
    Paid: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
    Sent: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
    Draft: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
    Cancelled: { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Toolbar: Search, Filters, Export XLS, New ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: '#ffffff',
        padding: '16px 20px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        {/* Top Row: Search and Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Search input */}
          <div style={{ position: 'relative', width: '340px', maxWidth: '100%' }}>
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

          {/* Action Buttons: Refresh, Export XLS, Create */}
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
              onClick={handleExportXLS}
              disabled={exportingXLS}
              title="Export comprehensive Excel report of proformas with status and dates"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 15px',
                borderRadius: '8px',
                border: '1px solid #16a34a',
                backgroundColor: '#f0fdf4',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#15803d',
                cursor: exportingXLS ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(22, 163, 74, 0.12)',
                transition: 'all 0.15s ease'
              }}
            >
              {exportingXLS ? (
                <RefreshCw size={14} className="animate-spin text-emerald-600" />
              ) : (
                <FileSpreadsheet size={15} color="#16a34a" />
              )}
              {exportingXLS ? 'Generating XLS...' : 'Export XLS'}
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
                backgroundColor: '#007B8A',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,123,138,0.25)'
              }}
            >
              <Plus size={16} /> Create Proforma
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />

        {/* Bottom Row: Status Filter Pills & Date Range Filters */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Status Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>
              STATUS:
            </span>
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
                  backgroundColor: statusFilter === st ? '#007B8A' : '#ffffff',
                  borderColor: statusFilter === st ? '#007B8A' : '#cbd5e1',
                  color: statusFilter === st ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                {st === 'all' ? 'All Proformas' : st}
              </button>
            ))}
          </div>

          {/* Date Range Filters & Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} color="#64748b" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                DATE:
              </span>
            </div>

            {/* Date presets */}
            <div style={{
              display: 'inline-flex',
              padding: '2px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'today', label: 'Today' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleDatePreset(p.id)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: activeDatePreset === p.id ? '#ffffff' : 'transparent',
                    color: activeDatePreset === p.id ? '#007B8A' : '#64748b',
                    boxShadow: activeDatePreset === p.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom From & To Inputs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActiveDatePreset('custom');
                }}
                title="Filter by Invoice Date (From)"
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.75rem',
                  color: '#334155',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActiveDatePreset('custom');
                }}
                title="Filter by Invoice Date (To)"
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.75rem',
                  color: '#334155',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>

            {/* Clear / Reset Filters Button */}
            {(startDate || endDate || statusFilter !== 'all' || search) && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset all filters"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#dc2626',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>
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
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedForPreview(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '32px 16px',
            overflowY: 'auto'
          }}
        >
          <div style={{
            position: 'relative',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '920px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
            marginBottom: '40px'
          }}>
            {/* Floating circular (X) close button */}
            <button
              type="button"
              onClick={() => setSelectedForPreview(null)}
              title="Close Preview (Esc)"
              aria-label="Close"
              style={{
                position: 'absolute',
                top: '-14px',
                right: '-14px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '2px solid #cbd5e1',
                boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#1e293b',
                zIndex: 100,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <X size={22} strokeWidth={2.5} />
            </button>

            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px'
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
                  onClick={() => printProformaDocument('proforma-list-modal-sheet', `Proforma_${selectedForPreview?.invoice_number || 'Legacy_Clinics'}`)}
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
                  title="Close (Esc)"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f1f5f9',
                    fontSize: '0.85rem',
                    color: '#334155',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <X size={16} /> Close
                </button>
              </div>
            </div>

            {/* Modal Body: Printable sheet */}
            <div style={{ padding: '24px', backgroundColor: '#f1f5f9' }}>
              <div
                id="proforma-list-modal-sheet"
                style={{
                  maxWidth: '820px',
                  margin: '0 auto',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                  borderRadius: '4px'
                }}
              >
                <ProformaInvoicePrintView proforma={selectedForPreview} />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 24px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              borderBottomLeftRadius: '16px',
              borderBottomRightRadius: '16px'
            }}>
              <button
                type="button"
                onClick={() => printProformaDocument('proforma-list-modal-sheet', `Proforma_${selectedForPreview?.invoice_number || 'Legacy_Clinics'}`)}
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
                <Printer size={15} /> Print / PDF
              </button>
              <button
                type="button"
                onClick={() => setSelectedForPreview(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <X size={16} /> Close
              </button>
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
