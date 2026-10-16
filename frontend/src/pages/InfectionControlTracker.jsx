import { useState, useEffect, useCallback } from 'react';
import {
  Activity, CheckCircle, AlertTriangle, Syringe,
  Droplets, ShieldCheck, Bug, Search, UserCheck,
  Plus, RefreshCw, X, Check, Loader2, ChevronDown,
  ChevronUp, FileText, ClipboardList, ShieldAlert,
  AlertOctagon, CheckCircle2, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getInfectionStats,
  getInfectionCases,
  createInfectionCase,
  updateInfectionCaseStatus,
  getHygieneAudits,
  createHygieneAudit
} from '../api/safety';
import toast from 'react-hot-toast';

const DEPARTMENTS = [
  'Surgery', 'ICU', 'Dialysis', 'Inpatient Ward A',
  'Inpatient Ward B', 'CSSD', 'Laboratory', 'Emergency',
  'Endoscopy', 'Outpatient'
];

const INFECTION_TYPES = [
  'Surgical Site Infection (SSI)',
  'Catheter-Associated UTI (CAUTI)',
  'Central Line-Associated BSI (CLABSI)',
  'Ventilator-Associated Pneumonia (VAP)',
  'Clostridioides difficile Infection',
  'MRSA Colonization / Infection',
  'Post-Procedure Sepsis',
  'Other Nosocomial Infection'
];

const getSeverityBadge = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', label: 'Critical' };
    case 'high':
      return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'High' };
    case 'medium':
      return { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', label: 'Medium' };
    default:
      return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'Low' };
  }
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'Resolved':
      return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', icon: CheckCircle };
    case 'Confirmed':
      return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', icon: AlertOctagon };
    default:
      return { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa', icon: Activity };
  }
};

