import { useState, useEffect } from 'react';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { PrintHeader, PrintFooter } from '../components/PrintBranding';
import { History, Search, User, Activity, Printer } from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/audit').catch(() => ({ data: { data: [] } }));
        setLogs(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch audit logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const handlePrint = () => {
    document.body.setAttribute('data-print-date', new Date().toLocaleString());
    window.print();
  };

  const filteredLogs = logs.filter(log => 
    log.user_name?.toLowerCase().includes(filter.toLowerCase()) ||
    log.action?.toLowerCase().includes(filter.toLowerCase()) ||
    log.entity_type?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="print-body-wrapper">
      <PrintHeader title="SYSTEM AUDIT LOGS" docType="ADT" />
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.25rem' }}>System Audit Logs</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Comprehensive tracking of all user actions and system state changes for regulatory compliance.</p>
        </div>
        <button 
          onClick={handlePrint} 
          className="glass card-shadow no-print" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', backgroundColor: '#ffffff', color: 'var(--primary-dark)', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
        >
          <Printer size={18} />
          Print Audit History
        </button>
      </div>


      <div className="glass card-shadow" style={{ padding: '1.25rem', marginBottom: '2rem', backgroundColor: '#ffffff' }}>
        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search logs by staff name, action type, or module..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: '100%', padding: '12px 14px 12px 46px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }}
          />
        </div>
      </div>

      <div className="glass card-shadow" style={{ overflow: 'hidden', backgroundColor: '#ffffff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--bg-color)', backgroundColor: '#f8fafc' }}>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event Timestamp</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staff Member</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action Taken</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Affected Entity</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Technical Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 500 }}>{new Date(log.created_at).toLocaleDateString()}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{new Date(log.created_at).toLocaleTimeString()}</div>
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(0,123,138,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                      {log.user_name?.[0] || <User size={14} />}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-dark)' }}>{log.user_name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{log.user_role}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <span style={{ 
                    padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                    backgroundColor: log.action === 'DELETE' || log.action === 'REJECT' ? 'rgba(220, 53, 69, 0.1)' : 'rgba(40, 167, 69, 0.1)',
                    color: log.action === 'DELETE' || log.action === 'REJECT' ? 'var(--danger)' : 'var(--success)',
                    border: log.action === 'DELETE' || log.action === 'REJECT' ? '1px solid rgba(220, 53, 69, 0.2)' : '1px solid rgba(40, 167, 69, 0.2)'
                  }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)', textTransform: 'capitalize' }}>
                  {log.entity_type.replace('_', ' ')}
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: 'var(--text-secondary)', 
                    fontFamily: 'monospace', 
                    backgroundColor: '#f8fafc',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }} title={JSON.stringify(log.details)}>
                    {JSON.stringify(log.details)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PrintFooter />
    </div>
  );
};

export default AuditLogs;
