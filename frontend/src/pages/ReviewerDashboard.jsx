import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAIStats } from '../api/ai';
import { getCancellations } from '../api/cancellations';
import { getRefunds } from '../api/refunds';
import { getResultTransfers } from '../api/resultTransfer';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  FileText, ReceiptText, AlertTriangle, Clock,
  CheckCircle, TrendingUp, RefreshCw,
  ChevronRight, Activity, Stethoscope, ClipboardList, Users
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString();

// ── Stat card ────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon, color, badge }) => (
  <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: `${color}15`, color: color }}>{icon}</div>
      {badge > 0 && (
        <span style={{ padding: '2px 8px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700 }}>
          {badge} New
        </span>
      )}
    </div>
    <div>
      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em' }}>{title}</p>
      <p style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{value}</p>
    </div>
  </div>
);

const PendingRow = ({ item, type, navigate }) => {
  const path = type === 'cancellation' ? `/cancellations` : 
               type === 'refund' ? `/refunds` : 
               type === 'transfer' ? `/results-transfer` : `/incidents`;
  const typeColor = type === 'cancellation' ? '#0ea5e9' : 
                    type === 'refund' ? '#f59e0b' : 
                    type === 'transfer' ? '#10b981' : '#ef4444';
  
  return (
    <div
      onClick={() => navigate(path)}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.85rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: `${typeColor}10`, color: typeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {type === 'cancellation' ? <FileText size={16} /> : type === 'refund' ? <ReceiptText size={16} /> : <RefreshCw size={16} />}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
          {type === 'transfer' ? `Transfer: ${item.old_sid}` : item.patient_full_name}
        </p>
        <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>{item.creator_name} · {new Date(item.created_at).toLocaleDateString()}</p>
      </div>
      <ChevronRight size={14} style={{ color: '#cbd5e1' }} />
    </div>
  );
};

const ReviewerDashboard = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes, rRes, tRes] = await Promise.all([
        getAIStats().catch(() => null),
        getCancellations({ status: 'pending' }).catch(() => null),
        getRefunds({ status: 'pending' }).catch(() => null),
        getResultTransfers().catch(() => null),
      ]);

      if (sRes?.data?.data) setStats(sRes.data.data);
      
      const combined = [
        ...(cRes?.data?.data || []).map(i => ({ ...i, type: 'cancellation' })),
        ...(rRes?.data?.data || []).map(i => ({ ...i, type: 'refund' })),
        ...(tRes?.data?.data || []).filter(i => i.status === 'pending').map(i => ({ ...i, type: 'transfer' })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
      
      setPendingItems(combined);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingSpinner />;

  const c = stats?.cancellations || {};
  const r = stats?.refunds || {};
  const i = stats?.incidents || {};
  const rt = stats?.transfers || {};

  const quickLinks = [
    { label: 'Cancellations', icon: <FileText size={20} />, path: '/cancellations', mod: 'cancellations', act: 'view', color: '#0ea5e9' },
    { label: 'Refunds', icon: <ReceiptText size={20} />, path: '/refunds', mod: 'refunds', act: 'view', color: '#f59e0b' },
    { label: 'Result Transfers', icon: <RefreshCw size={20} />, path: '/results-transfer', mod: 'results_transfer', act: 'view', color: '#10b981' },
    { label: 'Incident Reports', icon: <AlertTriangle size={20} />, path: '/incidents', mod: 'incident_reports', act: 'view', color: '#ef4444' },
    { label: 'Nursing Hub', icon: <Stethoscope size={20} />, path: '/nursing-hub', mod: 'clinical_observation', act: 'view', color: '#8b5cf6' },
    { label: 'Performance', icon: <Activity size={20} />, path: '/performance', mod: 'staff_performance', act: 'view', color: '#ec4899' },
    { label: 'Users', icon: <Users size={20} />, path: '/users', mod: 'user_management', act: 'view', color: '#6366f1' },
    { label: 'Audit Logs', icon: <ClipboardList size={20} />, path: '/audit-logs', mod: 'audit_logs', act: 'view', color: '#475569' },
  ].filter(link => hasPermission(link.mod, link.act));

  return (
    <div style={{ animation: 'fade-in 0.5s ease-out' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>Reviewer Overview</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>Monitoring clinical and operational performance.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard title="Total Requests" value={fmt((c.total || 0) + (r.total || 0) + (rt.total || 0))} icon={<TrendingUp size={20} />} color="#0ea5e9" />
        <StatCard title="Pending Review" value={fmt((c.pending || 0) + (r.pending || 0) + (rt.pending || 0))} icon={<Clock size={20} />} color="#f59e0b" badge={(c.pending || 0) + (r.pending || 0) + (rt.pending || 0)} />
        <StatCard title="Incidents" value={fmt(i.total || 0)} icon={<AlertTriangle size={20} />} color="#ef4444" />
        <StatCard title="Clinical Logs" value={fmt(stats?.observations || 0)} icon={<Stethoscope size={20} />} color="#8b5cf6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Left: Pending Actions */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={20} className="text-blue-500" /> Recent Submissions
            </h2>
          </div>
          {pendingItems.length > 0 ? (
            <div>
              {pendingItems.map((item, idx) => (
                <PendingRow key={idx} item={item} type={item.type} navigate={navigate} />
              ))}
            </div>
          ) : (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
              <CheckCircle size={40} style={{ color: '#10b981', marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 600 }}>All queues are clear</p>
            </div>
          )}
        </div>

        {/* Right: Quick Access */}
        <div>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>Quick Access</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            {quickLinks.map(link => (
              <button
                key={link.label}
                onClick={() => navigate(link.path)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', backgroundColor: '#ffffff', 
                  border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                  textAlign: 'left', width: '100%'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = link.color; e.currentTarget.style.transform = 'translateX(4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: `${link.color}10`, color: link.color }}>
                  {link.icon}
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>{link.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewerDashboard;
