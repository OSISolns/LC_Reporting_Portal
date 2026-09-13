import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Wrench, ShieldCheck, Plus, ArrowRightLeft, Calendar, DollarSign, Tag, CheckCircle, FileText, AlertTriangle, CheckCircle2, TrendingUp, Activity, Download } from 'lucide-react';
import Modal from '../../components/Modal';

const AssetManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('register'); // 'register', 'transfers', 'ppm', 'capex', 'report'
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [ppmRecords, setPpmRecords] = useState([]);

  const [isAssetModal, setIsAssetModal] = useState(false);
  const [isTransferModal, setIsTransferModal] = useState(false);
  const [isPpmModal, setIsPpmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [assetForm, setAssetForm] = useState({
    asset_tag: '',
    serial_number: '',
    name: '',
    category: 'Biomedical',
    department: 'CLINIC',
    custodian: '',
    purchase_date: new Date().toISOString().split('T')[0],
    warranty_exp: '',
    expected_lifespan_years: 5,
    purchase_cost: ''
  });

  const [transferForm, setTransferForm] = useState({
    asset_id: '',
    from_dept: '',
    to_dept: '',
    notes: ''
  });

  const [ppmForm, setPpmForm] = useState({
    asset_id: '',
    maintenance_type: 'Preventive Quarterly',
    scheduled_date: new Date().toISOString().split('T')[0],
    technician: '',
    findings: '',
    cost: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [aRes, tRes, pRes] = await Promise.all([
        fetch('/api/logistics/assets', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/logistics/assets/transfers', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/logistics/assets/ppm', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      const [aJson, tJson, pJson] = await Promise.all([aRes.json(), tRes.json(), pRes.json()]);

      if (aJson.success) setAssets(aJson.data);
      if (tJson.success) setTransfers(tJson.data);
      if (pJson.success) setPpmRecords(pJson.data);
    } catch (err) {
      toast.error('Error loading asset management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssetSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/logistics/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(assetForm)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Asset added to Master Register!');
        setIsAssetModal(false);
        fetchData();
      } else {
        toast.error(json.message || 'Failed to add asset');
      }
    } catch (err) {
      toast.error('Error submitting asset');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/logistics/assets/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(transferForm)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Asset custody transfer initiated!');
        setIsTransferModal(false);
        fetchData();
      } else {
        toast.error(json.message || 'Failed to submit transfer');
      }
    } catch (err) {
      toast.error('Error submitting transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePpmSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/logistics/assets/ppm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(ppmForm)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('PPM maintenance work order scheduled!');
        setIsPpmModal(false);
        fetchData();
      } else {
        toast.error(json.message || 'Failed to schedule PPM');
      }
    } catch (err) {
      toast.error('Error submitting PPM record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
            ASSETS & LIFECYCLE
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '6px 0 0 0', color: '#0f172a' }}>
            Biomedical & Physical Asset Management
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setIsAssetModal(true)} className="btn btn-primary" style={{ backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Add Asset
          </button>
          <button onClick={() => setIsTransferModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowRightLeft size={16} /> Transfer Custody
          </button>
          <button onClick={() => setIsPpmModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} /> Schedule PPM
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('register')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'register' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'register' ? '3px solid #0284c7' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Tag size={16} /> Master Asset Register
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'transfers' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'transfers' ? '3px solid #0284c7' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <ArrowRightLeft size={16} /> Asset Transfers
        </button>

        <button
          onClick={() => setActiveTab('ppm')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'ppm' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'ppm' ? '3px solid #0284c7' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Wrench size={16} /> Preventive Maintenance Plan
        </button>

        <button
          onClick={() => setActiveTab('capex')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'capex' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'capex' ? '3px solid #0284c7' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <DollarSign size={16} /> 5-Year Capital Replacement
        </button>

        <button
          onClick={() => setActiveTab('report')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'report' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'report' ? '3px solid #0284c7' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <FileText size={16} /> 2026 Audit Report
        </button>
      </div>

      {/* MASTER REGISTER TAB */}
      {activeTab === 'register' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>Asset Tag</th>
                <th style={{ padding: '12px 16px' }}>Equipment Name & Serial</th>
                <th style={{ padding: '12px 16px' }}>Category & Dept</th>
                <th style={{ padding: '12px 16px' }}>Custodian</th>
                <th style={{ padding: '12px 16px' }}>Cost (RWF)</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {assets.length > 0 ? (
                assets.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0d9488' }}>{a.asset_tag}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700 }}>{a.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>S/N: {a.serial_number || 'N/A'}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{a.category} • {a.department}</td>
                    <td style={{ padding: '12px 16px' }}>{a.custodian || 'Unassigned'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{a.purchase_cost?.toLocaleString()} RWF</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No assets registered yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TRANSFERS TAB */}
      {activeTab === 'transfers' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>Asset Tag</th>
                <th style={{ padding: '12px 16px' }}>Equipment</th>
                <th style={{ padding: '12px 16px' }}>Transfer Route</th>
                <th style={{ padding: '12px 16px' }}>Initiated By</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {transfers.length > 0 ? (
                transfers.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{t.asset_tag}</td>
                    <td style={{ padding: '12px 16px' }}>{t.asset_name}</td>
                    <td style={{ padding: '12px 16px' }}>{t.from_dept} → {t.to_dept}</td>
                    <td style={{ padding: '12px 16px' }}>{t.initiated_by}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#fef3c7', color: '#b45309' }}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No asset transfers initiated yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PPM TAB */}
      {activeTab === 'ppm' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>Scheduled Date</th>
                <th style={{ padding: '12px 16px' }}>Asset</th>
                <th style={{ padding: '12px 16px' }}>Maintenance Type</th>
                <th style={{ padding: '12px 16px' }}>Technician</th>
                <th style={{ padding: '12px 16px' }}>Findings / Status</th>
              </tr>
            </thead>
            <tbody>
              {ppmRecords.length > 0 ? (
                ppmRecords.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{p.scheduled_date}</td>
                    <td style={{ padding: '12px 16px' }}>{p.asset_name} ({p.asset_tag})</td>
                    <td style={{ padding: '12px 16px' }}>{p.maintenance_type}</td>
                    <td style={{ padding: '12px 16px' }}>{p.technician}</td>
                    <td style={{ padding: '12px 16px' }}>{p.findings}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No preventive maintenance work orders recorded</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CAPEX TAB */}
      {activeTab === 'capex' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {assets.map((a) => {
              const purchaseYear = new Date(a.purchase_date || Date.now()).getFullYear();
              const replaceYear = purchaseYear + (a.expected_lifespan_years || 5);
              return (
                <div key={a.id} className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0d9488' }}>{a.asset_tag}</div>
                  <h4 style={{ margin: '4px 0 8px 0', fontSize: '1rem', fontWeight: 800 }}>{a.name}</h4>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                    Purchase Cost: {a.purchase_cost?.toLocaleString()} RWF<br />
                    Expected Lifespan: {a.expected_lifespan_years} Years
                  </div>
                  <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', borderRadius: '6px', color: '#166534', fontSize: '0.85rem', fontWeight: 700 }}>
                    Replacement Forecast Year: {replaceYear}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2026 AUDIT & REPLACEMENT REPORT TAB */}
      {activeTab === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Header Banner */}
          <div className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #cbd5e1', borderLeft: '6px solid #0284c7', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ padding: '4px 10px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Annual Operations Audit • 2026 Edition
                </span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 4px 0' }}>
                  Biomedical & IT Equipment Audit, PPM & Replacement Report (2026)
                </h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                  Comprehensive cross-examination of hospital inventory profiles, planned maintenance cadence, and equipment life-cycle replacements for FY 2026.
                </p>
              </div>
              <button 
                onClick={() => window.print()} 
                className="btn btn-secondary" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, backgroundColor: '#f8fafc' }}
              >
                <Download size={16} /> Export Audit Report
              </button>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="#0284c7" /> 1. Executive Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              <div className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.5rem', border: '1px solid #e2e8f0', borderTop: '4px solid #0284c7', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', marginBottom: '6px' }}>Active Asset Base</div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
                  The primary registry covers clinical departments, imaging/diagnostics, surgical suites, and supporting IT/biomedical infrastructure across all legacy clinic operational zones.
                </p>
              </div>

              <div className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.5rem', border: '1px solid #e2e8f0', borderTop: '4px solid #16a34a', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', marginBottom: '6px' }}>Maintenance Strategy</div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
                  The 2026 PPM schedule establishes routine quarterly (Q1–Q4) and bi-annual inspection cycles designed to minimize unplanned downtime, meet clinical audit standards, and extend useful life.
                </p>
              </div>

              <div className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.5rem', border: '1px solid #e2e8f0', borderTop: '4px solid #d97706', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', marginBottom: '6px' }}>Capital Renewal & Replacement</div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
                  Prioritizes aging, high-repair-frequency, or obsolete units (legacy monitors, anesthesia/suction apparatus, lab analyzers, network switches, and workstations) posing operational bottlenecks.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Master Asset Register Breakdown */}
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={20} color="#0284c7" /> 2. Master Asset Register Breakdown
            </h3>
            
            <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '1.25rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '14px 18px', fontWeight: 800 }}>Category / Department Tier</th>
                    <th style={{ padding: '14px 18px', fontWeight: 800 }}>Typical Equipment Scope</th>
                    <th style={{ padding: '14px 18px', fontWeight: 800 }}>Criticality Level</th>
                    <th style={{ padding: '14px 18px', fontWeight: 800 }}>Maintenance Model</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>Critical Care & OT</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>Anesthesia machines, patient monitors, ventilators, defibrillators, surgical lights</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#fef2f2', color: '#991b1b' }}>Critical / Tier 1</span>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#334155' }}>Quarterly PPM + Calibration Verification</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>Diagnostic & Imaging</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>Ultrasound systems, digital radiography/X-ray, dental X-ray units</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#fff7ed', color: '#c2410c' }}>High / Tier 1</span>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#334155' }}>Semi-annual OEM vendor service + in-house PPM</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>Laboratory Services</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>Chemistry analyzers, hematology counters, centrifuges, incubators</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#e0f2fe', color: '#0369a1' }}>High / Tier 2</span>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#334155' }}>Reagent-vendor calibration + monthly/quarterly checks</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>General Wards & OPD</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>Vital sign monitors, ECG machines, suction pumps, examination beds</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#f1f5f9', color: '#475569' }}>Medium / Tier 2</span>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#334155' }}>In-house bi-annual electrical & performance tests</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>Facility & IT Infrastructure</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>UPS units, server racks, managed switches, core workstations</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#f0fdf4', color: '#15803d' }}>Operational Backbone</span>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#334155' }}>Monthly physical inspection + battery load testing</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Health Observations */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ backgroundColor: '#fffbe6', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #ffe58f', display: 'flex', gap: '12px' }}>
                <AlertTriangle size={22} color="#d48806" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 800, color: '#873800', fontSize: '0.9rem' }}>Age Distribution Risk</div>
                  <div style={{ fontSize: '0.85rem', color: '#613400', marginTop: '2px' }}>
                    A notable proportion of bedside monitoring and general ward suction units are nearing the end of their recommended 5-to-7-year clinical service lifespan.
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#f0f9ff', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #bae6fd', display: 'flex', gap: '12px' }}>
                <ShieldCheck size={22} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 800, color: '#0369a1', fontSize: '0.9rem' }}>Tag & Inventory Synchronization Needed</div>
                  <div style={{ fontSize: '0.85rem', color: '#0c4a6e', marginTop: '2px' }}>
                    Multiple physical units require unified tag synchronization between the primary asset tag and department serial listings to eliminate drift during audits.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: 2026 Planned Preventive Maintenance (PPM) Analysis */}
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={20} color="#0284c7" /> 3. 2026 Planned Preventive Maintenance (PPM) Analysis
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.5rem', border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284c7', marginBottom: '8px' }}>Q1 (Jan - Mar)</div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>OT & Anesthesia Safety</li>
                  <li>Defibrillator Energy Verification</li>
                  <li>Critical UPS Load Testing</li>
                </ul>
              </div>

              <div className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.5rem', border: '1px solid #e2e8f0', borderLeft: '4px solid #16a34a', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#16a34a', marginBottom: '8px' }}>Q2 (Apr - Jun)</div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Lab & Centrifuge Overhaul</li>
                  <li>Ward Monitors & ECG Calibration</li>
                  <li>Dental Unit Systems Service</li>
                </ul>
              </div>

              <div className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.5rem', border: '1px solid #e2e8f0', borderLeft: '4px solid #d97706', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#d97706', marginBottom: '8px' }}>Q3 (Jul - Sep)</div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Diagnostic Imaging Inspection</li>
                  <li>Suction & Infusion Calibration</li>
                  <li>Network Rack Cleaning & Testing</li>
                </ul>
              </div>

              <div className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.5rem', border: '1px solid #e2e8f0', borderLeft: '4px solid #9333ea', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#9333ea', marginBottom: '8px' }}>Q4 (Oct - Dec)</div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Annual Electrical Run</li>
                  <li>Deep Battery Load Testing</li>
                  <li>2027 Schedule & Budget Planning</li>
                </ul>
              </div>
            </div>

            {/* Strategic Focus Areas */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Strategic PPM Focus Areas</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0284c7', fontSize: '0.85rem' }}>• Calibration & Electrical Safety</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>Strict leakage current testing, grounding continuity checks, and energy output verification on defibrillators & ESUs.</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0284c7', fontSize: '0.85rem' }}>• Vendor Service Contracts (AMC)</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>High-end imaging and diagnostic analyzers remain tied to SLA vendor visits; in-house bio-med staff shadow engineers.</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0284c7', fontSize: '0.85rem' }}>• Environmental Controls</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>Quarterly checks on server room HVAC, clean power redundancy (UPS runtime verification), and dust filtration.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Equipment Replacement Plan (2026) */}
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={20} color="#0284c7" /> 4. Equipment Replacement Plan (2026)
            </h3>
            
            <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '14px 18px', fontWeight: 800 }}>Equipment Description</th>
                    <th style={{ padding: '14px 18px', fontWeight: 800 }}>Department / Location</th>
                    <th style={{ padding: '14px 18px', fontWeight: 800 }}>Failure Mode / Justification</th>
                    <th style={{ padding: '14px 18px', fontWeight: 800 }}>Priority Tier</th>
                    <th style={{ padding: '14px 18px', fontWeight: 800 }}>Replacement Strategy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>Legacy Patient Monitors</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>Wards / Emergency / OT</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>End of useful life; failing NIBP pumps; aging displays</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#fef2f2', color: '#991b1b' }}>High Priority</span>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#334155' }}>Phased swap to modular digital multi-parameter units</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>Surgical Suction Pumps</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>Operating Theaters / OPD</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>Worn seals, intermittent vacuum levels, high noise floor</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#fef2f2', color: '#991b1b' }}>High Priority</span>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#334155' }}>Heavy-duty mobile twin-bottle clinical units</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>Centrifuges & Rotors</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>Central Laboratory</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>Motor brush wear, vibration balance degradation</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#fff7ed', color: '#c2410c' }}>Medium Priority</span>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#334155' }}>Brushless digital benchtop centrifuges</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>Core Network Switches / UPS</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>Server Infrastructure</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>Out of firmware support, depleted internal battery strings</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#fef2f2', color: '#991b1b' }}>High Priority</span>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#334155' }}>Managed Gigabit PoE+ switches & line-interactive UPS</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>Dental Compressors / Units</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>Dental Clinic</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>Moisture accumulation, pressure valve degradation</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#fff7ed', color: '#c2410c' }}>Medium Priority</span>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#334155' }}>Medical-grade oil-free silent compressors</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 5: Strategic Recommendations */}
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="#0284c7" /> 5. Strategic Recommendations
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              <div className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <CheckCircle2 size={20} color="#16a34a" />
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>Unify Inventory Barcoding</div>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
                  Re-tag legacy equipment identified during PPM to align serial numbers across the Master Asset Register and the Replacement Plan sheets.
                </p>
              </div>

              <div className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <CheckCircle2 size={20} color="#16a34a" />
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>Phase Capital Procurement</div>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
                  Divide the 2026 budget into two procurement waves: Wave 1 (Q1/Q2) for critical OT/Emergency medical devices and IT core switches; Wave 2 (Q3/Q4) for lab and OPD units.
                </p>
              </div>

              <div className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <CheckCircle2 size={20} color="#16a34a" />
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>PPM Sign-off Automation</div>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
                  Shift departmental PPM checklists from paper/manual spreadsheets into a shared verification workflow so heads of department digitally acknowledge maintenance completion.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD ASSET */}
      {isAssetModal && (
        <Modal isOpen={true} title="Register New Clinic Asset" onClose={() => setIsAssetModal(false)}>
          <form onSubmit={handleAssetSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Asset Tag (Barcode/QR)</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="AST-MED-003"
                  value={assetForm.asset_tag}
                  onChange={(e) => setAssetForm({ ...assetForm, asset_tag: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Serial Number</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="SN-123456"
                  value={assetForm.serial_number}
                  onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Equipment Name & Model</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                placeholder="Patient Monitor 5-Para"
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Purchase Cost (RWF)</label>
                <input
                  type="number"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="2500000"
                  value={assetForm.purchase_cost}
                  onChange={(e) => setAssetForm({ ...assetForm, purchase_cost: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Expected Lifespan (Years)</label>
                <input
                  type="number"
                  className="input"
                  style={{ width: '100%' }}
                  value={assetForm.expected_lifespan_years}
                  onChange={(e) => setAssetForm({ ...assetForm, expected_lifespan_years: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAssetModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>Register Asset</button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: TRANSFER */}
      {isTransferModal && (
        <Modal isOpen={true} title="Equipment Transfer Form" onClose={() => setIsTransferModal(false)}>
          <form onSubmit={handleTransferSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Select Asset</label>
              <select className="input" style={{ width: '100%' }} value={transferForm.asset_id} onChange={(e) => setTransferForm({ ...transferForm, asset_id: e.target.value })} required>
                <option value="">-- Select Asset --</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.asset_tag} - {a.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>From Department</label>
                <input type="text" className="input" style={{ width: '100%' }} value={transferForm.from_dept} onChange={(e) => setTransferForm({ ...transferForm, from_dept: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>To Department</label>
                <input type="text" className="input" style={{ width: '100%' }} value={transferForm.to_dept} onChange={(e) => setTransferForm({ ...transferForm, to_dept: e.target.value })} required />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsTransferModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>Submit Transfer Request</button>
            </div>
          </form>
        </Modal>
      )}
      {/* MODAL: SCHEDULE PPM */}
      {isPpmModal && (
        <Modal isOpen={true} title="Schedule Preventive Maintenance Work Order" onClose={() => setIsPpmModal(false)}>
          <form onSubmit={handlePpmSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Select Asset</label>
              <select className="input" style={{ width: '100%' }} value={ppmForm.asset_id} onChange={(e) => setPpmForm({ ...ppmForm, asset_id: e.target.value })} required>
                <option value="">-- Select Asset --</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.asset_tag} — {a.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Maintenance Type</label>
                <select className="input" style={{ width: '100%' }} value={ppmForm.maintenance_type} onChange={(e) => setPpmForm({ ...ppmForm, maintenance_type: e.target.value })}>
                  <option value="Preventive Quarterly">Preventive – Quarterly</option>
                  <option value="Preventive Biannual">Preventive – Biannual</option>
                  <option value="Preventive Annual">Preventive – Annual</option>
                  <option value="Calibration">Calibration</option>
                  <option value="Corrective">Corrective</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Scheduled Date</label>
                <input type="date" className="input" style={{ width: '100%' }} value={ppmForm.scheduled_date} onChange={(e) => setPpmForm({ ...ppmForm, scheduled_date: e.target.value })} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Technician Name</label>
                <input type="text" className="input" style={{ width: '100%' }} value={ppmForm.technician} onChange={(e) => setPpmForm({ ...ppmForm, technician: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Estimated Cost (RWF)</label>
                <input type="number" className="input" style={{ width: '100%' }} value={ppmForm.cost} onChange={(e) => setPpmForm({ ...ppmForm, cost: e.target.value })} />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Findings / Work Description</label>
              <textarea className="input" style={{ width: '100%', height: '70px' }} value={ppmForm.findings} onChange={(e) => setPpmForm({ ...ppmForm, findings: e.target.value })} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsPpmModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>Schedule PPM Work Order</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AssetManagement;
