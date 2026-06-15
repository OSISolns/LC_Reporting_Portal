import { useState } from 'react';
import { 
  Activity, CheckCircle, AlertTriangle, Syringe, 
  Droplets, ShieldCheck, Bug, Search, UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MOCK_HAIS = [
  { id: 'HAI-1029', type: 'Surgical Site Infection (SSI)', department: 'Surgery', date: '2026-06-14', status: 'Under Investigation', severity: 'High' },
  { id: 'HAI-1028', type: 'Catheter-Associated UTI', department: 'ICU', date: '2026-06-12', status: 'Resolved', severity: 'Medium' },
];

const InfectionControlTracker = () => {
  const { user } = useAuth();
  
  // KPI Stats
  const stats = {
    haisThisMonth: 4,
    handHygiene: 92,
    sterilizationFails: 1,
    activeOutbreaks: 0
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Safety & Quality Assurance</p>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity size={32} style={{ color: 'var(--primary)' }} /> Infection Control Tracker
          </h1>
        </div>
        <button style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary-dark)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,59,68,0.2)' }}>
          <UserCheck size={20} /> Log Hygiene Audit
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: '#fef2f2', color: '#b91c1c' }}><Bug size={24} /></div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#b91c1c', backgroundColor: '#fef2f2', padding: '4px 10px', borderRadius: '99px' }}>Target: 0</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>HAIs THIS MONTH</p>
          <p style={{ margin: '4px 0 0', fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{stats.haisThisMonth}</p>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: '#f0fdf4', color: '#16a34a' }}><Droplets size={24} /></div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#16a34a', backgroundColor: '#f0fdf4', padding: '4px 10px', borderRadius: '99px' }}>Target: &gt;95%</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>HAND HYGIENE COMPLIANCE</p>
          <p style={{ margin: '4px 0 0', fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{stats.handHygiene}%</p>
          {/* Progress bar */}
          <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '99px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${stats.handHygiene}%`, height: '100%', backgroundColor: '#16a34a', borderRadius: '99px' }} />
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: '#fff7ed', color: '#ea580c' }}><Syringe size={24} /></div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ea580c', backgroundColor: '#fff7ed', padding: '4px 10px', borderRadius: '99px' }}>Review req.</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>STERILIZATION FAILURES</p>
          <p style={{ margin: '4px 0 0', fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{stats.sterilizationFails}</p>
        </div>

      </div>

      {/* ── Two Column Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        
        {/* Left Col: Recent HAIs */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bug size={20} style={{ color: '#b91c1c' }} /> Reported HAIs (30 Days)
            </h2>
          </div>
          <div>
            {MOCK_HAIS.map(hai => (
              <div key={hai.id} style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8' }}>{hai.id}</span>
                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: hai.severity === 'High' ? '#fef2f2' : '#fff7ed', color: hai.severity === 'High' ? '#b91c1c' : '#c2410c' }}>
                      {hai.severity} Severity
                    </span>
                  </div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{hai.type}</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Detected in <strong>{hai.department}</strong> on {hai.date}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 700, backgroundColor: hai.status === 'Resolved' ? '#f0fdf4' : '#f8fafc', color: hai.status === 'Resolved' ? '#16a34a' : '#475569', border: '1px solid #e2e8f0' }}>
                    {hai.status === 'Resolved' ? <CheckCircle size={14} /> : <Activity size={14} />} {hai.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Active Alerts & Protocols */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Active Alerts */}
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} style={{ color: '#ea580c' }} /> Active Protocol Alerts
            </h3>
            
            <div style={{ padding: '1rem', backgroundColor: '#fff7ed', borderLeft: '4px solid #ea580c', borderRadius: '8px', marginBottom: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#9a3412', marginBottom: '4px' }}>Autoclave Maintenance Required</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#ea580c' }}>Unit B failed biological indicator test. Switched to backup.</p>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderLeft: '4px solid #16a34a', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>Ward C Deep Clean Complete</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#16a34a' }}>Scheduled environmental swabbing results negative.</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 600, color: 'var(--primary-dark)', cursor: 'pointer', textAlign: 'left' }}>
                <ShieldCheck size={18} style={{ color: 'var(--primary)' }} /> Submit Environmental Swab
              </button>
              <button style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 600, color: 'var(--primary-dark)', cursor: 'pointer', textAlign: 'left' }}>
                <Activity size={18} style={{ color: 'var(--primary)' }} /> Review Isolation Protocols
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default InfectionControlTracker;
