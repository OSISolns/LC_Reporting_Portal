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
  'Near Miss': { label: 'Near Miss', color: 'var(--primary)', bg: 'rgba(0,123,138,0.08)' },
  'Adverse Event': { label: 'Adverse Event', color: '#991b1b', bg: '#fef2f2' },
  'Sentinel Event': { label: 'Sentinel Event', color: '#4338ca', bg: '#eef2ff' },
  'Lost to Follow-up': { label: 'Other', color: '#475569', bg: '#f8fafc' },
};

const DEPT_ICONS = {
  Clinical: <Stethoscope size={14} />,
  IT: <Monitor size={14} />,
  Logistics: <Package size={14} />,
  'Human Resources': <Users2 size={14} />,
  'Cross-Cutting': <Layers size={14} />,
};

// ── Mini stat card ────────────────────────────────────────────────────────────
const QAStatCard = ({ title, value, icon, color, sub }) => (
  <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
    <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: `${color}10`, color, flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
      <p style={{ margin: '4px 0 0', fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary-dark)', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{sub}</p>}
    </div>
  </div>
);

// ── Horizontal bar ────────────────────────────────────────────────────────────
const HBar = ({ label, count, total, color, icon }) => {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
      <div style={{ width: '150px', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {icon && <span style={{ color }}>{icon}</span>}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </div>
      <div style={{ flex: 1, height: '10px', backgroundColor: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '99px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </div>
      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-dark)', minWidth: '40px', textAlign: 'right' }}>{count}</span>
    </div>
  );
};

// ── Incident type chip ────────────────────────────────────────────────────────
const TypeChip = ({ type, count, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', backgroundColor: `${color}08`, borderRadius: '12px', border: `1px solid ${color}15` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />
      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{type}</span>
    </div>
    <span style={{ fontSize: '1rem', fontWeight: 800, color }}>{count}</span>
  </div>
);

// ── Recent pending row ────────────────────────────────────────────────────────
const PendingRow = ({ incident, navigate, i }) => {
  const typeStyle = SEVERITY_RANGES[incident.incident_type] || { color: '#475569', bg: '#f8fafc' };
  const daysAgo = Math.floor((Date.now() - new Date(incident.created_at)) / 86400000);
  return (
    <div onClick={() => navigate(`/incidents/${incident.id}`)}
      style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1.5rem', alignItems: 'center', padding: '1.25rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>
          {incident.department || 'Clinical Department'} — {incident.area_of_incident || 'Unit'}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          By {incident.creator_name} · {daysAgo === 0 ? 'Logged Today' : `${daysAgo} days ago`}
        </p>
      </div>
      <span style={{ padding: '5px 12px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: typeStyle.bg, color: typeStyle.color, whiteSpace: 'nowrap', border: `1px solid ${typeStyle.color}20` }}>
        {incident.incident_type}
      </span>
      <ExternalLink size={16} style={{ color: '#cbd5e1' }} />
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

  const byType = {};
  for (const inc of incidents) {
    const t = inc.incident_type || 'General';
    byType[t] = (byType[t] || 0) + 1;
  }
  const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const TYPE_COLORS = ['var(--primary)', '#b91c1c', '#4338ca', '#92400e', '#0369a1', '#047857'];

  const byDept = {};
  for (const inc of incidents) {
    const d = inc.department || 'Other';
    byDept[d] = (byDept[d] || 0) + 1;
  }
  const deptEntries = Object.entries(byDept).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const DEPT_COLORS = ['var(--primary)', '#b91c1c', '#4338ca', '#92400e', '#0369a1', '#047857', '#6d28d9'];

  const pendingQueue = [...pending]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8);

  const reviewRate = total ? Math.round((reviewed.length / total) * 100) : 0;

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* ── Header ── */}
      <div style={{ background: 'var(--primary-dark)', borderRadius: '24px', padding: '2.5rem', marginBottom: '2rem', color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,59,68,0.1)' }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', position: 'relative' }}>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: '0.85rem', opacity: 0.7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Quality & Safety Assurance
            </p>
            <h1 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldCheck size={32} /> Quality Excellence Portal
            </h1>
            <p style={{ margin: '10px 0 0', opacity: 0.8, fontSize: '1rem', fontWeight: 500 }}>
              Good day, <strong>{user?.fullName}</strong> — monitoring clinical outcomes and safety metrics.
            </p>
          </div>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
            <RefreshCw size={16} /> Sync Records
            {lastFetch && <span style={{ opacity: 0.6, marginLeft: '4px' }}>· {lastFetch.toLocaleTimeString('en-RW', { hour: '2-digit', minute: '2-digit' })}</span>}
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <QAStatCard title="Total Incidents" value={total} icon={<AlertTriangle size={24} />} color="#b91c1c"
          sub={`${thisMonth.length} new this month`} />
        <QAStatCard title="Awaiting Review" value={pending.length} icon={<Clock size={24} />} color="#92400e"
          sub={pending.length > 0 ? 'Action required soon' : 'Workflow completed'} />
        <QAStatCard title="Finalized Reviews" value={reviewed.length} icon={<CheckCircle size={24} />} color="var(--success)"
          sub={`${reviewRate}% completion rate`} />
        <QAStatCard title="Active Projects" value={thisMonth.length} icon={<TrendingUp size={24} />} color="var(--primary)"
          sub={`${thisMonth.filter(i => i.status === 'pending').length} ongoing reviews`} />
      </div>

      {/* ── Review rate progress ── */}
      <div style={{ marginBottom: '2rem', padding: '2rem', backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary-dark)' }}>Audit Completion Tracking</span>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', color: reviewRate >= 80 ? 'var(--success)' : reviewRate >= 50 ? '#ca8a04' : '#b91c1c' }}>{reviewRate}%</span>
        </div>
        <div style={{ height: '14px', backgroundColor: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${reviewRate}%`, background: 'var(--success)', borderRadius: '99px', transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        </div>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '14px' }}>
          {[{ label: 'Reviewed', n: reviewed.length, color: 'var(--success)' }, { label: 'Pending', n: pending.length, color: '#f59e0b' }].map(k => (
            <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: k.color }} />
              {k.label}: <strong style={{ color: 'var(--primary-dark)' }}>{k.n}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two-column: type + dept breakdown ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>

        {/* Incident type breakdown */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={20} style={{ color: '#f59e0b' }} /> Event Classification
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {typeEntries.map(([type, count], i) => (
              <TypeChip key={type} type={type} count={count} color={TYPE_COLORS[i % TYPE_COLORS.length]} />
            ))}
          </div>
        </div>

        {/* Department breakdown */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={20} style={{ color: 'var(--primary)' }} /> Departmental Distribution
          </h3>
          {deptEntries.map(([dept, count], i) => (
            <HBar key={dept} label={dept} count={count} total={total}
              color={DEPT_COLORS[i % DEPT_COLORS.length]}
              icon={DEPT_ICONS[dept] || <Layers size={16} />}
            />
          ))}
        </div>
      </div>

      {/* ── Pending review queue ── */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={20} style={{ color: '#92400e' }} />
            Action Required: Review Queue
            {pending.length > 0 && (
              <span style={{ padding: '4px 12px', borderRadius: '99px', backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '0.75rem', fontWeight: 800 }}>{pending.length} UNREVIEWED</span>
            )}
          </h3>
          <button onClick={() => navigate('/incidents')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-dark)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--primary)'}>
            Inspect All <ExternalLink size={16} />
          </button>
        </div>
        <div>
          {pendingQueue.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <CheckCircle size={48} style={{ marginBottom: '1rem', color: 'var(--success)', opacity: 0.6 }} />
              <p style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary-dark)' }}>Zero Pending Issues</p>
              <p style={{ marginTop: '4px' }}>All clinical incidents have been reviewed and closed.</p>
            </div>
          ) : (
            pendingQueue.map((inc, i) => (
              <PendingRow key={inc.id} incident={inc} navigate={navigate} i={i} />
            ))
          )}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Analytical Platforms</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        {[
          { label: 'Incident Registry', icon: <AlertTriangle size={24} />, color: '#b91c1c', path: '/incidents' },
          { label: 'AI Risk Platform', icon: <Brain size={24} />, color: '#4338ca', path: '/ai-insights' },
          { label: 'Audit Workspace', icon: <Layers size={24} />, color: 'var(--primary)', path: '/incidents?status=pending' },
        ].map(btn => (
          <button key={btn.label} onClick={() => navigate(btn.path)}
            style={{ padding: '1.75rem', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = btn.color; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
          >
            <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: `${btn.color}08`, color: btn.color }}>{btn.icon}</div>
            <span style={{ fontWeight: 800, color: 'var(--primary-dark)', fontSize: '1rem' }}>{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QADashboard;
