import { useState } from 'react';
import { 
  TrendingDown, DollarSign, AlertCircle, FileSearch, 
  CheckCircle, Filter, ArrowRight, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MOCK_LEAKAGE_DATA = [
  { id: 'LKG-201', patient: 'John Doe', service: 'MRI Brain', date: '2026-06-14', clinicalLog: 'Radiology Report Generated', billingLog: 'Missing Invoice', value: 150000, status: 'Unresolved' },
  { id: 'LKG-202', patient: 'Jane Smith', service: 'CBC Blood Test', date: '2026-06-13', clinicalLog: 'Lab Results Uploaded', billingLog: 'Missing Invoice', value: 25000, status: 'Unresolved' },
  { id: 'LKG-203', patient: 'Alice Johnson', service: 'Physiotherapy Session', date: '2026-06-12', clinicalLog: 'Session Notes Logged', billingLog: 'Billed 10,000 (Expected 15,000)', value: 5000, status: 'Unresolved' },
  { id: 'LKG-204', patient: 'Robert Brown', service: 'Emergency Consultation', date: '2026-06-10', clinicalLog: 'Vitals & Doctor Notes', billingLog: 'Invoice Paid', value: 20000, status: 'Recovered' },
];

const RevenueLeakageTracker = () => {
  const { user } = useAuth();
  const [data, setData] = useState(MOCK_LEAKAGE_DATA);
  const [filter, setFilter] = useState('All');

  const filteredData = filter === 'All' ? data : data.filter(d => d.status === filter);

  const totalLeakage = data.filter(d => d.status === 'Unresolved').reduce((acc, curr) => acc + curr.value, 0);
  const recovered = data.filter(d => d.status === 'Recovered').reduce((acc, curr) => acc + curr.value, 0);

  const markRecovered = (id) => {
    setData(data.map(d => d.id === id ? { ...d, status: 'Recovered' } : d));
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Financial Intelligence</p>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TrendingDown size={32} style={{ color: '#b91c1c' }} /> Revenue Leakage Tracker
          </h1>
        </div>
        <button style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary-dark)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,59,68,0.2)' }}>
          <FileSearch size={20} /> Run Full System Scan
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#fef2f2', color: '#b91c1c' }}><AlertCircle size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>IDENTIFIED LEAKAGE</p>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#b91c1c' }}>RWF {totalLeakage.toLocaleString()}</p>
          </div>
        </div>
        
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f0fdf4', color: '#16a34a' }}><DollarSign size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>RECOVERED REVENUE</p>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#16a34a' }}>RWF {recovered.toLocaleString()}</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f0f9ff', color: '#0284c7' }}><Activity size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>PENDING AUDITS</p>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{data.filter(d => d.status === 'Unresolved').length}</p>
          </div>
        </div>
      </div>

      {/* ── Data Table ── */}
      <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Discrepancy Matrix</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>
              <option value="All">All Statuses</option>
              <option value="Unresolved">Unresolved</option>
              <option value="Recovered">Recovered</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ padding: '1.25rem 2rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Reference / Patient</th>
                <th style={{ padding: '1.25rem 1rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Clinical Event</th>
                <th style={{ padding: '1.25rem 1rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Billing Status</th>
                <th style={{ padding: '1.25rem 1rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Value At Risk</th>
                <th style={{ padding: '1.25rem 2rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(row => (
                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s', opacity: row.status === 'Recovered' ? 0.6 : 1 }}>
                  <td style={{ padding: '1.25rem 2rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>{row.id} · {row.date}</div>
                    <div style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{row.patient}</div>
                  </td>
                  <td style={{ padding: '1.25rem 1rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{row.service}</div>
                    <div style={{ fontSize: '0.8rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><CheckCircle size={12} /> {row.clinicalLog}</div>
                  </td>
                  <td style={{ padding: '1.25rem 1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: row.status === 'Recovered' ? '#16a34a' : '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {row.status === 'Recovered' ? <CheckCircle size={14} /> : <AlertCircle size={14} />} {row.billingLog}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1rem', fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                    RWF {row.value.toLocaleString()}
                  </td>
                  <td style={{ padding: '1.25rem 2rem' }}>
                    {row.status === 'Unresolved' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => markRecovered(row.id)} style={{ padding: '6px 12px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Resolve <CheckCircle size={14} />
                        </button>
                        <button style={{ padding: '6px 12px', backgroundColor: '#fff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Audit <ArrowRight size={14} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a' }}>Recovered</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                 <tr>
                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No records found matching criteria.</td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RevenueLeakageTracker;
