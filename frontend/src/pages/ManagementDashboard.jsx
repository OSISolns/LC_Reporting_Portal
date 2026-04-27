import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAIStats, getExecutiveReport } from '../api/ai';
import { getCancellations } from '../api/cancellations';
import { getRefunds } from '../api/refunds';
import { getResultTransfers } from '../api/resultTransfer';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  FileText, ReceiptText, AlertTriangle, Clock,
  CheckCircle, TrendingUp, Brain, RefreshCw,
  ChevronRight, Users2, Activity, Zap,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt   = (n) => Number(n || 0).toLocaleString();
const fmtRWF = (n) => `RWF ${Number(n || 0).toLocaleString()}`;

// ── Muted stat card ────────────────────────────────────────────────────────
const BigStatCard = ({ title, value, sub, icon, color, badge }) => (
  <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.5rem', color: 'var(--primary-dark)', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden', minHeight: '130px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
      <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: `${color}15`, color: color, flexShrink: 0 }}>{icon}</div>
      {badge != null && badge > 0 && (
        <span style={{ padding: '4px 12px', backgroundColor: '#fff7ed', color: '#9a3412', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, border: '1px solid #ffedd5' }}>
          {badge} pending
        </span>
      )}
    </div>
    <div style={{ position: 'relative' }}>
      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>{title}</p>
      <p style={{ margin: '4px 0 0', fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, color: 'var(--primary-dark)' }}>{value}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{sub}</p>}
    </div>
  </div>
);

// ── Pending item row ──────────────────────────────────────────────────────────
const PendingRow = ({ item, type, navigate }) => {
  const path = type === 'cancellation' ? `/cancellations/${item.id}` : 
               type === 'refund' ? `/refunds/${item.id}` : '/results-transfer';
  const age  = Math.floor((Date.now() - new Date(item.created_at || Date.now())) / 86400000);
  const typeColor = type === 'cancellation' ? 'var(--primary)' : 
                    type === 'refund' ? '#92400e' : '#059669';
  
  const icon = type === 'cancellation' ? <FileText size={18} /> : 
               type === 'refund' ? <ReceiptText size={18} /> : <RefreshCw size={18} />;

  const title = type === 'transfer' ? `Transfer: ${item.old_sid} ➔ ${item.new_sid}` : item.patient_full_name;
  const subtitle = type === 'transfer' ? `Result Transfer · ${item.creator_name}` : `${item.pid_number} · ${age === 0 ? 'Today' : `${age} days ago`} · ${item.creator_name}`;
  return (
    <div
      onClick={() => navigate(path)}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', cursor: 'pointer', transition: 'background 0.15s', borderBottom: '1px solid #f1f5f9' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: `${typeColor}10`, color: typeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: 'var(--primary-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {subtitle}
        </p>
      </div>
      <ChevronRight size={16} style={{ color: '#cbd5e1', flexShrink: 0 }} />
    </div>
  );
};