const InfectionControlTracker = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('cases'); // 'cases' | 'audits' | 'advisories'

  // Live Data State
  const [stats, setStats] = useState({
    haisThisMonth: 0,
    handHygiene: 94,
    sterilizationFails: 0,
    activeOutbreaks: 0
  });
  const [cases, setCases] = useState([]);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [caseStatusFilter, setCaseStatusFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedCaseId, setExpandedCaseId] = useState(null);
  const [expandedAuditId, setExpandedAuditId] = useState(null);

  // Modals
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [updatingCase, setUpdatingCase] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [caseFormData, setCaseFormData] = useState({
    infection_type: INFECTION_TYPES[0],
    department: 'Surgery',
    patient_identifier: '',
    severity: 'Medium',
    date: new Date().toISOString().split('T')[0],
    investigation_notes: '',
    corrective_actions: ''
  });

  const [auditFormData, setAuditFormData] = useState({
    department: 'Surgery',
    compliance_score: 95,
    total_opportunities: 30,
    missed_opportunities: 1,
    sterilization_passed: true,
    observations: '',
    corrective_actions: '',
    audit_date: new Date().toISOString().split('T')[0]
  });

  const [updateCaseData, setUpdateCaseData] = useState({
    status: 'Under Investigation',
    investigation_notes: '',
    corrective_actions: ''
  });

  // Fetch Stats & Cases & Audits
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, casesRes, auditsRes] = await Promise.all([
        getInfectionStats().catch(() => ({ data: { success: false } })),
        getInfectionCases({
          status: caseStatusFilter !== 'All' ? caseStatusFilter : undefined,
          department: departmentFilter !== 'All' ? departmentFilter : undefined,
          search: search.trim() || undefined
        }).catch(() => ({ data: { success: false } })),
        getHygieneAudits().catch(() => ({ data: { success: false } }))
      ]);

      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
      if (casesRes.data?.success) {
        setCases(casesRes.data.data || []);
      }
      if (auditsRes.data?.success) {
        setAudits(auditsRes.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching infection control data:', err);
      toast.error('Failed to load live infection tracker data.');
    } finally {
      setLoading(false);
    }
  }, [caseStatusFilter, departmentFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Case Creation
  const handleCreateCase = async (e) => {
    e.preventDefault();
    if (!caseFormData.infection_type || !caseFormData.department) {
      toast.error('Infection type and department are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createInfectionCase(caseFormData);
      if (res.data?.success) {
        toast.success(`Infection case ${res.data.data.case_code || ''} reported successfully!`);
        setIsCaseModalOpen(false);
        setCaseFormData({
          infection_type: INFECTION_TYPES[0],
          department: 'Surgery',
          patient_identifier: '',
          severity: 'Medium',
          date: new Date().toISOString().split('T')[0],
          investigation_notes: '',
          corrective_actions: ''
        });
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit infection report.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Audit Creation
  const handleCreateAudit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...auditFormData,
        compliance_score: parseFloat(auditFormData.compliance_score),
        total_opportunities: parseInt(auditFormData.total_opportunities, 10) || 0,
        missed_opportunities: parseInt(auditFormData.missed_opportunities, 10) || 0,
        sterilization_passed: Boolean(auditFormData.sterilization_passed)
      };
      const res = await createHygieneAudit(payload);
      if (res.data?.success) {
        toast.success(`Hygiene Audit ${res.data.data.audit_code || ''} logged successfully!`);
        setIsAuditModalOpen(false);
        setAuditFormData({
          department: 'Surgery',
          compliance_score: 95,
          total_opportunities: 30,
          missed_opportunities: 1,
          sterilization_passed: true,
          observations: '',
          corrective_actions: '',
          audit_date: new Date().toISOString().split('T')[0]
        });
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log hygiene audit.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Case Status Update
  const handleUpdateCaseStatus = async (e) => {
    e.preventDefault();
    if (!updatingCase) return;
    setSubmitting(true);
    try {
      const res = await updateInfectionCaseStatus(updatingCase.id, updateCaseData);
      if (res.data?.success) {
        toast.success(`Case ${updatingCase.case_code} status updated to ${updateCaseData.status}.`);
        setUpdatingCase(null);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update infection case.');
    } finally {
      setSubmitting(false);
    }
  };

  const openStatusModal = (item) => {
    setUpdatingCase(item);
    setUpdateCaseData({
      status: item.status || 'Under Investigation',
      investigation_notes: item.investigation_notes || '',
      corrective_actions: item.corrective_actions || ''
    });
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Safety & Health Governance</p>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity size={32} style={{ color: 'var(--primary)' }} /> Infection Control & HAI Tracker
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={fetchData} 
            disabled={loading}
            style={{ padding: '0.75rem 1rem', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button 
            onClick={() => setIsAuditModalOpen(true)}
            style={{ padding: '0.75rem 1.25rem', backgroundColor: '#f8fafc', color: 'var(--primary-dark)', border: '1.5px solid var(--primary)', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <UserCheck size={18} style={{ color: 'var(--primary)' }} /> Log Hygiene Audit
          </button>
          <button 
            onClick={() => setIsCaseModalOpen(true)}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary-dark)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,59,68,0.2)' }}
          >
            <Plus size={20} /> Report HAI Case
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* HAIs This Month */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: '#fef2f2', color: '#b91c1c' }}><Bug size={24} /></div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#b91c1c', backgroundColor: '#fef2f2', padding: '4px 10px', borderRadius: '99px' }}>Target: 0</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>HAIs THIS MONTH</p>
          <p style={{ margin: '4px 0 0', fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{stats.haisThisMonth}</p>
        </div>

        {/* Hand Hygiene */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: '#f0fdf4', color: '#16a34a' }}><Droplets size={24} /></div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#16a34a', backgroundColor: '#f0fdf4', padding: '4px 10px', borderRadius: '99px' }}>Target: &gt;95%</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>HAND HYGIENE COMPLIANCE</p>
          <p style={{ margin: '4px 0 0', fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{stats.handHygiene}%</p>
          <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '99px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(stats.handHygiene, 100)}%`, height: '100%', backgroundColor: stats.handHygiene >= 95 ? '#16a34a' : stats.handHygiene >= 85 ? '#ea580c' : '#dc2626', borderRadius: '99px', transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Sterilization Failures */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: stats.sterilizationFails > 0 ? '#fff7ed' : '#f0fdf4', color: stats.sterilizationFails > 0 ? '#ea580c' : '#16a34a' }}><Syringe size={24} /></div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: stats.sterilizationFails > 0 ? '#ea580c' : '#16a34a', backgroundColor: stats.sterilizationFails > 0 ? '#fff7ed' : '#f0fdf4', padding: '4px 10px', borderRadius: '99px' }}>
              {stats.sterilizationFails > 0 ? 'Review req.' : 'Optimal'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>STERILIZATION FAILURES</p>
          <p style={{ margin: '4px 0 0', fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{stats.sterilizationFails}</p>
        </div>

        {/* Active Under Investigation */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: '#faf5ff', color: '#7c3aed' }}><ShieldAlert size={24} /></div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#7c3aed', backgroundColor: '#faf5ff', padding: '4px 10px', borderRadius: '99px' }}>Surveillance</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>ACTIVE INVESTIGATIONS</p>
          <p style={{ margin: '4px 0 0', fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{stats.activeOutbreaks}</p>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('cases')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: 'none',
            fontSize: '0.95rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: activeTab === 'cases' ? 'var(--primary-dark)' : '#64748b',
            borderBottom: activeTab === 'cases' ? '3px solid var(--primary)' : '3px solid transparent',
            marginBottom: '-0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Bug size={18} /> Reported HAIs & Infections ({cases.length})
        </button>
        <button
          onClick={() => setActiveTab('audits')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: 'none',
            fontSize: '0.95rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: activeTab === 'audits' ? 'var(--primary-dark)' : '#64748b',
            borderBottom: activeTab === 'audits' ? '3px solid var(--primary)' : '3px solid transparent',
            marginBottom: '-0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <ClipboardList size={18} /> Hygiene & Sterilization Audits ({audits.length})
        </button>
        <button
          onClick={() => setActiveTab('advisories')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: 'none',
            fontSize: '0.95rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: activeTab === 'advisories' ? 'var(--primary-dark)' : '#64748b',
            borderBottom: activeTab === 'advisories' ? '3px solid var(--primary)' : '3px solid transparent',
            marginBottom: '-0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <AlertTriangle size={18} /> Active Protocol Advisories
        </button>
      </div>

      {/* ── TAB 1: INFECTION & HAI CASES ── */}
      {activeTab === 'cases' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
          {/* Controls Bar */}
          <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', flexWrap: 'wrap', gap: '1rem' }}>
            {/* Status Pills */}
            <div style={{ display: 'flex', gap: '6px', background: '#e2e8f0', padding: '4px', borderRadius: '12px' }}>
              {['All', 'Under Investigation', 'Confirmed', 'Resolved'].map(st => (
                <button
                  key={st}
                  onClick={() => setCaseStatusFilter(st)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: caseStatusFilter === st ? '#ffffff' : 'transparent',
                    color: caseStatusFilter === st ? 'var(--primary-dark)' : '#64748b',
                    boxShadow: caseStatusFilter === st ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
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
                  placeholder="Search case code, type, dept..."
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

              {/* Department Dropdown */}
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)', backgroundColor: '#fff' }}
              >
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Cases List */}
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
              <p style={{ fontWeight: 600 }}>Loading infection cases...</p>
            </div>
          ) : cases.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
              <ShieldCheck size={48} style={{ margin: '0 auto 1rem', color: '#10b981', opacity: 0.7 }} />
              <p style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary-dark)' }}>No infection cases found</p>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>All departments are currently adhering to HAI prevention thresholds.</p>
            </div>
          ) : (
            <div>
              {cases.map(item => {
                const sevBadge = getSeverityBadge(item.severity);
                const stBadge = getStatusBadge(item.status);
                const StatusIcon = stBadge.icon;
                const isExpanded = expandedCaseId === item.id;

                return (
                  <div key={item.id} style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', backgroundColor: 'rgba(0,123,138,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                            {item.case_code}
                          </span>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, backgroundColor: sevBadge.bg, color: sevBadge.color, border: `1px solid ${sevBadge.border}` }}>
                            {sevBadge.label} Severity
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Detected on {item.date}</span>
                        </div>
                        <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                          {item.infection_type}
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                          Department: <strong style={{ color: '#334155' }}>{item.department}</strong>
                          {item.patient_identifier && <> • Patient Ref: <strong style={{ color: '#334155' }}>{item.patient_identifier}</strong></>}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '99px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          backgroundColor: stBadge.bg,
                          color: stBadge.color,
                          border: `1px solid ${stBadge.border}`
                        }}>
                          <StatusIcon size={14} /> {item.status}
                        </span>

                        <button
                          onClick={() => openStatusModal(item)}
                          style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: 'var(--primary-dark)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Update Status
                        </button>

                        {(item.investigation_notes || item.corrective_actions) && (
                          <button
                            onClick={() => setExpandedCaseId(isExpanded ? null : item.id)}
                            style={{ border: 'none', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }}
                          >
                            <FileText size={13} /> {isExpanded ? 'Hide' : 'Details'}
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Details */}
                    {isExpanded && (
                      <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Investigation Findings:</strong>
                          <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', whiteSpace: 'pre-wrap' }}>{item.investigation_notes || 'No investigation notes recorded.'}</p>
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Corrective & Containment Actions:</strong>
                          <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', whiteSpace: 'pre-wrap' }}>{item.corrective_actions || 'No corrective actions specified.'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: HYGIENE & STERILIZATION AUDITS ── */}
      {activeTab === 'audits' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ClipboardList size={20} style={{ color: 'var(--primary)' }} /> Hygiene Surveillance & Sterilization Verification Log
            </h2>
            <button
              onClick={() => setIsAuditModalOpen(true)}
              style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--primary-dark)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <Plus size={16} /> New Audit
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
                <p style={{ fontWeight: 600 }}>Loading hygiene audits...</p>
              </div>
            ) : audits.length === 0 ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
                <CheckCircle2 size={48} style={{ margin: '0 auto 1rem', color: '#10b981', opacity: 0.7 }} />
                <p style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary-dark)' }}>No hygiene audits recorded yet</p>
                <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Click "New Audit" or "Log Hygiene Audit" to record hand compliance or autoclave testing.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', backgroundColor: '#fafafa' }}>
                    <th style={{ padding: '1rem 2rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Audit Code & Date</th>
                    <th style={{ padding: '1rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Department</th>
                    <th style={{ padding: '1rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Auditor</th>
                    <th style={{ padding: '1rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Compliance %</th>
                    <th style={{ padding: '1rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Opportunities</th>
                    <th style={{ padding: '1rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Sterilization</th>
                    <th style={{ padding: '1rem 2rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map(audit => {
                    const isExpanded = expandedAuditId === audit.id;
                    const score = Number(audit.compliance_score || 0);
                    const scoreColor = score >= 95 ? '#16a34a' : score >= 85 ? '#ea580c' : '#dc2626';
                    const scoreBg = score >= 95 ? '#f0fdf4' : score >= 85 ? '#fff7ed' : '#fef2f2';

                    return (
                      <tr key={audit.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '1.1rem 2rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', backgroundColor: 'rgba(0,123,138,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                            {audit.audit_code}
                          </span>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>{audit.audit_date}</div>
                        </td>
                        <td style={{ padding: '1.1rem 1rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{audit.department}</td>
                        <td style={{ padding: '1.1rem 1rem', fontSize: '0.85rem', color: '#475569' }}>{audit.auditor_name}</td>
                        <td style={{ padding: '1.1rem 1rem' }}>
                          <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 800, backgroundColor: scoreBg, color: scoreColor }}>
                            {score}%
                          </span>
                        </td>
                        <td style={{ padding: '1.1rem 1rem', fontSize: '0.85rem', color: '#475569' }}>
                          <strong>{audit.total_opportunities - audit.missed_opportunities}</strong> / {audit.total_opportunities}
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>({audit.missed_opportunities} missed)</span>
                        </td>
                        <td style={{ padding: '1.1rem 1rem' }}>
                          {audit.sterilization_passed === 1 || audit.sterilization_passed === true ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                              <CheckCircle size={12} /> Passed
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                              <AlertOctagon size={12} /> Failed Indicator
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1.1rem 2rem', textAlign: 'right' }}>
                          <button
                            onClick={() => setExpandedAuditId(isExpanded ? null : audit.id)}
                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            {isExpanded ? 'Hide Notes' : 'View Notes'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: ACTIVE PROTOCOLS & GUIDELINES ── */}
      {activeTab === 'advisories' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Autoclave Alert */}
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#fff7ed', color: '#ea580c' }}><AlertTriangle size={20} /></div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Autoclave Maintenance Required</h3>
            </div>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
              Central Sterilization Unit B failed biological indicator testing (Geobacillus stearothermophilus). Unit is quarantined. Switched to backup sterilizer Unit A.
            </p>
            <div style={{ padding: '10px 14px', backgroundColor: '#fff7ed', borderRadius: '10px', borderLeft: '4px solid #ea580c', fontSize: '0.8rem', color: '#9a3412', fontWeight: 600 }}>
              Action: Engineering work order #ENG-4892 logged for valve gasket replacement.
            </div>
          </div>

          {/* Environmental Swab Protocol */}
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#f0fdf4', color: '#16a34a' }}><ShieldCheck size={20} /></div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Ward C Deep Clean Protocol</h3>
            </div>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
              Scheduled environmental surface swabbing in Inpatient Ward C returned zero pathogenic colonies (clean bill). Terminal cleaning with vaporized hydrogen peroxide verified.
            </p>
            <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', borderRadius: '10px', borderLeft: '4px solid #16a34a', fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
              Status: Room clearance signed off by Quality & Accreditation Officer.
            </div>
          </div>

          {/* 5 Moments of Hand Hygiene */}
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb' }}><Droplets size={20} /></div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>WHO 5 Moments for Hand Hygiene</h3>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
              <li><strong>Moment 1:</strong> Before touching a patient</li>
              <li><strong>Moment 2:</strong> Before clean/aseptic procedures</li>
              <li><strong>Moment 3:</strong> After body fluid exposure risk</li>
              <li><strong>Moment 4:</strong> After touching a patient</li>
              <li><strong>Moment 5:</strong> After touching patient surroundings</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── MODAL 1: REPORT INFECTION / HAI CASE ── */}
      {isCaseModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '640px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 2rem', background: 'var(--primary-dark)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bug size={20} /> Report HAI / Infection Incident
              </h2>
              <button onClick={() => setIsCaseModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateCase} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '80vh', overflowY: 'auto' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>INFECTION TYPE *</label>
                <select
                  required
                  value={caseFormData.infection_type}
                  onChange={e => setCaseFormData({ ...caseFormData, infection_type: e.target.value })}
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem', backgroundColor: '#fff' }}
                >
                  {INFECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>DEPARTMENT *</label>
                  <select
                    required
                    value={caseFormData.department}
                    onChange={e => setCaseFormData({ ...caseFormData, department: e.target.value })}
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem', backgroundColor: '#fff' }}
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>SEVERITY LEVEL</label>
                  <select
                    value={caseFormData.severity}
                    onChange={e => setCaseFormData({ ...caseFormData, severity: e.target.value })}
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem', backgroundColor: '#fff' }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>PATIENT IDENTIFIER / MRN</label>
                  <input
                    placeholder="e.g. MRN-99824 or Bed 4"
                    value={caseFormData.patient_identifier}
                    onChange={e => setCaseFormData({ ...caseFormData, patient_identifier: e.target.value })}
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>DETECTION DATE</label>
                  <input
                    type="date"
                    value={caseFormData.date}
                    onChange={e => setCaseFormData({ ...caseFormData, date: e.target.value })}
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>CLINICAL / INVESTIGATION FINDINGS</label>
                <textarea
                  rows="3"
                  value={caseFormData.investigation_notes}
                  onChange={e => setCaseFormData({ ...caseFormData, investigation_notes: e.target.value })}
                  placeholder="Describe initial presentation, culture results (e.g. Pseudomonas aeruginosa), invasive lines involved..."
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>IMMEDIATE CORRECTIVE & CONTAINMENT ACTIONS</label>
                <textarea
                  rows="3"
                  value={caseFormData.corrective_actions}
                  onChange={e => setCaseFormData({ ...caseFormData, corrective_actions: e.target.value })}
                  placeholder="Contact precautions instituted, catheter removed, targeted antimicrobial therapy initiated..."
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCaseModalOpen(false)}
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
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Bug size={16} />}
                  Submit Case Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: LOG HYGIENE AUDIT ── */}
      {isAuditModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '640px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 2rem', background: '#003b44', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserCheck size={20} /> Log Hygiene & Sterilization Audit
              </h2>
              <button onClick={() => setIsAuditModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateAudit} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>AUDITED DEPARTMENT *</label>
                  <select
                    required
                    value={auditFormData.department}
                    onChange={e => setAuditFormData({ ...auditFormData, department: e.target.value })}
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem', backgroundColor: '#fff' }}
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>AUDIT DATE</label>
                  <input
                    type="date"
                    value={auditFormData.audit_date}
                    onChange={e => setAuditFormData({ ...auditFormData, audit_date: e.target.value })}
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                  />
                </div>
              </div>

              {/* Opportunities & Score */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>TOTAL OPPORTUNITIES</label>
                  <input
                    type="number"
                    min="1"
                    value={auditFormData.total_opportunities}
                    onChange={e => {
                      const total = parseInt(e.target.value, 10) || 1;
                      const missed = parseInt(auditFormData.missed_opportunities, 10) || 0;
                      const score = Math.max(0, Math.min(100, Math.round(((total - missed) / total) * 100)));
                      setAuditFormData({ ...auditFormData, total_opportunities: total, compliance_score: score });
                    }}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>MISSED OPPORTUNITIES</label>
                  <input
                    type="number"
                    min="0"
                    value={auditFormData.missed_opportunities}
                    onChange={e => {
                      const missed = parseInt(e.target.value, 10) || 0;
                      const total = parseInt(auditFormData.total_opportunities, 10) || 1;
                      const score = Math.max(0, Math.min(100, Math.round(((total - missed) / total) * 100)));
                      setAuditFormData({ ...auditFormData, missed_opportunities: missed, compliance_score: score });
                    }}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>CALCULATED SCORE %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={auditFormData.compliance_score}
                    onChange={e => setAuditFormData({ ...auditFormData, compliance_score: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary-dark)' }}
                  />
                </div>
              </div>

              {/* Sterilization Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
                <input
                  type="checkbox"
                  id="sterilization_check"
                  checked={auditFormData.sterilization_passed}
                  onChange={e => setAuditFormData({ ...auditFormData, sterilization_passed: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="sterilization_check" style={{ fontSize: '0.88rem', fontWeight: 700, color: '#166534', cursor: 'pointer' }}>
                  Sterilization Indicator Test Passed (Autoclaves & Chemical Integrators Validated)
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>SURVEILLANCE OBSERVATIONS</label>
                <textarea
                  rows="3"
                  value={auditFormData.observations}
                  onChange={e => setAuditFormData({ ...auditFormData, observations: e.target.value })}
                  placeholder="Record dispenser accessibility, PPE glove/gown adherence, hand rub volume..."
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>CORRECTIVE RECOMMENDATIONS</label>
                <textarea
                  rows="2"
                  value={auditFormData.corrective_actions}
                  onChange={e => setAuditFormData({ ...auditFormData, corrective_actions: e.target.value })}
                  placeholder="Install additional wall-mounted dispensers, refresher training for nursing staff..."
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(false)}
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
                  Save Hygiene Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: UPDATE CASE STATUS ── */}
      {updatingCase && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '540px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.75rem', background: '#003b44', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Update Case {updatingCase.case_code}</h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>{updatingCase.infection_type}</p>
              </div>
              <button onClick={() => setUpdatingCase(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateCaseStatus} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>CASE STATUS</label>
                <select
                  value={updateCaseData.status}
                  onChange={e => setUpdateCaseData({ ...updateCaseData, status: e.target.value })}
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem', backgroundColor: '#fff', fontWeight: 600 }}
                >
                  <option value="Under Investigation">Under Investigation</option>
                  <option value="Confirmed">Confirmed HAI</option>
                  <option value="Resolved">Resolved / Closed</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>INVESTIGATION NOTES</label>
                <textarea
                  rows="3"
                  value={updateCaseData.investigation_notes}
                  onChange={e => setUpdateCaseData({ ...updateCaseData, investigation_notes: e.target.value })}
                  placeholder="Record root cause analysis, organism sensitivities, or epidemiological findings..."
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>CORRECTIVE & MITIGATION ACTIONS</label>
                <textarea
                  rows="3"
                  value={updateCaseData.corrective_actions}
                  onChange={e => setUpdateCaseData({ ...updateCaseData, corrective_actions: e.target.value })}
                  placeholder="Record patient resolution, terminal decontamination, staff debrief..."
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setUpdatingCase(null)}
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
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfectionControlTracker;
