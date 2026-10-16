import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, Plus, Shield, ShieldCheck,
  AlertOctagon, X, Search, Filter,
  Activity, CheckCircle2, Trash2, Edit3, Loader2,
  RefreshCw, ChevronDown, ChevronUp, FileText, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRisks, createRisk, updateRiskStatus, deleteRisk } from '../api/safety';
import toast from 'react-hot-toast';

const CATEGORIES = ['Clinical', 'Operational', 'IT & Security', 'Financial', 'Supply Chain', 'Compliance'];

const getRiskLevel = (likelihood, impact) => {
  const score = likelihood * impact;
  if (score >= 15) return { label: 'Critical', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' };
  if (score >= 10) return { label: 'High', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' };
  if (score >= 5) return { label: 'Medium', color: '#b45309', bg: '#fefce8', border: '#fef08a' };
  return { label: 'Low', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' };
};

const RiskRegister = () => {
  const { user } = useAuth();
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Mitigated' | 'Closed'
  const [search, setSearch] = useState('');
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedRiskId, setExpandedRiskId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '', category: 'Clinical', likelihood: 3, impact: 3, owner: '', mitigation: ''
  });

  const [editFormData, setEditFormData] = useState({
    status: 'Active', mitigation: ''
  });

  const fetchRisks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'All') params.category = filter;
      if (statusFilter !== 'All') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const res = await getRisks(params);
      if (res.data?.success) {
        setRisks(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load risks:', err);
      toast.error('Failed to fetch risk register.');
    } finally {
      setLoading(false);
    }
  }, [filter, statusFilter, search]);

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.owner.trim()) {
      toast.error('Please enter risk title and owner.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createRisk(formData);
      if (res.data?.success) {
        toast.success(`Risk ${res.data.data.risk_code || ''} logged successfully!`);
        setIsCreateModalOpen(false);
        setFormData({ title: '', category: 'Clinical', likelihood: 3, impact: 3, owner: '', mitigation: '' });
        fetchRisks();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register risk.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!editingRisk) return;
    setSubmitting(true);
    try {
      const res = await updateRiskStatus(editingRisk.id, editFormData);
      if (res.data?.success) {
        toast.success(`Risk ${editingRisk.risk_code} updated.`);
        setEditingRisk(null);
        fetchRisks();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update risk.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (risk) => {
    if (!window.confirm(`Are you sure you want to delete risk ${risk.risk_code}: "${risk.title}"?`)) return;
    try {
      await deleteRisk(risk.id);
      toast.success(`Risk ${risk.risk_code} deleted.`);
      fetchRisks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete risk.');
    }
  };

  const openEditModal = (risk) => {
    setEditingRisk(risk);
    setEditFormData({
      status: risk.status || 'Active',
      mitigation: risk.mitigation || ''
    });
  };

  const activeRisksCount = risks.filter(r => r.status === 'Active').length;
  const criticalRisksCount = risks.filter(r => (r.likelihood * r.impact) >= 15 && r.status === 'Active').length;
  const mitigatedCount = risks.filter(r => r.status === 'Mitigated').length;

  const currentLevelPreview = getRiskLevel(formData.likelihood, formData.impact);

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Safety & Health Governance</p>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldAlert size={32} style={{ color: 'var(--primary)' }} /> Enterprise Risk Register
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={fetchRisks} 
            disabled={loading}
            style={{ padding: '0.75rem 1rem', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)} 
            style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary-dark)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,59,68,0.2)' }}
          >
            <Plus size={20} /> Log New Risk
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f0f9ff', color: '#0369a1' }}><Activity size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>TOTAL ACTIVE RISKS</p>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{activeRisksCount}</p>
          </div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#fef2f2', color: '#b91c1c' }}><AlertOctagon size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>CRITICAL RISKS (L×I ≥ 15)</p>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#b91c1c' }}>{criticalRisksCount}</p>
          </div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f0fdf4', color: '#15803d' }}><ShieldCheck size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>CONTROLS MITIGATED</p>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#15803d' }}>{mitigatedCount}</p>
          </div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f8fafc', color: '#475569' }}><CheckCircle2 size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>CLOSED / RETIRED</p>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#475569' }}>{risks.filter(r => r.status === 'Closed').length}</p>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
        {/* Filters bar */}
        <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Status tabs */}
          <div style={{ display: 'flex', gap: '6px', background: '#e2e8f0', padding: '4px', borderRadius: '12px' }}>
            {['All', 'Active', 'Mitigated', 'Closed'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: statusFilter === st ? '#ffffff' : 'transparent',
                  color: statusFilter === st ? 'var(--primary-dark)' : '#64748b',
                  boxShadow: statusFilter === st ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {st}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search risks or owners..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '0.5rem 0.75rem 0.5rem 2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', width: '220px' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <select 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)', backgroundColor: '#fff' }}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
              <p style={{ fontWeight: 600 }}>Loading Enterprise Risk Register...</p>
            </div>
          ) : risks.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
              <ShieldCheck size={48} style={{ margin: '0 auto 1rem', color: '#10b981', opacity: 0.7 }} />
              <p style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary-dark)' }}>No risks match current filter</p>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Click "Log New Risk" to identify and track a clinical or operational hazard.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', backgroundColor: '#fafafa' }}>
                  <th style={{ padding: '1rem 2rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Risk ID & Title</th>
                  <th style={{ padding: '1rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Category</th>
                  <th style={{ padding: '1rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Score (L × I)</th>
                  <th style={{ padding: '1rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Level</th>
                  <th style={{ padding: '1rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Owner</th>
                  <th style={{ padding: '1rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '1rem 2rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {risks.map(risk => {
                  const level = getRiskLevel(risk.likelihood, risk.impact);
                  const isExpanded = expandedRiskId === risk.id;
                  return (
                    <tr key={risk.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }} className="hover:bg-slate-50/70">
                      <td style={{ padding: '1.1rem 2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', backgroundColor: 'rgba(0,123,138,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                            {risk.risk_code || `RSK-${risk.id}`}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{risk.date}</span>
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.95rem', marginTop: '4px' }}>
                          {risk.title}
                        </div>
                        {risk.mitigation && (
                          <button
                            onClick={() => setExpandedRiskId(isExpanded ? null : risk.id)}
                            style={{ border: 'none', background: 'none', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginTop: '4px', padding: 0 }}
                          >
                            <FileText size={12} /> {isExpanded ? 'Hide Mitigation Plan' : 'View Mitigation Strategy'}
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        )}
                        {isExpanded && risk.mitigation && (
                          <div style={{ marginTop: '8px', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#334155' }}>
                            <strong style={{ color: 'var(--primary-dark)', display: 'block', marginBottom: '2px' }}>Mitigation Controls:</strong>
                            {risk.mitigation}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1.1rem 1rem', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>{risk.category}</td>
                      <td style={{ padding: '1.1rem 1rem', fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                        {risk.likelihood * risk.impact} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>({risk.likelihood}×{risk.impact})</span>
                      </td>
                      <td style={{ padding: '1.1rem 1rem' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: level.bg, color: level.color, border: `1px solid ${level.border}` }}>
                          {level.label}
                        </span>
                      </td>
                      <td style={{ padding: '1.1rem 1rem', fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>{risk.owner}</td>
                      <td style={{ padding: '1.1rem 1rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '99px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          backgroundColor: risk.status === 'Active' ? '#fff7ed' : risk.status === 'Mitigated' ? '#f0fdf4' : '#f1f5f9',
                          color: risk.status === 'Active' ? '#ea580c' : risk.status === 'Mitigated' ? '#16a34a' : '#64748b',
                          border: `1px solid ${risk.status === 'Active' ? '#fed7aa' : risk.status === 'Mitigated' ? '#bbf7d0' : '#e2e8f0'}`
                        }}>
                          {risk.status === 'Active' ? <Activity size={12} /> : risk.status === 'Mitigated' ? <ShieldCheck size={12} /> : <CheckCircle2 size={12} />}
                          {risk.status}
                        </span>
                      </td>
                      <td style={{ padding: '1.1rem 2rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => openEditModal(risk)}
                            title="Update Status & Mitigation"
                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700 }}
                          >
                            <Edit3 size={13} /> Update
                          </button>
                          <button
                            onClick={() => handleDelete(risk)}
                            title="Delete Risk"
                            style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #fee2e2', backgroundColor: '#fff5f5', color: '#b91c1c', cursor: 'pointer' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Create Risk Modal ── */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '640px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 2rem', background: 'var(--primary-dark)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={20} /> Register Enterprise Risk
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '80vh', overflowY: 'auto' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>RISK TITLE / DESCRIPTION *</label>
                <input 
                  required 
                  value={formData.title} 
                  onChange={e => setFormData({ ...formData, title: e.target.value })} 
                  placeholder="e.g. Cold chain temperature excursion in central pharmacy..." 
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>CATEGORY *</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({ ...formData, category: e.target.value })} 
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem', backgroundColor: '#fff' }}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>ASSIGNED OWNER *</label>
                  <input 
                    required 
                    value={formData.owner} 
                    onChange={e => setFormData({ ...formData, owner: e.target.value })} 
                    placeholder="e.g. Pharmacy Manager, Lab Lead..." 
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} 
                  />
                </div>
              </div>

              {/* Matrix Slider & Live Preview */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Risk Rating Assessment:</span>
                  <span style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800, backgroundColor: currentLevelPreview.bg, color: currentLevelPreview.color, border: `1px solid ${currentLevelPreview.border}` }}>
                    Score: {formData.likelihood * formData.impact} — {currentLevelPreview.label} Level
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      LIKELIHOOD: <strong>{formData.likelihood} / 5</strong>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      value={formData.likelihood} 
                      onChange={e => setFormData({ ...formData, likelihood: e.target.value })} 
                      style={{ width: '100%' }} 
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      <span>Rare (1)</span><span>Frequent (5)</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      SEVERITY IMPACT: <strong>{formData.impact} / 5</strong>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      value={formData.impact} 
                      onChange={e => setFormData({ ...formData, impact: e.target.value })} 
                      style={{ width: '100%' }} 
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      <span>Negligible (1)</span><span>Critical (5)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>PLANNED MITIGATION / CONTROL MEASURES</label>
                <textarea 
                  rows="3" 
                  value={formData.mitigation} 
                  onChange={e => setFormData({ ...formData, mitigation: e.target.value })} 
                  placeholder="Detail preventative protocols, redundancy systems, or training to eliminate or mitigate this risk..." 
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontFamily: 'inherit' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)} 
                  disabled={submitting}
                  style={{ flex: 1, padding: '0.85rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{ flex: 2, padding: '0.85rem', backgroundColor: 'var(--primary-dark)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Register Risk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit / Status Modal ── */}
      {editingRisk && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '540px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.75rem', background: '#003b44', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Update Risk {editingRisk.risk_code}</h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>{editingRisk.title}</p>
              </div>
              <button onClick={() => setEditingRisk(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>STATUS</label>
                <select
                  value={editFormData.status}
                  onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem', backgroundColor: '#fff', fontWeight: 600 }}
                >
                  <option value="Active">Active (Ongoing Hazard / Monitored)</option>
                  <option value="Mitigated">Mitigated (Controls in Place)</option>
                  <option value="Closed">Closed (Risk Retired / Resolved)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>MITIGATION NOTES & UPDATES</label>
                <textarea
                  rows="4"
                  value={editFormData.mitigation}
                  onChange={e => setEditFormData({ ...editFormData, mitigation: e.target.value })}
                  placeholder="Record verification findings, action progress, or reasons for status change..."
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingRisk(null)}
                  disabled={submitting}
                  style={{ flex: 1, padding: '0.85rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 2, padding: '0.85rem', backgroundColor: 'var(--primary-dark)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Save Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskRegister;
