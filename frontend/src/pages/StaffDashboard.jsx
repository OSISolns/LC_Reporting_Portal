import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCancellations } from '../api/cancellations';
import { getRefunds } from '../api/refunds';
import { getIncidents } from '../api/incidents';
import { getResultTransfers } from '../api/resultTransfer';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  FileText, ReceiptText, AlertTriangle, Clock,
  CheckCircle, Plus, ChevronRight, ExternalLink,
  TrendingUp, Info, RefreshCw
} from 'lucide-react';

// ── Role labels ───────────────────────────────────────────────────────────────
const ROLE_LABEL = {
  cashier:           'Member of Finance',
  principal_cashier: 'Principal Cashier',
  customer_care:     'Patient Relations',
  operations_staff:  'Operations Staff',
  lab_team_lead:     'Laboratory Lead',
  it_officer:        'IT Systems & Security',
};

// ── Status pill ───────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:  { bg: '#fff7ed', color: '#9a3412', label: 'Pending' },
  verified: { bg: '#eff6ff', color: '#1e40af', label: 'Verified' },
  approved: { bg: '#f0fdf4', color: '#166534', label: 'Finalized' },
  rejected: { bg: '#fef2f2', color: '#991b1b', label: 'Rejected' },
  reviewed: { bg: '#f0fdf4', color: '#166534', label: 'Reviewed' },
};

const StatusPill = ({ status }) => {
  const s = STATUS_STYLES[status] || { bg: '#f8fafc', color: '#64748b', label: status };
  return (
    <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: s.bg, color: s.color, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', border: `1px solid ${s.color}20` }}>
      {s.label}
    </span>
  );
};

// ── Small stat card ───────────────────────────────────────────────────────────
const MiniStat = ({ label, value, color, icon }) => (
  <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
    <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: `${color}10`, color, flexShrink: 0 }}>{icon}</div>
    <div>
      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: '3px 0 0', fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-dark)', lineHeight: 1 }}>{value}</p>
    </div>
  </div>
);

// ── Recent list row ───────────────────────────────────────────────────────────
const RecentRow = ({ item, path, primary, secondary, navigate, i }) => (
  <div
    onClick={() => navigate(path)}
    style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '1rem 1.25rem', cursor: 'pointer', transition: 'background 0.15s', borderBottom: '1px solid #f1f5f9' }}
    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
  >
    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-dark)', flexShrink: 0, border: '1px solid #e2e8f0' }}>
      {i + 1}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{primary}</p>
      <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{secondary}</p>
    </div>
    <StatusPill status={item.status} />
    <ChevronRight size={16} style={{ color: '#cbd5e1', flexShrink: 0 }} />
  </div>
);

