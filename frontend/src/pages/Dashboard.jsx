import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import { getCancellations } from '../api/cancellations';
import { getIncidents } from '../api/incidents';
import { 
  FileText, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  TrendingUp,
  Activity
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingCancellations: 0,
    totalCancellations: 0,
    totalIncidents: 0,
    approvedCancellations: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [cRes, iRes] = await Promise.all([
          getCancellations().catch(() => ({ data: { data: [] } })),
          getIncidents().catch(() => ({ data: { data: [] } }))
        ]);
        
        const cancellations = cRes?.data?.data || [];
        const incidents = iRes?.data?.data || [];
        
        setStats({
          pendingCancellations: cancellations.filter(c => c.status === 'pending' || c.status === 'verified').length,
          totalCancellations: cancellations.length,
          totalIncidents: incidents.length,
          approvedCancellations: cancellations.filter(c => c.status === 'approved').length
        });
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.role !== 'quality_assurance') {
      fetchStats();
    } else {
      // For QA, just fetch incidents
      const fetchIncidentsOnly = async () => {
        try {
          const res = await getIncidents().catch(() => ({ data: { data: [] } }));
          setStats(prev => ({ ...prev, totalIncidents: res?.data?.data?.length || 0 }));
        } finally { setLoading(false); }
      };
      fetchIncidentsOnly();
    }
  }, [user]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.25rem' }}>Good Day, {user?.fullName}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Here is a summary of Legacy Clinics' operations today.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {user?.role !== 'quality_assurance' && (
          <StatCard 
            title="Pending Approvals" 
            value={stats.pendingCancellations} 
            icon={<Clock size={22} />} 
            color="warning" 
          />
        )}
        <StatCard 
          title="Incident Reports" 
          value={stats.totalIncidents} 
          icon={<AlertTriangle size={22} />} 
          color="danger" 
        />
        {user?.role !== 'quality_assurance' && (
          <>
            <StatCard 
              title="Total Cancellations" 
              value={stats.totalCancellations} 
              icon={<FileText size={22} />} 
              color="primary" 
            />
            <StatCard 
              title="Approved Requests" 
              value={stats.approvedCancellations} 
              icon={<CheckCircle size={22} />} 
              color="success" 
            />
          </>
        )}
      </div>

      <div style={{ padding: '2rem', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--primary-dark)' }}>Quick Access</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          {(user?.role === 'cashier' || user?.role === 'principal_cashier' || user?.role === 'customer_care') && (
            <button 
              onClick={() => window.location.href = '/cancellations/new'}
              style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'all 0.2s', ':hover': { backgroundColor: '#f1f5f9', transform: 'translateY(-2px)' } }}
            >
              <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: 'rgba(0,123,138,0.1)', color: 'var(--primary)' }}><FileText size={24} /></div>
              <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>New Cancellation</span>
            </button>
          )}

          {(user?.role === 'operations_staff' || user?.role === 'customer_care') && (
            <button 
              onClick={() => window.location.href = '/incidents/new'}
              style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'all 0.2s', ':hover': { backgroundColor: '#f1f5f9', transform: 'translateY(-2px)' } }}
            >
              <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}><AlertTriangle size={24} /></div>
              <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>Report Incident</span>
            </button>
          )}

          {(user?.role !== 'quality_assurance') && (
            <button 
              onClick={() => window.location.href = '/cancellations'}
              style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: 'rgba(23,162,184,0.1)', color: 'var(--info)' }}><Activity size={24} /></div>
              <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>View Cancellations</span>
            </button>
          )}

          {(user?.role === 'coo' || user?.role === 'chairman' || user?.role === 'admin') && (
            <button 
              onClick={() => window.location.href = '/users'}
              style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
               <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: 'rgba(34,197,94,0.1)', color: 'var(--success)' }}>
                 {/* I will use TrendingUp as generic icon if Users is not imported from lucid, wait I can just use Activity since lucide-react imports Activity. Actually, let's use Activity here too since Users may not be imported */}
                 <Activity size={24} />
               </div>
               <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>Manage Users</span>
            </button>
          )}

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
