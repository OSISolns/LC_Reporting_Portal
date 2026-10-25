import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { DollarSign, Plane, Printer, FileText, Download, Plus, CheckCircle2, ShieldCheck, AlertTriangle, ExternalLink, FileSpreadsheet } from 'lucide-react';
import Modal from '../../components/Modal';
import { exportToLegacyExcel, exportMultiSheetLegacyExcel } from '../../utils/excelExport';
import {
  getPettyCash,
  createPettyCash,
  updatePettyCash,
  getSampleDispatches,
  createSampleDispatch,
  updateSampleDispatch,
  getPrintRequisitions,
  createPrintRequisition,
  updatePrintRequisition,
  getCfoReport
} from '../../api/logistics';

const LogisticsAdmin = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('petty_cash'); // 'petty_cash', 'nipt', 'printing', 'cfo_report'
  const [loading, setLoading] = useState(true);
  const [pettyCash, setPettyCash] = useState([]);
  const [samples, setSamples] = useState([]);
  const [printReqs, setPrintReqs] = useState([]);
  const [cfoReport, setCfoReport] = useState(null);

  const [isCashModal, setIsCashModal] = useState(false);
  const [isSampleModal, setIsSampleModal] = useState(false);
  const [isPrintModal, setIsPrintModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [cashForm, setCashForm] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    category: 'Vehicle Fuel',
    description: '',
    amount: '',
    receipt_number: ''
  });

  const [sampleForm, setSampleForm] = useState({
    patient_code: '',
    sampling_time: new Date().toISOString(),
    cold_chain_ok: true,
    dhl_waybill: '',
    departure_time: new Date().toISOString(),
    notes: ''
  });

  const [printForm, setPrintForm] = useState({
    nursing_station: '',
    item_description: '',
    quantity: 1
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cRes, sRes, pRes, rRes] = await Promise.all([
        getPettyCash(),
        getSampleDispatches(),
        getPrintRequisitions(),
        getCfoReport()
      ]);

      if (cRes.data?.success) setPettyCash(cRes.data.data);
      if (sRes.data?.success) setSamples(sRes.data.data);
      if (pRes.data?.success) setPrintReqs(pRes.data.data);
      if (rRes.data?.success) setCfoReport(rRes.data.data);
    } catch (err) {
      toast.error('Error loading logistics admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCashSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await createPettyCash(cashForm);
      if (res.data?.success) {
        toast.success('Petty cash expense logged!');
        setIsCashModal(false);
        fetchData();
      } else {
        toast.error(res.data?.message || 'Failed to log expense');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving petty cash');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSampleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await createSampleDispatch(sampleForm);
      if (res.data?.success) {
        toast.success('NIPT Sample DHL dispatch logged!');
        setIsSampleModal(false);
        fetchData();
      } else {
        toast.error(res.data?.message || 'Failed to log shipment');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error recording sample dispatch');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await createPrintRequisition(printForm);
      if (res.data?.success) {
        toast.success('Stationery print requisition created!');
        setIsPrintModal(false);
        fetchData();
      } else {
        toast.error(res.data?.message || 'Failed to submit requisition');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating requisition');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePettyCashStatus = async (id, status) => {
    try {
      const res = await updatePettyCash(id, { status });
      if (res.data?.success) {
        toast.success(`Petty cash marked as ${status}`);
        fetchData();
      } else {
        toast.error(res.data?.message || 'Failed to update status');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating status');
    }
  };

  const handleUpdateSampleStatus = async (id, status) => {
    try {
      const res = await updateSampleDispatch(id, { status });
      if (res.data?.success) {
        toast.success(`Shipment updated to ${status}`);
        fetchData();
      } else {
        toast.error(res.data?.message || 'Failed to update status');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating status');
    }
  };

  const handleUpdatePrintStatus = async (id, status) => {
    try {
      const res = await updatePrintRequisition(id, { status });
      if (res.data?.success) {
        toast.success(`Requisition updated to ${status}`);
        fetchData();
      } else {
        toast.error(res.data?.message || 'Failed to update status');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating status');
    }
  };

  const handleExportPettyCashExcel = async () => {
    if (!pettyCash || pettyCash.length === 0) {
      toast.error('No petty cash transactions to export');
      return;
    }

    const totalExpense = pettyCash.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

    await exportToLegacyExcel({
      title: 'Legacy Clinics — Operational Petty Cash Ledger',
      subtitle: 'Disbursements, Emergency Operations, Fuel & Technical Vouchers',
      filename: 'Legacy_Clinics_Petty_Cash',
      sheetName: 'Petty Cash Ledger',
      user,
      metadata: [
        ['Reconciliation Account', 'Hospital Operational Petty Cash'],
        ['Total Disbursed', `${totalExpense.toLocaleString()} RWF`],
        ['Voucher Count', `${pettyCash.length} Recorded Transactions`],
      ],
      summaryMetrics: [
        { label: 'TOTAL VOUCHERS', value: pettyCash.length },
        { label: 'TOTAL DISBURSED', value: `${totalExpense.toLocaleString()} RWF` },
        { label: 'AVG VOUCHER AMOUNT', value: `${Math.round(totalExpense / (pettyCash.length || 1)).toLocaleString()} RWF` },
      ],
      columns: [
        { key: 'id', header: 'VOUCHER ID', width: 14, alignment: 'center' },
        { key: 'transaction_date', header: 'DATE', width: 16, alignment: 'center' },
        { key: 'category', header: 'EXPENSE CATEGORY', width: 22 },
        { key: 'description', header: 'DESCRIPTION / JUSTIFICATION', width: 32 },
        { key: 'amount', header: 'AMOUNT (RWF)', width: 18, numFmt: '#,##0 "RWF"', alignment: 'right' },
        { key: 'receipt_number', header: 'RECEIPT / INVOICE #', width: 20, alignment: 'center' },
        { key: 'logged_by', header: 'LOGGED BY', width: 20 },
        { key: 'status', header: 'STATUS', width: 14, isStatus: true, alignment: 'center' },
      ],
      data: pettyCash,
    });
  };

  const handleExportSamplesExcel = async () => {
    if (!samples || samples.length === 0) {
      toast.error('No DHL dispatch records to export');
      return;
    }

    await exportToLegacyExcel({
      title: 'Legacy Clinics — DHL International Specimen Dispatches',
      subtitle: 'Cold-Chain Diagnostic Samples, NIPT European Lab Shipments & Air Waybills',
      filename: 'Legacy_Clinics_DHL_Dispatches',
      sheetName: 'Specimen Dispatches',
      user,
      metadata: [
        ['Diagnostic Partner', 'Eurofins Biomnis / Belgian Reference Laboratory'],
        ['Total Sample Dispatches', `${samples.length} International Shipments`],
      ],
      summaryMetrics: [
        { label: 'TOTAL SHIPMENTS', value: samples.length },
        { label: 'COLD-CHAIN VERIFIED', value: samples.filter(s => s.cold_chain_status === 'Verified' || s.status === 'In Transit').length },
      ],
      columns: [
        { key: 'id', header: 'DISPATCH ID', width: 14, alignment: 'center' },
        { key: 'created_at', header: 'DISPATCH DATE', width: 18, alignment: 'center' },
        { key: 'patient_code', header: 'PATIENT CODE', width: 18, alignment: 'center' },
        { key: 'dhl_waybill', header: 'DHL WAYBILL NUMBER', width: 24, alignment: 'center' },
        { key: 'destination', header: 'DESTINATION', width: 20 },
        { key: 'cold_chain_status', header: 'COLD CHAIN STATUS', width: 20, alignment: 'center' },
        { key: 'status', header: 'STATUS', width: 14, isStatus: true, alignment: 'center' },
      ],
      data: samples,
    });
  };

  const handleExportCfoReportExcel = async () => {
    if (!cfoReport) {
      toast.error('CFO Report data not loaded yet');
      return;
    }

    await exportMultiSheetLegacyExcel({
      title: 'Legacy Clinics — Monthly Logistics & Operations Management Report',
      filename: `Legacy_Clinics_CFO_Logistics_Report_${cfoReport.reportMonth || 'Current'}`,
      user,
      sheets: [
        {
          sheetName: 'Executive Overview',
          title: 'Legacy Clinics — Executive Operations & Logistics Summary',
          subtitle: `Aggregated Performance Metrics & Costs — Month of ${cfoReport.reportMonth}`,
          columns: [
            { key: 'metric', header: 'OPERATIONAL KPI / EXPENSE ITEM', width: 36 },
            { key: 'value', header: 'REPORTED VALUE', width: 24, alignment: 'right' },
            { key: 'notes', header: 'OPERATIONAL CONTEXT', width: 36 },
          ],
          data: [
            { metric: 'Operational Petty Cash Total', value: `${(cfoReport.pettyCashTotal || 0).toLocaleString()} RWF`, notes: 'Emergency clinic & vehicle cash disbursements' },
            { metric: 'Total Vehicle & Ambulance Dispatches', value: `${cfoReport.totalTrips || 0} Runs`, notes: 'Patient evacuations, shuttle & mission trips' },
            { metric: 'Fleet Fuel Consumed', value: `${(cfoReport.totalFuelLiters || 0).toFixed(1)} Liters`, notes: 'Fleet diesel & petrol consumption' },
            { metric: 'Logged Facilities / Fleet Incidents', value: `${cfoReport.totalIncidents || 0} Incidents`, notes: 'Breakdowns, defect reports & infrastructure flags' },
            { metric: 'Pending Stationery Print Orders', value: `${printReqs.filter(p => p.status === 'Pending').length} Pending`, notes: 'Clinical stationery awaiting press fulfillment' },
            { metric: 'Active International Courier Samples', value: `${samples.length} Samples`, notes: 'NIPT / international diagnostic cold-chain shipments' },
          ],
          metadata: [
            ['Reporting Scope', `Institutional Logistics & Transport — ${cfoReport.reportMonth}`],
            ['Executive Destination', 'Chief Financial Officer (CFO) & Operations Committee'],
          ],
          summaryMetrics: [
            { label: 'PETTY CASH TOTAL', value: `${(cfoReport.pettyCashTotal || 0).toLocaleString()} RWF` },
            { label: 'AMBULANCE RUNS', value: cfoReport.totalTrips || 0 },
            { label: 'FUEL CONSUMED', value: `${(cfoReport.totalFuelLiters || 0).toFixed(1)} L` },
          ]
        },
        {
          sheetName: 'Petty Cash Ledger',
          title: 'Legacy Clinics — Monthly Petty Cash Transaction Breakdown',
          subtitle: `Detailed Expense Vouchers — Month of ${cfoReport.reportMonth}`,
          columns: [
            { key: 'id', header: 'VOUCHER ID', width: 14, alignment: 'center' },
            { key: 'transaction_date', header: 'DATE', width: 16, alignment: 'center' },
            { key: 'category', header: 'CATEGORY', width: 22 },
            { key: 'description', header: 'DESCRIPTION', width: 32 },
            { key: 'amount', header: 'AMOUNT (RWF)', width: 18, numFmt: '#,##0 "RWF"', alignment: 'right' },
            { key: 'receipt_number', header: 'RECEIPT #', width: 18, alignment: 'center' },
            { key: 'logged_by', header: 'LOGGED BY', width: 20 },
            { key: 'status', header: 'STATUS', width: 14, isStatus: true, alignment: 'center' },
          ],
          data: pettyCash,
        }
      ]
    });
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
            OPERATIONS ADMIN
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '6px 0 0 0', color: '#0f172a' }}>
            Operations Admin, Shipments & Requisitions
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setIsCashModal(true)} className="btn btn-primary" style={{ backgroundColor: '#1B669E', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', padding: '8px 14px', fontWeight: 600, border: 'none' }}>
            <DollarSign size={16} /> Log Petty Cash
          </button>
          {activeTab === 'cfo_report' ? (
            <button onClick={handleExportCfoReportExcel} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', padding: '8px 14px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#1B669E', fontWeight: 600 }}>
              <FileSpreadsheet size={16} color="#1B669E" /> Export CFO Report Excel
            </button>
          ) : activeTab === 'nipt' ? (
            <button onClick={handleExportSamplesExcel} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', padding: '8px 14px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#1B669E', fontWeight: 600 }}>
              <FileSpreadsheet size={16} color="#1B669E" /> Export Courier Excel
            </button>
          ) : (
            <button onClick={handleExportPettyCashExcel} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', padding: '8px 14px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#1B669E', fontWeight: 600 }}>
              <FileSpreadsheet size={16} color="#1B669E" /> Export Petty Cash Excel
            </button>
          )}
          <button onClick={() => setIsSampleModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', padding: '8px 14px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: 600 }}>
            <Plane size={16} /> Track NIPT Belgian Courier
          </button>
          <button onClick={() => setIsPrintModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', padding: '8px 14px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: 600 }}>
            <Printer size={16} /> Print Requisition
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', gap: '1rem', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('petty_cash')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'petty_cash' ? '#1B669E' : '#64748b',
            borderBottom: activeTab === 'petty_cash' ? '3px solid #1B669E' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <DollarSign size={16} /> Petty Cash Sheet
        </button>

        <button
          onClick={() => setActiveTab('nipt')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'nipt' ? '#1B669E' : '#64748b',
            borderBottom: activeTab === 'nipt' ? '3px solid #1B669E' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Plane size={16} /> NIPT Belgian Courier Tracker
        </button>

        <button
          onClick={() => setActiveTab('printing')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'printing' ? '#1B669E' : '#64748b',
            borderBottom: activeTab === 'printing' ? '3px solid #1B669E' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Printer size={16} /> Print Requisitions
        </button>

        <button
          onClick={() => setActiveTab('cfo_report')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'cfo_report' ? '#1B669E' : '#64748b',
            borderBottom: activeTab === 'cfo_report' ? '3px solid #1B669E' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <FileText size={16} /> CFO Expense Summary
        </button>
      </div>


      {activeTab === 'petty_cash' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Date</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Category</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Description</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Receipt #</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Amount (RWF)</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Logged By</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pettyCash.length > 0 ? (
                pettyCash.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{c.transaction_date}</td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{c.category}</td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{c.description}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#64748b' }}>{c.receipt_number || 'N/A'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0284c7' }}>{Number(c.amount)?.toLocaleString()} RWF</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{c.logged_by}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                        backgroundColor: c.status === 'Paid' ? '#dcfce7' : c.status === 'Approved' ? '#e0f2fe' : '#fee2e2',
                        color: c.status === 'Paid' ? '#15803d' : c.status === 'Approved' ? '#0369a1' : '#dc2626'
                      }}>
                        {c.status || 'Approved'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {c.status !== 'Paid' ? (
                        <button
                          onClick={() => handleUpdatePettyCashStatus(c.id, 'Paid')}
                          style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: 'none', backgroundColor: '#dcfce7', color: '#15803d', cursor: 'pointer' }}
                        >
                          Mark Paid
                        </button>
                      ) : <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Settled</span>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ padding: '3rem 2rem', textAlign: 'center', color: '#64748b', fontSize: '0.95rem' }}>No petty cash transactions recorded yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'nipt' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Patient Code</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Sampling Timestamp</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Cold Chain Verification</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>DHL Waybill Number</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>Update Tracking</th>
              </tr>
            </thead>
            <tbody>
              {samples.length > 0 ? (
                samples.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0284c7' }}>{s.patient_code}</td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{new Date(s.sampling_time).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
                        Cold Chain OK
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace' }}>
                      {s.dhl_waybill ? (
                        <a
                          href={`https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(s.dhl_waybill)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#1B669E', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                          title="Track on DHL"
                        >
                          {s.dhl_waybill}
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                        backgroundColor: s.status === 'Delivered' ? '#dcfce7' : s.status === 'In Transit' ? '#fef9c3' : '#e0f2fe',
                        color: s.status === 'Delivered' ? '#15803d' : s.status === 'In Transit' ? '#ca8a04' : '#0369a1'
                      }}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <select
                        value={s.status}
                        onChange={(e) => handleUpdateSampleStatus(s.id, e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #cbd5e1' }}
                      >
                        <option value="Dispatched">Dispatched</option>
                        <option value="In Transit">In Transit</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Received at Brussels Lab">Received at Brussels Lab</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem 2rem', textAlign: 'center', color: '#64748b', fontSize: '0.95rem' }}>No NIPT international shipments dispatched yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'printing' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Date</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Nursing Station</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Item Description</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Qty</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Requested By</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {printReqs.length > 0 ? (
                printReqs.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{p.request_date}</td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{p.nursing_station}</td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{p.item_description}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{p.quantity}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{p.requested_by}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                        backgroundColor: p.status === 'Delivered' ? '#dcfce7' : p.status === 'Printed' ? '#e0f2fe' : '#fef3c7',
                        color: p.status === 'Delivered' ? '#15803d' : p.status === 'Printed' ? '#0369a1' : '#b45309'
                      }}>
                        {p.status || 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <select
                        value={p.status || 'Pending'}
                        onChange={(e) => handleUpdatePrintStatus(p.id, e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #cbd5e1' }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Printed">Printed</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ padding: '3rem 2rem', textAlign: 'center', color: '#64748b', fontSize: '0.95rem' }}>No stationery print requisitions submitted yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'cfo_report' && cfoReport && (
        <div className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                Monthly Logistics & Operations Management Report
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Automated monthly summary compiled for the CFO & Executive Leadership — {cfoReport.reportMonth}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>TOTAL PETTY CASH EXPENSE</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {cfoReport.pettyCashTotal?.toLocaleString()} RWF
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>AMBULANCE RUNS & FUEL</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {cfoReport.totalTrips} Runs ({cfoReport.totalFuelLiters} L)
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>LOGGED INCIDENTS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {cfoReport.totalIncidents} Total
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PETTY CASH */}
      {isCashModal && (
        <Modal isOpen={true} title="Log Petty Cash Expense" onClose={() => setIsCashModal(false)}>
          <form onSubmit={handleCashSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Category</label>
                <select className="input" style={{ width: '100%' }} value={cashForm.category} onChange={(e) => setCashForm({ ...cashForm, category: e.target.value })}>
                  <option value="Vehicle Fuel">Vehicle Fuel</option>
                  <option value="Urgent Hardware">Urgent Hardware</option>
                  <option value="Minor Plumbing/Electric">Minor Maintenance</option>
                  <option value="Tolls & Parking">Tolls & Parking</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Amount (RWF)</label>
                <input type="number" className="input" style={{ width: '100%' }} value={cashForm.amount} onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })} required />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Expense Description</label>
              <input type="text" className="input" style={{ width: '100%' }} value={cashForm.description} onChange={(e) => setCashForm({ ...cashForm, description: e.target.value })} required />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsCashModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>Save Expense</button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: NIPT COURIER */}
      {isSampleModal && (
        <Modal isOpen={true} title="NIPT Sample International Dispatch" onClose={() => setIsSampleModal(false)}>
          <form onSubmit={handleSampleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Patient Code</label>
                <input type="text" className="input" style={{ width: '100%' }} value={sampleForm.patient_code} onChange={(e) => setSampleForm({ ...sampleForm, patient_code: e.target.value })} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>DHL Express Waybill Number</label>
                <input type="text" className="input" style={{ width: '100%' }} value={sampleForm.dhl_waybill} onChange={(e) => setSampleForm({ ...sampleForm, dhl_waybill: e.target.value })} required />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsSampleModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>Record DHL Dispatch</button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: PRINT REQUISITION */}
      {isPrintModal && (
        <Modal isOpen={true} title="New Stationery Print Requisition" onClose={() => setIsPrintModal(false)}>
          <form onSubmit={handlePrintSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Nursing Station / Department</label>
                <input type="text" className="input" style={{ width: '100%' }} value={printForm.nursing_station} onChange={(e) => setPrintForm({ ...printForm, nursing_station: e.target.value })} placeholder="e.g. ICU, OPD, Maternity" required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Quantity</label>
                <input type="number" min="1" className="input" style={{ width: '100%' }} value={printForm.quantity} onChange={(e) => setPrintForm({ ...printForm, quantity: e.target.value })} required />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Item Description / Form Name</label>
              <input type="text" className="input" style={{ width: '100%' }} value={printForm.item_description} onChange={(e) => setPrintForm({ ...printForm, item_description: e.target.value })} placeholder="e.g. Patient Clinical Vitals Chart Pads (500 sheets)" required />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsPrintModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>Submit Requisition</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default LogisticsAdmin;
