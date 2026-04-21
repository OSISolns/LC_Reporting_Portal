import { useState, useEffect } from 'react';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { PrintHeader, PrintFooter } from '../components/PrintBranding';
import { History, Search, User, Activity, Eye, Info, Clock, Terminal } from 'lucide-react';
import Modal from '../components/Modal';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

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

  const filteredLogs = logs.filter(log => 
    log.user_name?.toLowerCase().includes(filter.toLowerCase()) ||
    log.action?.toLowerCase().includes(filter.toLowerCase()) ||
    log.entity_type?.toLowerCase().includes(filter.toLowerCase())
  );

  const renderValue = (val) => {
    if (typeof val === 'boolean') return val ? 'YES' : 'NO';
    if (val === null || val === undefined) return 'N/A';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const renderDetails = (details) => {
    if (!details) return <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No additional details available.</p>;
    
    // If it's a simple string, just show it
    if (typeof details === 'string') return <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{details}</p>;

    // Handle nested permissions specifically if it's that type of log
    if (details.permissions) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Object.entries(details.permissions).map(([mod, actions]) => (
            <div key={mod} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '8px' }}>{mod.replace(/_/g, ' ')}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {Object.entries(actions).map(([act, status]) => (
                  <div key={act} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: status ? 'var(--success)' : '#cbd5e1' }} />
                    <span style={{ fontWeight: 600 }}>{act}:</span>
                    <span style={{ color: status ? 'var(--success)' : 'var(--text-secondary)' }}>{status ? 'GRANTED' : 'DENIED'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Generic key-value renderer
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Object.entries(details).map(([key, value]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{key.replace(/_/g, ' ')}</span>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-dark)', textAlign: 'right' }}>
              {typeof value === 'object' ? JSON.stringify(value) : renderValue(value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="print-body-wrapper">
      <PrintHeader title="SYSTEM AUDIT LOGS" docType="ADT" />
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.25rem' }}>System Audit Logs</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Comprehensive tracking of all user actions and system state changes for regulatory compliance.</p>
        </div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--text-secondary)', 
                      fontFamily: 'monospace', 
                      backgroundColor: '#f1f5f9',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      maxWidth: '150px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                    </div>
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="no-print"
                      style={{
                        padding: '6px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(0,123,138,0.05)',
                        color: 'var(--primary)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="View Full Technical Details"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0,123,138,0.1)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0,123,138,0.05)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Technical Details Inspection Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Event Investigation"
        maxWidth="700px"
      >
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '1rem',
              padding: '1.25rem',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Event Time</p>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={16} style={{ color: 'var(--text-secondary)' }} />
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Responsible Officer</p>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedLog.user_name}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Activity size={16} style={{ color: 'var(--text-secondary)' }} />
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Action Type</p>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedLog.action}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Terminal size={16} style={{ color: 'var(--text-secondary)' }} />
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Network Address</p>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedLog.ip_address || 'Internal System'}</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={16} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-dark)' }}>Event Technical Breakdown</h3>
              </div>
              <div style={{ 
                padding: '1.25rem', 
                backgroundColor: '#ffffff', 
                borderRadius: '12px', 
                border: '1.5px solid #f1f5f9',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {renderDetails(selectedLog.details)}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button 
                onClick={() => setSelectedLog(null)}
                style={{ 
                  padding: '0.75rem 1.5rem', 
                  backgroundColor: '#f1f5f9', 
                  color: 'var(--primary-dark)', 
                  border: 'none', 
                  borderRadius: '10px', 
                  fontWeight: 700, 
                  cursor: 'pointer' 
                }}
              >
                Close Investigation
              </button>
            </div>
          </div>
        )}
      </Modal>

      <PrintFooter />
    </div>
  );
};

export default AuditLogs;

