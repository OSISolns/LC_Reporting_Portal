import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCancellations } from '../api/cancellations';
import { getRefunds } from '../api/refunds';
import { getIncidents } from '../api/incidents';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  FileText, ReceiptText, AlertTriangle, Clock,
  CheckCircle, Plus, ChevronRight, ExternalLink,
  TrendingUp, Info,
} from 'lucide-react';

// ── Role labels ───────────────────────────────────────────────────────────────
const ROLE_LABEL = {
  cashier:           'Cashier',
  principal_cashier: 'Principal Cashier',
  customer_care:     'Customer Care',
  operations_staff:  'Operations Staff',
};

// ── Status pill ───────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:  { bg: '#fffbeb', color: '#92400e' },
  verified: { bg: '#eff6ff', color: '#1d4ed8' },
  approved: { bg: '#f0fdf4', color: '#166534' },
  rejected: { bg: '#fef2f2', color: '#991b1b' },
  reviewed: { bg: '#f0fdf4', color: '#166534' },
};

const StatusPill = ({ status }) => {
  const s = STATUS_STYLES[status] || { bg: '#f8fafc', color: '#64748b' };
  return (
    <span style={{ padding: '2px 9px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: s.bg, color: s.color, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
};

// ── Small stat card ───────────────────────────────────────────────────────────
const MiniStat = ({ label, value, color, bg, icon }) => (
  <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '1.1rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: bg, color, flexShrink: 0 }}>{icon}</div>
    <div>
      <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: '3px 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{value}</p>
    </div>
  </div>
);

// ── Recent list row ───────────────────────────────────────────────────────────
const RecentRow = ({ item, path, primary, secondary, navigate, i }) => (
  <div
    onClick={() => navigate(path)}
    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.75rem 1rem', cursor: 'pointer', transition: 'background 0.15s', borderBottom: '1px solid #f8fafc' }}
    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
  >
    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', flexShrink: 0 }}>
      {i + 1}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.83rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{primary}</p>
      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>{secondary}</p>
    </div>
    <StatusPill status={item.status} />
    <ChevronRight size={13} style={{ color: '#cbd5e1', flexShrink: 0 }} />
  </div>
);

// ── Quick action button ───────────────────────────────────────────────────────
const QuickAction = ({ label, icon, color, bg, path, navigate }) => (
  <button onClick={() => navigate(path)}
    style={{ padding: '1rem', borderRadius: '14px', border: `1.5px solid ${color}22`, backgroundColor: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', flex: 1 }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
  >
    <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: '#fff', color, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>{icon}</div>
    <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1e293b', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
  </button>
);

// ── Tip card ─────────────────────────────────────────────────────────────────
const TipCard = ({ tips }) => (
  <div style={{ backgroundColor: '#eff6ff', borderRadius: '14px', padding: '1.1rem', border: '1px solid #bfdbfe' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
      <Info size={16} style={{ color: '#2563eb' }} />
      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e40af' }}>Tips & Reminders</span>
    </div>
    <ul style={{ margin: 0, padding: '0 0 0 1.1rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {tips.map((t, i) => <li key={i} style={{ fontSize: '0.78rem', color: '#1d4ed8', lineHeight: 1.5 }}>{t}</li>)}
    </ul>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
const StaffDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPrincipal = user?.role === 'principal_cashier';
  const isOps       = user?.role === 'operations_staff';
  const [data,    setData]    = useState({ canc: [], refunds: [], incidents: [] });
  const [loading, setLoading] = useState(true);
  const [now,     setNow]     = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const promises = [];
      if (!isOps) promises.push(getCancellations().catch(() => null)); else promises.push(null);
      if (!isOps) promises.push(getRefunds().catch(() => null));       else promises.push(null);
      promises.push(getIncidents().catch(() => null));
      const [cRes, rRes, iRes] = await Promise.all(promises);
      setData({
        canc:      cRes?.data?.data || [],
        refunds:   rRes?.data?.data || [],
        incidents: iRes?.data?.data || [],
      });
    } finally { setLoading(false); }
  }, [isOps]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.fullName?.split(' ').slice(-1)[0] || user?.fullName; // last word = first name (Rwandan names)

  // Compute simple counts
  const myCanc      = data.canc.slice(0,5);
  const myRef       = data.refunds.slice(0,5);
  const myInc       = data.incidents.slice(0,5);
  const pendCount   = data.canc.filter(c => c.status === 'pending').length;
  const approvedAmt = data.refunds.filter(r => r.status === 'approved').reduce((s, r) => s + Number(r.amount_to_be_refunded || 0), 0);

  const ROLE_TIPS = {
    cashier:           ['Always verify PID before creating a cancellation.', 'Double-check amounts before submitting — corrections must go through full workflow.', 'Attach the correct receipt numbers to every request.'],
    principal_cashier: ['You can now view AI Insights for cancellations and refunds.', 'Review pending submissions from your team promptly.', 'Ensure all cashier submissions are accurate before they reach management.'],
    customer_care:     ['Complete all patient information fields accurately.', 'If in doubt, escalate to your supervisor before submitting.', "Incident reports must be filed within 24 hours of the event."],
    operations_staff:  ['Report incidents immediately — time-stamping matters.', 'Include all contributing factors for Quality Assurance review.', 'Use "Near Miss" for events that were caught before harm occurred.'],
  };
  const tips = ROLE_TIPS[user?.role] || [];

  return (
    <div>
      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #003B44 0%, #007B8A 100%)', borderRadius: '18px', padding: '1.6rem', marginBottom: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <p style={{ margin: '0 0 4px', fontSize: '0.8rem', opacity: 0.7 }}>
          {now.toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 800, color: '#fff' }}>{greeting}, {firstName} 👋</h1>
        <p style={{ margin: '6px 0 0', opacity: 0.75, fontSize: '0.85rem' }}>
          {ROLE_LABEL[user?.role] || user?.role} · Legacy Clinics Reporting Portal
        </p>
      </div>

      {/* ── Mini stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {!isOps && <MiniStat label="My Cancellations" value={data.canc.length} color="#007B8A" bg="rgba(0,123,138,0.08)" icon={<FileText size={18} />} />}
        {!isOps && <MiniStat label="My Refunds"       value={data.refunds.length} color="#f59e0b" bg="rgba(245,158,11,0.08)" icon={<ReceiptText size={18} />} />}
        <MiniStat label="My Incidents"    value={data.incidents.length} color="#dc2626" bg="rgba(220,38,38,0.08)" icon={<AlertTriangle size={18} />} />
        {!isOps && <MiniStat label="Pending"          value={pendCount} color="#92400e" bg="#fffbeb" icon={<Clock size={18} />} />}
      </div>

      {/* ── Quick actions ── */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {!isOps && (
            <QuickAction label="New Cancellation" icon={<Plus size={18} />} color="#007B8A" bg="rgba(0,123,138,0.07)" path="/cancellations/new" navigate={navigate} />
          )}
          {!isOps && (
            <QuickAction label="New Refund" icon={<Plus size={18} />} color="#f59e0b" bg="rgba(245,158,11,0.07)" path="/refunds/new" navigate={navigate} />
          )}
          <QuickAction label="Report Incident" icon={<AlertTriangle size={18} />} color="#dc2626" bg="rgba(220,38,38,0.07)" path="/incidents/new" navigate={navigate} />
          <QuickAction label="View My Incidents" icon={<ExternalLink size={18} />} color="#7c3aed" bg="rgba(124,58,237,0.07)" path="/incidents" navigate={navigate} />
          {isPrincipal && (
            <QuickAction label="AI Insights" icon={<TrendingUp size={18} />} color="#4f46e5" bg="rgba(79,70,229,0.07)" path="/ai-insights" navigate={navigate} />
          )}
        </div>
      </div>

      {/* ── Recent submissions + tips ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

        {/* Recent activity */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.2rem', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>My Recent Submissions</h3>
          </div>
          {myCanc.length + myRef.length + myInc.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
              <FileText size={36} style={{ marginBottom: '0.75rem', color: '#e2e8f0' }} />
              <p style={{ fontWeight: 600, margin: 0, fontSize: '0.85rem' }}>No submissions yet.</p>
              <p style={{ fontSize: '0.75rem', margin: '4px 0 0' }}>Start by using the quick actions above.</p>
            </div>
          ) : (
            <>
              {myCanc.map((item, i) => (
                <RecentRow key={`c-${item.id}`} item={item} i={i} navigate={navigate}
                  path={`/cancellations/${item.id}`}
                  primary={item.patient_full_name}
                  secondary={`Cancellation · ${item.pid_number}`}
                />
              ))}
              {myRef.map((item, i) => (
                <RecentRow key={`r-${item.id}`} item={item} i={i + myCanc.length} navigate={navigate}
                  path={`/refunds/${item.id}`}
                  primary={item.patient_full_name}
                  secondary={`Refund · RWF ${Number(item.amount_to_be_refunded || 0).toLocaleString()}`}
                />
              ))}
              {myInc.map((item, i) => (
                <RecentRow key={`i-${item.id}`} item={item} i={i + myCanc.length + myRef.length} navigate={navigate}
                  path={`/incidents/${item.id}`}
                  primary={item.department || 'Incident'}
                  secondary={`${item.incident_type} · ${item.area_of_incident || ''}`}
                />
              ))}
            </>
          )}
        </div>

        {/* Tips + Approved amount */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {approvedAmt > 0 && (
            <div style={{ background: 'linear-gradient(135deg, #166534, #16a34a)', borderRadius: '14px', padding: '1.1rem', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <CheckCircle size={16} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.9 }}>TOTAL APPROVED REFUNDS</span>
              </div>
              <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>RWF {approvedAmt.toLocaleString()}</p>
            </div>
          )}
          <TipCard tips={tips} />
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