// ── Module breakdown mini card ────────────────────────────────────────────────
const ModuleBar = ({ label, approved, total, color }) => {
  const pct = total ? Math.round((approved / total) * 100) : 0;
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{pct}% ({fmt(approved)}/{fmt(total)})</span>
      </div>
      <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '99px', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
const ManagementDashboard = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [stats,      setStats]      = useState(null);
  const [narrative,  setNarrative]  = useState('');
  const [pendingCanc,setPendingCanc] = useState([]);
  const [pendingRef, setPendingRef]  = useState([]);
  const [pendingRt,  setPendingRt]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [now,        setNow]        = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, nRes, cRes, rRes, tRes] = await Promise.all([
        getAIStats().catch(() => null),
        getExecutiveReport().catch(() => null),
        getCancellations({ status: 'pending' }).catch(() => null),
        getRefunds({ status: 'pending' }).catch(() => null),
        getResultTransfers().catch(() => null),
      ]);

      if (sRes?.data?.data) setStats(sRes.data.data);
      if (nRes?.data?.data?.narrative) setNarrative(nRes.data.data.narrative);
      setPendingCanc((cRes?.data?.data || []).slice(0, 5));
      setPendingRef((rRes?.data?.data || []).slice(0, 5));
      setPendingRt((tRes?.data?.data || []).filter(t => t.status === 'pending' || t.status === 'reviewed').slice(0, 5));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  const c  = stats?.cancellations || {};
  const r  = stats?.refunds       || {};
  const i  = stats?.incidents     || {};
  const rt = stats?.transfers     || {};
  const totalPending = (c.pending || 0) + (r.pending || 0) + (r.verified || 0) + (rt.pending || 0) + (rt.reviewed || 0);
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* ── Hero header ── */}
      <div style={{ background: 'var(--primary-dark)', borderRadius: '24px', padding: '2.5rem', color: '#fff', marginBottom: '2rem', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,59,68,0.1)' }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'absolute', bottom: '-20px', right: '100px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', position: 'relative' }}>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: '0.85rem', opacity: 0.7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {now.toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: '#fff' }}>
              {greeting}, {user?.fullName?.split(' ')[0]} 👋
            </h1>
            <p style={{ margin: '10px 0 0', opacity: 0.8, fontSize: '1rem', fontWeight: 500 }}>
              Legacy Clinics Operational Intelligence Dashboard
            </p>
          </div>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}>
            <RefreshCw size={16} /> Update View
          </button>
        </div>
      </div>

      {/* ── 4 Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <BigStatCard
          title="Total Cancellations" value={fmt(c.total)} icon={<FileText size={24} />}
          color="var(--primary)"
          sub={`${fmt(c.approved)} finalized · ${fmt(c.last30Days)} this month`}
          badge={c.pending}
        />
        <BigStatCard
          title="Total Refunds" value={fmt(r.total)} icon={<ReceiptText size={24} />}
          color="#92400e"
          sub={`${fmtRWF(r.approvedAmountRWF)} paid out · ${fmt(r.last30Days)} this month`}
          badge={(r.pending || 0) + (r.verified || 0)}
        />
        <BigStatCard
          title="Incident Reports" value={fmt(i.total)} icon={<AlertTriangle size={24} />}
          color="#b91c1c"
          sub={`${fmt(i.reviewed)} reviews done · ${fmt(i.last30Days)} this month`}
        />
        <BigStatCard
          title="Result Transfers" value={fmt(rt.total)} icon={<RefreshCw size={24} />}
          color="#059669"
          sub={`${fmt(rt.approved)} finalized · ${fmt(rt.last30Days)} this month`}
          badge={(rt.pending || 0) + (rt.reviewed || 0)}
        />
        <BigStatCard
          title="Pending Action" value={fmt(totalPending)} icon={<Clock size={24} />}
          color="#4338ca"
          sub="Requires managerial determination"
        />
      </div>

      {/* ── Two-column middle section ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '2rem', marginBottom: '2rem' }}>

        {/* Pending queue */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={20} style={{ color: '#92400e' }} />
              Active Review Queue
              {totalPending > 0 && <span style={{ padding: '4px 10px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800 }}>{totalPending} NEW</span>}
            </h3>
          </div>
          {pendingCanc.length === 0 && pendingRef.length === 0 && pendingRt.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <CheckCircle size={48} style={{ color: 'var(--success)', marginBottom: '1rem', opacity: 0.6 }} />
              <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary-dark)' }}>Operational Excellence</p>
              <p style={{ marginTop: '4px' }}>All submission queues are currently clear.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {pendingCanc.map(item => <PendingRow key={`c-${item.id}`} item={item} type="cancellation" navigate={navigate} />)}
              {pendingRef.map(item => <PendingRow key={`r-${item.id}`} item={item} type="refund" navigate={navigate} />)}
              {pendingRt.map(item => <PendingRow key={`rt-${item.id}`} item={item} type="transfer" navigate={navigate} />)}
            </div>
          )}
          <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '1rem' }}>
            <button onClick={() => navigate('/cancellations?status=pending')} style={{ flex: 1, padding: '0.75rem', fontSize: '0.85rem', fontWeight: 700, border: '1.5px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#fff', color: 'var(--primary-dark)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
              View All Cancellations
            </button>
            <button onClick={() => navigate('/refunds?status=pending')} style={{ flex: 1, padding: '0.75rem', fontSize: '0.85rem', fontWeight: 700, border: '1.5px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#fff', color: 'var(--primary-dark)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
              View All Refunds
            </button>
          </div>
        </div>

        {/* Module breakdown + AI teaser */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Approval rates */}
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '1.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingUp size={20} style={{ color: 'var(--success)' }} /> Operational Performance
            </h3>
            <ModuleBar label="Cancellation Completion" approved={c.approved || 0} total={c.total || 0} color="var(--primary)" />
            <ModuleBar label="Refund Processing"       approved={r.approved || 0} total={r.total || 0} color="#92400e" />
            <ModuleBar label="Result Transfer Finalization" approved={rt.approved || 0} total={rt.total || 0} color="#059669" />
            <ModuleBar label="Incident Review Rate"    approved={i.reviewed || 0} total={i.total || 0} color="#b91c1c" />
          </div>

        </div>
      </div>

      {/* ── Quick actions ── */}
      <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Quick Navigation</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
        {[
          { label: 'Cancellations', icon: <FileText size={24} />, color: 'var(--primary)', path: '/cancellations', perm: { mod: 'cancellations', act: 'view' } },
          { label: 'Refunds',       icon: <ReceiptText size={24} />, color: '#92400e', path: '/refunds', perm: { mod: 'refunds', act: 'view' } },
          { label: 'Transfers',     icon: <RefreshCw size={24} />, color: '#059669', path: '/results-transfer', perm: { mod: 'results_transfer', act: 'view' } },
          { label: 'Incidents',     icon: <AlertTriangle size={24} />, color: '#b91c1c', path: '/incidents', perm: { mod: 'incident_reports', act: 'view' } },
          { label: 'Users',         icon: <Users2 size={24} />,  color: '#0369a1', path: '/users', perm: { mod: 'user_management', act: 'view' } },
          { label: 'Audit Logs',    icon: <Activity size={24} />, color: '#047857', path: '/audit-logs', perm: { mod: 'audit_logs', act: 'view' } },
        ].filter(btn => hasPermission(btn.perm.mod, btn.perm.act)).map(btn => (
          <button key={btn.label} onClick={() => navigate(btn.path)}
            style={{ padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = btn.color; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
          >
            <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: `${btn.color}10`, color: btn.color, transition: 'all 0.2s' }}>{btn.icon}</div>
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ManagementDashboard;

