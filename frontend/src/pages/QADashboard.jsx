import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getIncidents } from '../api/incidents';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  AlertTriangle, CheckCircle, Clock, Eye,
  ShieldCheck, Brain, TrendingUp,
  Stethoscope, Monitor, Package, Users2, Layers,
  RefreshCw, ExternalLink, Zap,
} from 'lucide-react';

// ── Severity map from taxonomy ────────────────────────────────────────────────
const SEVERITY_RANGES = {
  'Near Miss': { label: 'Near Miss', color: '#f59e0b', bg: '#fffbeb' },
  'Adverse Event': { label: 'Adverse Event', color: '#ef4444', bg: '#fef2f2' },
  'Sentinel Event': { label: 'Sentinel Event', color: '#7c3aed', bg: '#faf5ff' },
  'Lost to Follow-up': { label: 'Other', color: '#64748b', bg: '#f8fafc' },
};

const DEPT_ICONS = {
  Clinical: <Stethoscope size={14} />,
  IT: <Monitor size={14} />,
  Logistics: <Package size={14} />,
  'Human Resources': <Users2 size={14} />,
  'Cross-Cutting': <Layers size={14} />,
};

const STATUS_STYLES = {
  pending: { color: '#92400e', bg: '#fffbeb', border: '#fde68a', label: 'Pending Review' },
  reviewed: { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', label: 'Reviewed' },
};

// ── Mini stat card ────────────────────────────────────────────────────────────
const QAStatCard = ({ title, value, icon, color, bg, sub }) => (
  <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
    <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: bg, color, flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
      <p style={{ margin: '4px 0 0', fontSize: '2rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>{sub}</p>}
    </div>
  </div>
);

// ── Horizontal bar ────────────────────────────────────────────────────────────
const HBar = ({ label, count, total, color, icon }) => {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
      <div style={{ width: '140px', fontSize: '0.78rem', color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        {icon && <span style={{ color }}>{icon}</span>}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </div>
      <div style={{ flex: 1, height: '10px', backgroundColor: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '99px', transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', minWidth: '32px', textAlign: 'right' }}>{count}</span>
    </div>
  );
};

// ── Incident type chip ────────────────────────────────────────────────────────
const TypeChip = ({ type, count, color, bg }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.9rem', backgroundColor: bg, borderRadius: '10px', border: `1px solid ${color}22` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>{type}</span>
    </div>
    <span style={{ fontSize: '0.85rem', fontWeight: 800, color }}>{count}</span>
  </div>
);

// ── Recent pending row ────────────────────────────────────────────────────────
const PendingRow = ({ incident, navigate, i }) => {
  const typeStyle = SEVERITY_RANGES[incident.incident_type] || { color: '#64748b', bg: '#f8fafc' };
  const daysAgo = Math.floor((Date.now() - new Date(incident.created_at)) / 86400000);
  return (
    <div onClick={() => navigate(`/incidents/${incident.id}`)}
      style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'center', padding: '0.9rem 1rem', borderBottom: i > 0 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <div>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
          {incident.department || 'Unknown Dept'} — {incident.area_of_incident || ''}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
          By {incident.creator_name || 'Unknown'} · {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
        </p>
      </div>
      <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: typeStyle.bg, color: typeStyle.color, whiteSpace: 'nowrap' }}>
        {incident.incident_type}
      </span>
      <ExternalLink size={14} style={{ color: '#94a3b8' }} />
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
const QADashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getIncidents();
      setIncidents(res?.data?.data || []);
      setLastFetch(new Date());
    } catch (e) {
      console.error('QA Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  const total = incidents.length;
  const pending = incidents.filter(i => i.status === 'pending');
  const reviewed = incidents.filter(i => i.status === 'reviewed');
  const thisMonth = incidents.filter(i => {
    const d = new Date(i.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  // ── Incident type breakdown ──────────────────────────────────────────────
  // ── Incident type breakdown ─────────────────────────────────────────────────
  const byType = {};
  for (const inc of incidents) {
    const t = inc.incident_type || 'Unknown';
    byType[t] = (byType[t] || 0) + 1;
  }
  const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const TYPE_COLORS = ['#ef4444', '#f59e0b', '#7c3aed', '#3b82f6', '#22c55e', '#ec4899', '#14b8a6', '#f97316'];

  // ── Department breakdown ─────────────────────────────────────────────────
  const byDept = {};
  for (const inc of incidents) {
    const d = inc.department || 'Unknown';
    byDept[d] = (byDept[d] || 0) + 1;
  }
  const deptEntries = Object.entries(byDept).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const DEPT_COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed', '#db2777'];

  // ── Pending review queue (most recent first, max 8) ──────────────────────
  const pendingQueue = [...pending]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8);

  // ── Review rate ──────────────────────────────────────────────────────────
  const reviewRate = total ? Math.round((reviewed.length / total) * 100) : 0;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #dc2626 0%, #7c3aed 100%)', borderRadius: '18px', padding: '1.6rem', marginBottom: '1.75rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', position: 'relative' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '0.8rem', opacity: 0.75 }}>
              {new Date().toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={26} /> QA Dashboard
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginLeft: '54px', fontSize: '0.95rem' }}>
            Good day, <strong>{user?.fullName}</strong> — here's your QUALITY & ACCREDITATION overview.
          </p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', color: '#475569', cursor: 'pointer' }}>
          <RefreshCw size={14} /> Refresh
          {lastFetch && <span style={{ color: '#94a3b8', fontWeight: 400 }}>· {lastFetch.toLocaleTimeString('en-RW', { hour: '2-digit', minute: '2-digit' })}</span>}
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <QAStatCard title="Total Incidents" value={total} icon={<AlertTriangle size={22} />} color="#dc2626" bg="#fef2f2"
          sub={`${thisMonth.length} this month`} />
        <QAStatCard title="Pending Review" value={pending.length} icon={<Clock size={22} />} color="#92400e" bg="#fffbeb"
          sub={pending.length > 0 ? '⚠ Requires action' : '✅ All clear'} />
        <QAStatCard title="Reviewed" value={reviewed.length} icon={<CheckCircle size={22} />} color="#166534" bg="#f0fdf4"
          sub={`${reviewRate}% review rate`} />
        <QAStatCard title="This Month" value={thisMonth.length} icon={<TrendingUp size={22} />} color="#1d4ed8" bg="#eff6ff"
          sub={`${thisMonth.filter(i => i.status === 'pending').length} still pending`} />
      </div>

      {/* ── Review rate progress ── */}
      <div style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem', backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Overall Review Completion</span>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: reviewRate >= 80 ? '#16a34a' : reviewRate >= 50 ? '#ca8a04' : '#dc2626' }}>{reviewRate}%</span>
        </div>
        <div style={{ height: '12px', backgroundColor: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${reviewRate}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: '99px', transition: 'width 0.8s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '10px' }}>
          {[{ label: 'Reviewed', n: reviewed.length, color: '#22c55e' }, { label: 'Pending', n: pending.length, color: '#f59e0b' }].map(k => (
            <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: k.color }} />
              {k.label}: <strong style={{ color: '#1e293b' }}>{k.n}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two-column: type + dept breakdown ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* Incident type breakdown */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} style={{ color: '#f59e0b' }} /> Incident Type Breakdown
          </h3>
          {typeEntries.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No incidents recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {typeEntries.map(([type, count], i) => (
                <TypeChip key={type} type={type} count={count}
                  color={TYPE_COLORS[i % TYPE_COLORS.length]}
                  bg={TYPE_COLORS[i % TYPE_COLORS.length] + '12'}
                />
              ))}
            </div>
          )}
        </div>

        {/* Department breakdown */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} style={{ color: '#2563eb' }} /> By Department / Unit
          </h3>
          {deptEntries.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No department data yet.</p>
          ) : deptEntries.map(([dept, count], i) => (
            <HBar key={dept} label={dept} count={count} total={total}
              color={DEPT_COLORS[i % DEPT_COLORS.length]}
              icon={DEPT_ICONS[dept] || <Layers size={14} />}
            />
          ))}
        </div>
      </div>

      {/* ── Pending review queue ── */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} style={{ color: '#f59e0b' }} />
            Pending Review Queue
            {pending.length > 0 && (
              <span style={{ padding: '2px 8px', borderRadius: '99px', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '0.72rem', fontWeight: 800 }}>{pending.length}</span>
            )}
          </h3>
          <button onClick={() => navigate('/incidents')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
            View All <ExternalLink size={13} />
          </button>
        </div>
        {pendingQueue.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
            <CheckCircle size={40} style={{ marginBottom: '1rem', color: '#22c55e' }} />
            <p style={{ fontWeight: 600 }}>All incidents have been reviewed!</p>
          </div>
        ) : (
          // Reverse so oldest-first in display (most urgent)
          [...pendingQueue].reverse().map((inc, i) => (
            <PendingRow key={inc.id} incident={inc} navigate={navigate} i={i} />
          ))
        )}
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'All Incidents', icon: <AlertTriangle size={22} />, color: '#dc2626', bg: 'rgba(220,38,38,0.08)', path: '/incidents' },
          { label: 'AI Insights', icon: <Brain size={22} />, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', path: '/ai-insights' },
          { label: 'Pending Only', icon: <Eye size={22} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', path: '/incidents?status=pending' },
        ].map(btn => (
          <button key={btn.label} onClick={() => navigate(btn.path)}
            style={{ padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
          >
            <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: btn.bg, color: btn.color }}>{btn.icon}</div>
            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QADashboard;
