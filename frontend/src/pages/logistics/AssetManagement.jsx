import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Wrench, ShieldCheck, Plus, ArrowRightLeft, Calendar, DollarSign, Tag, CheckCircle } from 'lucide-react';
import Modal from '../../components/Modal';

const AssetManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('register'); // 'register', 'transfers', 'ppm', 'capex'
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
    from_dept: 'CLINIC',
    to_dept: 'RADIOLOGY',
    notes: 'Inter-departmental handover'
  });

  const [ppmForm, setPpmForm] = useState({
    asset_id: '',
    maintenance_type: 'Preventive Quarterly',
    scheduled_date: new Date().toISOString().split('T')[0],
    technician: 'Biomedical Engineer',
    findings: 'Routine calibration and filter service.',
    cost: '50000'
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
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', gap: '1rem' }}>
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
          <DollarSign size={16} /> 5-Year Capital Replacement Engine
        </button>
      </div>

      {/* MASTER REGISTER TAB */}
      {activeTab === 'register' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
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
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
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
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
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
                <div key={a.id} className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
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

      {/* MODAL: ADD ASSET */}
      {isAssetModal && (
        <Modal title="Register New Clinic Asset" onClose={() => setIsAssetModal(false)}>
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
        <Modal title="Equipment Transfer Form" onClose={() => setIsTransferModal(false)}>
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
    </div>
  );
};

export default AssetManagement;
