import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { DollarSign, Plane, Printer, FileText, Download, Plus, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';
import Modal from '../../components/Modal';

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
        fetch('/api/logistics/admin/petty-cash', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/logistics/admin/sample-dispatches', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/logistics/admin/print-requisitions', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/logistics/admin/cfo-report', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      const [cJson, sJson, pJson, rJson] = await Promise.all([cRes.json(), sRes.json(), pRes.json(), rRes.json()]);

      if (cJson.success) setPettyCash(cJson.data);
      if (sJson.success) setSamples(sJson.data);
      if (pJson.success) setPrintReqs(pJson.data);
      if (rJson.success) setCfoReport(rJson.data);
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
      const res = await fetch('/api/logistics/admin/petty-cash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(cashForm)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Petty cash expense logged!');
        setIsCashModal(false);
        fetchData();
      } else {
        toast.error(json.message || 'Failed to log expense');
      }
    } catch (err) {
      toast.error('Error saving petty cash');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSampleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/logistics/admin/sample-dispatches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(sampleForm)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('NIPT Sample DHL dispatch logged!');
        setIsSampleModal(false);
        fetchData();
      } else {
        toast.error(json.message || 'Failed to log shipment');
      }
    } catch (err) {
      toast.error('Error recording sample dispatch');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/logistics/admin/print-requisitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(printForm)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Stationery print requisition created!');
        setIsPrintModal(false);
        fetchData();
      } else {
        toast.error(json.message || 'Failed to submit requisition');
      }
    } catch (err) {
      toast.error('Error creating requisition');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePettyCashStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/logistics/admin/petty-cash/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Petty cash marked as ${status}`);
        fetchData();
      } else {
        toast.error(json.message || 'Failed to update status');
      }
    } catch (err) {
      toast.error('Error updating status');
    }
  };

  const handleUpdateSampleStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/logistics/admin/sample-dispatches/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Shipment updated to ${status}`);
        fetchData();
      } else {
        toast.error(json.message || 'Failed to update status');
      }
    } catch (err) {
      toast.error('Error updating status');
    }
  };

  const handleUpdatePrintStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/logistics/admin/print-requisitions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Requisition updated to ${status}`);
        fetchData();
      } else {
        toast.error(json.message || 'Failed to update status');
      }
    } catch (err) {
      toast.error('Error updating status');
    }
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
            OPERATIONS ADMIN
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '6px 0 0 0', color: '#0f172a' }}>
            Operations Admin, Shipments & Requisitions
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setIsCashModal(true)} className="btn btn-primary" style={{ backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={16} /> Log Petty Cash
          </button>
          <button onClick={() => setIsSampleModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plane size={16} /> Track NIPT Belgian Courier
          </button>
          <button onClick={() => setIsPrintModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Print Requisition
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', gap: '1rem' }}>
        <button
          onClick={() => setActiveTab('petty_cash')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'petty_cash' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'petty_cash' ? '3px solid #0284c7' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
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
            color: activeTab === 'nipt' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'nipt' ? '3px solid #0284c7' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
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
            color: activeTab === 'printing' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'printing' ? '3px solid #0284c7' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Printer size={16} /> Nursing Stationery Requisitions
        </button>

        <button
          onClick={() => setActiveTab('cfo_report')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'cfo_report' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'cfo_report' ? '3px solid #0284c7' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <FileText size={16} /> Automated Monthly CFO Report
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
                    <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>{s.dhl_waybill}</td>
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
