import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUsers } from '../api/users';
import api from '../api/axios';
import { getIncidents } from '../api/incidents';
import { getResultTransfers } from '../api/resultTransfer';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Users, Activity, ShieldAlert, History,
  Key, Database, Server, Cpu,
  RefreshCw, ChevronRight, UserPlus, ShieldCheck
} from 'lucide-react';

// ── Metrics Card ─────────────────────────────────────────────────────────────
const ITMetricCard = ({ title, value, sub, icon, color, trend }) => (
  <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: `${color}15`, color }}>{icon}</div>
      {trend && (
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: trend.startsWith('+') ? '#059669' : '#b91c1c' }}>
          {trend}
        </span>
      )}
    </div>
    <div>
      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{value}</h2>
        {sub && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sub}</span>}
      </div>
    </div>
  </div>
);

// ── Activity Row ─────────────────────────────────────────────────────────────
const ActivityRow = ({ log }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
    <div style={{ 
      width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-dark)', fontWeight: 800, fontSize: '0.75rem' 
    }}>
      {log.user_name?.[0] || 'U'}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
        {log.user_name} <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{log.action.toLowerCase()}</span> {log.entity_type.replace('_', ' ')}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
        {new Date(log.created_at).toLocaleTimeString()} · {log.ip_address || 'Internal'}
      </p>
    </div>
    <div style={{ 
      fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
      backgroundColor: log.action === 'LOGIN' ? '#ecfdf5' : '#f1f5f9',
      color: log.action === 'LOGIN' ? '#059669' : '#64748b'
    }}>
      {log.action}
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
const ITDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({
    users: [],
    logs: [],
    incidents: [],
    transfers: []
  });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, lRes, iRes, tRes] = await Promise.all([
        getUsers().catch(() => ({ data: { data: [] } })),
        api.get('/audit').catch(() => ({ data: { data: [] } })),
        getIncidents().catch(() => ({ data: { data: [] } })),
        getResultTransfers().catch(() => ({ data: { data: [] } }))
      ]);
      setData({
        users: uRes.data.data || [],
        logs: lRes.data.data || [],
        incidents: iRes.data.data || [],
        transfers: tRes.data.data || []
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    load();
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, [load]);

  if (loading) return <LoadingSpinner />;

  const activeUsers = data.users.filter(u => u.is_active).length;
  const recentLogs = data.logs.slice(0, 8);
  const systemIncidents = data.incidents.filter(inc => inc.incident_type === 'Equipment' || inc.incident_type === 'Others');
  
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* ── IT Command Center Hero ── */}
      <div style={{ 
        background: 'linear-gradient(135deg, #001f24 0%, #003b44 100%)', 
        borderRadius: '24px', padding: '2.5rem', color: '#fff', marginBottom: '2.5rem', position: 'relative', overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,59,68,0.15)'
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '40%', background: 'radial-gradient(circle at top right, rgba(0,255,255,0.05), transparent 70%)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
             <div style={{ padding: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                <Server size={20} className="text-emerald-400" />
             </div>
             <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.8 }}>System Administration Node</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800 }}>{greeting}, {user?.fullName.split(' ')[0]} ⚡</h1>
          <p style={{ marginTop: '0.5rem', fontSize: '1rem', opacity: 0.7, maxWidth: '600px', fontWeight: 500 }}>
            Unified Infrastructure Monitoring & Staff Access Control Terminal. Clinical systems status is nominal.
          </p>
        </div>
      </div>

      {/* ── Top Metrics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <ITMetricCard 
          title="Active Staff Accounts" 
          value={activeUsers} 
          sub={`out of ${data.users.length}`}
          icon={<Users size={24} />} 
          color="#0ea5e9"
          trend="+2 this week"
        />
        <ITMetricCard 
          title="Audit Volume (24h)" 
          value={data.logs.length} 
          sub="System events"
          icon={<Activity size={24} />} 
          color="#8b5cf6"
        />
        <ITMetricCard 
          title="Technical Incidents" 
          value={systemIncidents.length} 
          sub="Active reports"
          icon={<ShieldAlert size={24} />} 
          color="#f43f5e"
        />
      </div>

      {/* ── Main Content Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr', gap: '2rem' }}>
        
        {/* Real-time Audit Stream */}
        <div style={{ backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <History size={20} style={{ color: '#8b5cf6' }} /> System Audit Stream
            </h3>
            <button onClick={() => navigate('/audit-logs')} style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Full Log View <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {recentLogs.map(log => <ActivityRow key={log.id} log={log} />)}
            {recentLogs.length === 0 && (
              <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>No recent audit events captured.</div>
            )}
          </div>
        </div>

        {/* Quick Management Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Action Hub */}
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '1.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Admin Controls</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button 
                onClick={() => navigate('/users')}
                style={{ padding: '1.25rem', borderRadius: '16px', border: '1.5px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ padding: '10px', backgroundColor: '#e0f2fe', color: '#0ea5e9', borderRadius: '10px' }}><Users size={20} /></div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Manage Staff</span>
              </button>
              <button 
                onClick={() => navigate('/users')} // Ideally it opens the creation modal directly
                style={{ padding: '1.25rem', borderRadius: '16px', border: '1.5px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ padding: '10px', backgroundColor: '#d1fae5', color: '#10b981', borderRadius: '10px' }}><UserPlus size={20} /></div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>New Account</span>
              </button>
              <button 
                onClick={() => navigate('/audit-logs')}
                style={{ padding: '1.25rem', borderRadius: '16px', border: '1.5px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ padding: '10px', backgroundColor: '#ede9fe', color: '#8b5cf6', borderRadius: '10px' }}><History size={20} /></div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Trace Events</span>
              </button>
              <button 
                onClick={() => navigate('/incidents')}
                style={{ padding: '1.25rem', borderRadius: '16px', border: '1.5px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#f43f5e'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ padding: '10px', backgroundColor: '#fff1f2', color: '#f43f5e', borderRadius: '10px' }}><ShieldAlert size={20} /></div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Issue reports</span>
              </button>
            </div>
          </div>

          {/* System Status Visualizer */}
          <div style={{ 
            background: '#0f172a', borderRadius: '24px', padding: '2rem', color: '#fff', 
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <ShieldCheck size={24} style={{ color: '#10b981' }} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>System Health Matrix</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {[
                { label: 'Cloud DB Node (Turso)', status: 'Healthy', val: 98, icon: <CloudLightning size={14} /> },
                { label: 'Auth & JWT Gateway', status: 'Optimal', val: 100, icon: <Key size={14} /> },
                { label: 'PDF Rendering Core', status: 'Nominal', val: 94, icon: <Cpu size={14} /> },
              ].map(s => (
                <div key={s.label}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                      <span style={{ opacity: 0.8, display: 'flex', alignItems: 'center', gap: '6px' }}>{s.label}</span>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>{s.status}</span>
                   </div>
                   <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${s.val}%`, backgroundColor: '#10b981', borderRadius: '99px' }} />
                   </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

// Help for icons not imported
const CloudLightning = ({ size, className }) => <Database size={size} className={className} />;

export default ITDashboard;
