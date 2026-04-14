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
    fetchStats();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.25rem' }}>Good Day, {user?.fullName}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Here is a summary of Legacy Clinics' operations today.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <StatCard 
          title="Pending Approvals" 
          value={stats.pendingCancellations} 
          icon={<Clock size={22} />} 
          color="warning" 
          trend="+2"
        />
        <StatCard 
          title="Incident Reports" 
          value={stats.totalIncidents} 
          icon={<AlertTriangle size={22} />} 
          color="danger" 
          trend="+5"
        />
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
        <div className="glass card-shadow" style={{ padding: '2rem', gridColumn: 'span 8', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>System Activity Overview</h2>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(0,123,138,0.1)', color: 'var(--primary)' }}>
              <Activity size={20} />
            </div>
          </div>
          <div style={{ height: '300px', display: 'flex', flex_direction: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', border: '1.5px dashed #e2e8f0', borderRadius: '16px', backgroundColor: '#f8fafc' }}>
            <TrendingUp size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p style={{ fontWeight: 500 }}>Traffic & Request Trends</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>System API will populate real-time analytics here</p>
          </div>
        </div>

        <div className="glass card-shadow" style={{ padding: '2rem', gridColumn: 'span 4', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Active Trends</h2>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(23,162,184,0.1)', color: 'var(--info)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              { label: 'Patient Cancellations', trend: 'Up 12%', color: 'var(--primary)' },
              { label: 'Verified Reports', trend: 'Steady', color: 'var(--info)' },
              { label: 'System Uptime', trend: '99.9%', color: 'var(--success)' }
            ].map((trend, i) => (
              <div key={i} style={{ padding: '1.25rem', borderRadius: '12px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: trend.color }}></div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>{trend.label}</p>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: trend.color }}>{trend.trend}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