// ── Quick action button ───────────────────────────────────────────────────────
const QuickAction = ({ label, icon, color, path, navigate }) => (
  <button onClick={() => navigate(path)}
    style={{ padding: '1.25rem 1rem', borderRadius: '18px', border: '1px solid #e2e8f0', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.2s', flex: 1, minWidth: '140px' }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = color; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
  >
    <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: `${color}10`, color, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>{icon}</div>
    <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--primary-dark)', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
  </button>
);

// ── Tip card ─────────────────────────────────────────────────────────────────
const TipCard = ({ tips }) => (
  <div style={{ backgroundColor: '#f8fafc', borderRadius: '20px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <Info size={18} style={{ color: 'var(--primary)' }} />
      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary-dark)' }}>Guidance & Compliance</span>
    </div>
    <ul style={{ margin: 0, padding: '0 0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {tips.map((t, i) => <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6, fontWeight: 500 }}>{t}</li>)}
    </ul>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
const StaffDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPrincipal = user?.role === 'principal_cashier';
  const isOps       = user?.role === 'operations_staff';
  const [data,    setData]    = useState({ canc: [], refunds: [], incidents: [], transfers: [] });
  const [loading, setLoading] = useState(true);
  const [now,     setNow]     = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, rRes, iRes, tRes] = await Promise.all([
        !isOps ? getCancellations().catch(() => null) : Promise.resolve(null),
        !isOps ? getRefunds().catch(() => null) : Promise.resolve(null),
        getIncidents().catch(() => null),
        getResultTransfers().catch(() => null),
      ]);
      setData({
        canc:      cRes?.data?.data || [],
        refunds:   rRes?.data?.data || [],
        incidents: iRes?.data?.data || [],
        transfers: tRes?.data?.data || [],
      });
    } finally { setLoading(false); }
  }, [isOps]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.fullName?.split(' ').slice(-1)[0] || user?.fullName;

  // Compute simple counts
  const myCanc      = data.canc.slice(0,5);
  const myRef       = data.refunds.slice(0,5);
  const myInc       = data.incidents.slice(0,5);
  const pendCount   = data.canc.filter(c => c.status === 'pending').length + 
                      data.transfers.filter(t => t.status === 'pending' || t.status === 'reviewed').length;
  const approvedAmt = data.refunds.filter(r => r.status === 'approved').reduce((s, r) => s + Number(r.amount_to_be_refunded || 0), 0);
  const myTransfers = data.transfers.slice(0, 5);

  const ROLE_TIPS = {
    cashier:           ['Always verify PID before creating a cancellation.', 'Double-check amounts before submitting — corrections must go through full workflow.', 'Attach the correct receipt numbers to every request.'],
    principal_cashier: ['You can now view AI Insights for cancellations and refunds.', 'Review pending submissions from your team promptly.', 'Ensure all cashier submissions are accurate before they reach management.'],
    customer_care:     ['Complete all patient information fields accurately.', 'If in doubt, escalate to your supervisor before submitting.', "Incident reports must be filed within 24 hours of the event."],
    operations_staff:  ['Report incidents immediately — time-stamping matters.', 'Include all contributing factors for Quality Assurance review.', 'Use "Near Miss" for events that were caught before harm occurred.'],
    lab_team_lead:     ['Ensure all result transfers are approved only after verifying SID data.', 'Confirm the technician who executed the change in the lab system.', 'Rejected transfers should always include a specific reason for audit purposes.'],
    it_officer:        ['Monitor audit logs daily for unusual activity patterns.', 'Ensure staff accounts follow clinical access policy.', 'Review reported incidents to ensure system integrity and data accuracy.'],
  };
  const tips = ROLE_TIPS[user?.role] || [];

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* ── Hero ── */}
      <div style={{ background: 'var(--primary-dark)', borderRadius: '24px', padding: '2.5rem', marginBottom: '2rem', color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,59,68,0.1)' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <p style={{ margin: '0 0 4px', fontSize: '0.85rem', opacity: 0.7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {now.toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{greeting}, {firstName} 👋</h1>
        <p style={{ margin: '10px 0 0', opacity: 0.8, fontSize: '1rem', fontWeight: 500 }}>
          {ROLE_LABEL[user?.role] || user?.role} · Operational Control Center
        </p>
      </div>

      {/* ── Mini stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {!isOps && <MiniStat label={user?.role === 'it_officer' ? "All Cancellations" : "My Cancellations"} value={data.canc.length} color="var(--primary)" icon={<FileText size={20} />} />}
        {!isOps && <MiniStat label={user?.role === 'it_officer' ? "All Refunds" : "My Refunds"}       value={data.refunds.length} color="#92400e" icon={<ReceiptText size={20} />} />}
        <MiniStat label={user?.role === 'it_officer' ? "All Incidents" : "My Incidents"}    value={data.incidents.length} color="#b91c1c" icon={<AlertTriangle size={20} />} />
        <MiniStat label={user?.role === 'it_officer' ? "All Result Transfers" : "My Result Transfers"} value={data.transfers.length} color="#059669" icon={<RefreshCw size={20} />} />
        <MiniStat label="Pending Action"   value={pendCount} color="#4338ca" icon={<Clock size={20} />} />
      </div>

      {/* ── Quick actions ── */}
      {user?.role !== 'consultant' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '1.75rem', marginBottom: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Workflow Actions</h3>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            {!isOps && (
              <QuickAction label="New Cancellation" icon={<Plus size={20} />} color="#1b669e" path="/cancellations/new" navigate={navigate} />
            )}
            {!isOps && (
              <QuickAction label="New Refund" icon={<Plus size={20} />} color="#003b44" path="/refunds/new" navigate={navigate} />
            )}
            <QuickAction label="Report Incident" icon={<AlertTriangle size={20} />} color="#b91c1c" path="/incidents/new" navigate={navigate} />
            <QuickAction label="Result Transfer" icon={<RefreshCw size={20} />} color="#059669" path="/results-transfer" navigate={navigate} />
            <QuickAction label="View History" icon={<ExternalLink size={20} />} color="var(--primary-dark)" path="/incidents" navigate={navigate} />
            {isPrincipal && (
              <QuickAction label="AI Platform" icon={<TrendingUp size={20} />} color="#4338ca" path="/ai-insights" navigate={navigate} />
            )}
          </div>
        </div>
      )}

      {/* ── Recent submissions + tips ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>

        {/* Recent activity */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>My Recent Submissions</h3>
          </div>
          {myCanc.length + myRef.length + myInc.length + myTransfers.length === 0 ? (
            <div style={{ padding: '5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <FileText size={48} style={{ marginBottom: '1.25rem', color: '#e2e8f0', opacity: 0.8 }} />
              <p style={{ fontWeight: 700, margin: 0, fontSize: '1rem', color: 'var(--primary-dark)' }}>No Activity Yet</p>
              <p style={{ fontSize: '0.85rem', margin: '6px 0 0' }}>Your recent submissions will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {myCanc.map((item, i) => (
                <RecentRow key={`c-${item.id}`} item={item} i={i} navigate={navigate}
                  path={`/cancellations/${item.id}`}
                  primary={item.patient_full_name}
                  secondary={`Invoice Cancellation · PID: ${item.pid_number}`}
                />
              ))}
              {myRef.map((item, i) => (
                <RecentRow key={`r-${item.id}`} item={item} i={i + myCanc.length} navigate={navigate}
                  path={`/refunds/${item.id}`}
                  primary={item.patient_full_name}
                  secondary={`Payment Refund · RWF ${Number(item.amount_to_be_refunded || 0).toLocaleString()}`}
                />
              ))}
              {myInc.map((item, i) => (
                <RecentRow key={`i-${item.id}`} item={item} i={i + myCanc.length + myRef.length} navigate={navigate}
                  path={`/incidents/${item.id}`}
                  primary={item.department || 'Clinical Incident'}
                  secondary={`${item.incident_type} Event · ${item.area_of_incident || ''}`}
                />
              ))}
              {myTransfers.map((item, i) => (
                <RecentRow key={`rt-${item.id}`} item={item} i={i + myCanc.length + myRef.length + myInc.length} navigate={navigate}
                  path={`/results-transfer`}
                  primary={`Transfer: ${item.old_sid} ➔ ${item.new_sid}`}
                  secondary={`Result Transfer Request · ${new Date(item.created_at).toLocaleDateString()}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tips + Approved amount */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {approvedAmt > 0 && (
            <div style={{ background: 'var(--success)', borderRadius: '20px', padding: '1.75rem', color: '#fff', boxShadow: '0 10px 20px rgba(22,101,52,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <CheckCircle size={18} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Success Metrics</span>
              </div>
              <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>RWF {approvedAmt.toLocaleString()}</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', opacity: 0.9, fontWeight: 500 }}>Cumulative Approved Refunds</p>
            </div>
          )}
          <TipCard tips={tips} />
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
