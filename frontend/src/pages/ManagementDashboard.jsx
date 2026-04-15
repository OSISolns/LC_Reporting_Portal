import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAIStats, getExecutiveReport } from '../api/ai';
import { getCancellations } from '../api/cancellations';
import { getRefunds } from '../api/refunds';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  FileText, ReceiptText, AlertTriangle, Clock,
  CheckCircle, TrendingUp, Brain, RefreshCw,
  ChevronRight, Users2, Activity, Zap, Award,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt   = (n) => Number(n || 0).toLocaleString();
const fmtRWF = (n) => `RWF ${Number(n || 0).toLocaleString()}`;

// ── Gradient stat card ────────────────────────────────────────────────────────
const BigStatCard = ({ title, value, sub, icon, gradient, badge }) => (
  <div style={{ background: gradient, borderRadius: '18px', padding: '1.5rem', color: '#fff', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.14)', position: 'relative', overflow: 'hidden', minHeight: '130px' }}>
    <div style={{ position: 'absolute', top: '-18px', right: '-18px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
    <div style={{ position: 'absolute', bottom: '-30px', right: '40px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
      <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{icon}</div>
      {badge != null && (
        <span style={{ padding: '3px 10px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, backdropFilter: 'blur(8px)' }}>
          {badge} pending
        </span>
      )}
    </div>
    <div style={{ position: 'relative' }}>
      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85 }}>{title}</p>
      <p style={{ margin: '4px 0 0', fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: '0.78rem', opacity: 0.8 }}>{sub}</p>}
    </div>
  </div>
);

// ── Pending item row ──────────────────────────────────────────────────────────
const PendingRow = ({ item, type, navigate }) => {
  const path = type === 'cancellation' ? `/cancellations/${item.id}` : `/refunds/${item.id}`;
  const age  = Math.floor((Date.now() - new Date(item.created_at)) / 86400000);
  return (
    <div
      onClick={() => navigate(path)}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.8rem 1rem', cursor: 'pointer', transition: 'background 0.15s', borderBottom: '1px solid #f1f5f9' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: type === 'cancellation' ? '#007B8A' : '#f59e0b', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.patient_full_name}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: '#94a3b8' }}>
          {item.pid_number} · {age === 0 ? 'Today' : `${age}d ago`} · {item.creator_name || 'Unknown'}
        </p>
      </div>
      <span style={{ padding: '2px 8px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', flexShrink: 0 }}>
        {item.status}
      </span>
      <ChevronRight size={14} style={{ color: '#cbd5e1', flexShrink: 0 }} />
    </div>
  );
};

// ── Module breakdown mini card ────────────────────────────────────────────────
const ModuleBar = ({ label, approved, total, color }) => {
  const pct = total ? Math.round((approved / total) * 100) : 0;
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>{label}</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{fmt(approved)} / {fmt(total)}</span>
      </div>
      <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '99px', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
const ManagementDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats,      setStats]      = useState(null);
  const [narrative,  setNarrative]  = useState('');
  const [pendingCanc,setPendingCanc] = useState([]);
  const [pendingRef, setPendingRef]  = useState([]);
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
      const [sRes, nRes, cRes, rRes] = await Promise.all([
        getAIStats().catch(() => null),
        getExecutiveReport().catch(() => null),
        getCancellations({ status: 'pending' }).catch(() => null),
        getRefunds({ status: 'pending' }).catch(() => null),
      ]);

      if (sRes?.data?.data) setStats(sRes.data.data);
      if (nRes?.data?.data?.narrative) setNarrative(nRes.data.data.narrative);
      setPendingCanc((cRes?.data?.data || []).slice(0, 5));
      setPendingRef((rRes?.data?.data || []).slice(0, 5));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  const c  = stats?.cancellations || {};
  const r  = stats?.refunds       || {};
  const i  = stats?.incidents     || {};
  const totalPending = (c.pending || 0) + (r.pending || 0) + (r.verified || 0);
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div>
      {/* ── Hero header ── */}
      <div style={{ background: 'linear-gradient(135deg, #003B44 0%, #007B8A 100%)', borderRadius: '20px', padding: '2rem', color: '#fff', marginBottom: '1.75rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: '-60px', right: '120px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', position: 'relative' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '0.85rem', opacity: 0.7, fontWeight: 500 }}>
              {now.toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 800, color: '#fff' }}>
              {greeting}, {user?.fullName?.split(' ')[0]} 👋
            </h1>
            <p style={{ margin: '8px 0 0', opacity: 0.75, fontSize: '0.92rem' }}>
              Legacy Clinics Reporting Portal — Operations Overview
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '0.6rem 1.1rem', backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Narrative banner */}
        {narrative && (
          <div style={{ marginTop: '1.25rem', padding: '0.9rem 1.1rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '0.83rem', lineHeight: 1.6, opacity: 0.9, position: 'relative', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <Zap size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            {narrative}
          </div>
        )}
      </div>

      {/* ── 4 Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <BigStatCard
          title="Cancellations" value={fmt(c.total)} icon={<FileText size={22} />}
          gradient="linear-gradient(135deg, #007B8A, #005f6b)"
          sub={`${fmt(c.approved)} approved · ${fmt(c.last30Days)} this month`}
          badge={c.pending}
        />
        <BigStatCard
          title="Refunds" value={fmt(r.total)} icon={<ReceiptText size={22} />}
          gradient="linear-gradient(135deg, #f59e0b, #d97706)"
          sub={`${fmtRWF(r.approvedAmountRWF)} paid out · ${fmt(r.last30Days)} this month`}
          badge={(r.pending || 0) + (r.verified || 0)}
        />
        <BigStatCard
          title="Incidents" value={fmt(i.total)} icon={<AlertTriangle size={22} />}
          gradient="linear-gradient(135deg, #dc2626, #b91c1c)"
          sub={`${fmt(i.reviewed)} reviewed · ${fmt(i.last30Days)} this month`}
        />
        <BigStatCard
          title="Pending Action" value={fmt(totalPending)} icon={<Clock size={22} />}
          gradient="linear-gradient(135deg, #7c3aed, #5b21b6)"
          sub="Cancellations + Refunds awaiting review"
        />
      </div>

      {/* ── Two-column middle section ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* Pending queue */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: '#f59e0b' }} />
              Pending Approvals
              {totalPending > 0 && <span style={{ padding: '2px 8px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 800 }}>{totalPending}</span>}
            </h3>
          </div>
          {pendingCanc.length === 0 && pendingRef.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
              <CheckCircle size={36} style={{ color: '#22c55e', marginBottom: '0.75rem' }} />
              <p style={{ fontWeight: 600, margin: 0 }}>All queues clear!</p>
            </div>
          ) : (
            <div>
              {pendingCanc.map(item => <PendingRow key={`c-${item.id}`} item={item} type="cancellation" navigate={navigate} />)}
              {pendingRef.map(item => <PendingRow key={`r-${item.id}`} item={item} type="refund" navigate={navigate} />)}
            </div>
          )}
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
            <button onClick={() => navigate('/cancellations?status=pending')} style={{ flex: 1, padding: '0.6rem', fontSize: '0.78rem', fontWeight: 700, border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#475569', cursor: 'pointer' }}>
              View Cancellations
            </button>
            <button onClick={() => navigate('/refunds?status=pending')} style={{ flex: 1, padding: '0.6rem', fontSize: '0.78rem', fontWeight: 700, border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#475569', cursor: 'pointer' }}>
              View Refunds
            </button>
          </div>
        </div>

        {/* Module breakdown + AI teaser */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Approval rates */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1.1rem', fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} style={{ color: '#22c55e' }} /> Approval Rates
            </h3>
            <ModuleBar label="Cancellations" approved={c.approved || 0} total={c.total || 0} color="#007B8A" />
            <ModuleBar label="Refunds"       approved={r.approved || 0} total={r.total || 0} color="#f59e0b" />
            <ModuleBar label="Incidents (reviewed)" approved={i.reviewed || 0} total={i.total || 0} color="#dc2626" />
          </div>

          {/* AI Insights CTA */}
          <div onClick={() => navigate('/ai-insights')}
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '16px', padding: '1.4rem', color: '#fff', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 4px 16px rgba(79,70,229,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(79,70,229,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(79,70,229,0.3)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ padding: '8px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '10px' }}>
                <Brain size={20} />
              </div>
              <span style={{ fontWeight: 800, fontSize: '1rem' }}>AI Insights</span>
              <ChevronRight size={16} style={{ marginLeft: 'auto' }} />
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.85, lineHeight: 1.5 }}>
              Classify submission reasons by category, map to staff, and generate executive briefings.
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Cancellations', icon: <FileText size={22} />, color: '#007B8A', bg: 'rgba(0,123,138,0.08)', path: '/cancellations' },
          { label: 'Refunds',       icon: <ReceiptText size={22} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', path: '/refunds' },
          { label: 'Incidents',     icon: <AlertTriangle size={22} />, color: '#dc2626', bg: 'rgba(220,38,38,0.08)', path: '/incidents' },
          { label: 'AI Insights',   icon: <Brain size={22} />, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', path: '/ai-insights' },
          ...(user?.role === 'admin' ? [
            { label: 'Users',   icon: <Users2 size={22} />,  color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)', path: '/users' },
            { label: 'Audit',   icon: <Activity size={22} />, color: '#10b981', bg: 'rgba(16,185,129,0.08)', path: '/audit-logs' },
          ] : []),
        ].map(btn => (
          <button key={btn.label} onClick={() => navigate(btn.path)}
            style={{ padding: '1.1rem', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = btn.bg; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
          >
            <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: btn.bg, color: btn.color }}>{btn.icon}</div>
            <span style={{ fontWeight: 700, fontSize: '0.83rem', color: '#1e293b' }}>{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ManagementDashboard;
