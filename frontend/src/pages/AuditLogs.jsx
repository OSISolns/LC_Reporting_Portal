import { useState, useEffect } from 'react';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { PrintHeader, PrintFooter } from '../components/PrintBranding';
import { 
  History, Search, User, Activity, Eye, Info, Clock, 
  Terminal, Download, Filter, Calendar, ShieldAlert, 
  Database, RefreshCw, FileText, CheckCircle2 
} from 'lucide-react';
import Modal from '../components/Modal';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    actionType: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    security: 0,
    dataChanges: 0,
    system: 0
  });
  const [exporting, setExporting] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.actionType) queryParams.append('action', filters.actionType);

      const res = await api.get(`/audit?${queryParams.toString()}`).catch(() => ({ data: { data: [] } }));
      const data = res.data.data || [];
      setLogs(data);
      
      // Calculate simple stats
      setStats({
        total: data.length,
        security: data.filter(l => l.action.includes('SECURITY') || l.action.includes('LOGIN')).length,
        dataChanges: data.filter(l => ['CREATE', 'UPDATE', 'DELETE'].includes(l.action)).length,
        system: data.filter(l => !l.action.includes('SECURITY') && !['CREATE', 'UPDATE', 'DELETE'].includes(l.action)).length
      });
    } catch (err) {
      console.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters.startDate, filters.endDate, filters.actionType]);

  const filteredLogs = logs.filter(log => 
    log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.actionType) queryParams.append('action', filters.actionType);

      const res = await api.get(`/audit/export/excel?${queryParams.toString()}`, { responseType: 'blob' });
      
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      let filename = `system_audit_logs_${new Date().toISOString().split('T')[0]}`;
      link.setAttribute('download', `${filename}.xlsx`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export audit logs as Excel.');
    } finally {
      setExporting(false);
    }
  };

  const getActionColor = (action) => {
    if (action.includes('SECURITY') || action.includes('VIOLATION')) return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
    if (action === 'DELETE' || action === 'REJECT') return { bg: '#fff7ed', text: '#ea580c', border: '#ffedd5' };
    if (action === 'CREATE' || action === 'APPROVE') return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' };
    if (action === 'UPDATE' || action === 'EDIT') return { bg: '#eff6ff', text: '#2563eb', border: '#dbeafe' };
    return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' };
  };

  const renderDetails = (details) => {
    if (!details) return <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No additional details available.</p>;
    if (typeof details === 'string') return <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{details}</p>;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Object.entries(details).map(([key, value]) => (
          <div key={key} style={{ 
            display: 'grid', 
            gridTemplateColumns: '140px 1fr', 
            padding: '8px 12px', 
            backgroundColor: '#f8fafc', 
            borderRadius: '6px',
            border: '1px solid #f1f5f9'
          }}>
            <span style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{key.replace(/_/g, ' ')}</span>
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary-dark)', wordBreak: 'break-all' }}>
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="print-body-wrapper" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <PrintHeader title="SYSTEM AUDIT LOGS" docType="ADT" />
      
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
            <div style={{ padding: '8px', backgroundColor: 'var(--primary)', color: '#ffffff', borderRadius: '10px' }}>
              <History size={24} />
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary-dark)', margin: 0, letterSpacing: '-0.02em' }}>Security Audit</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '600px' }}>
            Immutable ledger of system activity and administrative interventions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchLogs}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', backgroundColor: '#ffffff', border: '1.5px solid var(--border-color)', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button 
            onClick={exportToExcel}
            disabled={exporting}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '0.75rem 1.5rem', 
              backgroundColor: exporting ? '#94a3b8' : 'var(--primary-dark)', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: '12px', 
              fontWeight: 700, 
              cursor: exporting ? 'not-allowed' : 'pointer', 
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              transition: 'all 0.2s'
            }}
          >
            {exporting ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
            Export Excel
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Events', val: stats.total, icon: <Activity size={20} />, color: '#003b44' },
          { label: 'Security Alerts', val: stats.security, icon: <ShieldAlert size={20} />, color: '#dc2626' },
          { label: 'Data Modifications', val: stats.dataChanges, icon: <Database size={20} />, color: '#2563eb' },
          { label: 'System Tasks', val: stats.system, icon: <Terminal size={20} />, color: '#64748b' }
        ].map((s, idx) => (
          <div key={idx} className="glass card-shadow" style={{ padding: '1.5rem', borderRadius: '16px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '12px', backgroundColor: `${s.color}15`, color: s.color, borderRadius: '12px' }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-dark)', lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="glass card-shadow no-print" style={{ padding: '1.5rem', marginBottom: '2rem', backgroundColor: '#ffffff', borderRadius: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 180px 200px', gap: '1.25rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Search Query</label>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Name, role or action..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '12px 14px 12px 42px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', fontSize: '0.95rem' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Start Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="date" 
                value={filters.startDate}
                onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
                style={{ width: '100%', padding: '11px 12px 11px 38px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', fontSize: '0.85rem' }} 
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>End Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="date" 
                value={filters.endDate}
                onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
                style={{ width: '100%', padding: '11px 12px 11px 38px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', fontSize: '0.85rem' }} 
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Action Category</label>
            <div style={{ position: 'relative' }}>
              <Filter size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <select 
                value={filters.actionType}
                onChange={(e) => setFilters(f => ({ ...f, actionType: e.target.value }))}
                style={{ width: '100%', padding: '11px 12px 11px 38px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                <option value="">All Categories</option>
                <option value="LOGIN">Security: Logins</option>
                <option value="CREATE">Data: Creation</option>
                <option value="UPDATE">Data: Modification</option>
                <option value="DELETE">Data: Deletion</option>
                <option value="SECURITY">System: Alerts</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="glass card-shadow" style={{ overflow: 'hidden', backgroundColor: '#ffffff', borderRadius: '16px' }}>
        {loading ? (
          <div style={{ padding: '6rem 0' }}><LoadingSpinner /></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', backgroundColor: '#f8fafc', borderBottom: '2px solid var(--bg-color)' }}>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamp</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personnel</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Operational Action</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Module</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Inspection</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => {
                const styles = getActionColor(log.action);
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="hover-row">
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={14} style={{ color: 'var(--text-secondary)' }} />
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{new Date(log.created_at).toLocaleDateString()}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{new Date(log.created_at).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--bg-color)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800 }}>
                          {log.user_name?.[0]?.toUpperCase() || 'S'}
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-dark)', margin: 0 }}>{log.user_name}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>{log.user_role?.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span style={{ 
                        padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800,
                        backgroundColor: styles.bg, color: styles.text, border: `1px solid ${styles.border}`,
                        display: 'inline-flex', alignItems: 'center', gap: '6px'
                      }}>
                        {log.action.includes('SECURITY') && <ShieldAlert size={12} />}
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Database size={14} style={{ color: 'var(--text-secondary)' }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)', textTransform: 'capitalize' }}>
                          {log.entity_type?.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => setSelectedLog(log)}
                        style={{
                          padding: '8px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(0,123,138,0.08)',
                          color: 'var(--primary)',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        className="btn-icon"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '4rem', textAlign: 'center' }}>
                    <Info size={40} style={{ color: 'var(--border-color)', marginBottom: '1rem' }} />
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No audit trails match your current filter parameters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Investigation Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Forensic Event Investigation"
        maxWidth="750px"
      >
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ 
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem',
              padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0'
            }}>
              {[
                { label: 'Event Timestamp', val: new Date(selectedLog.created_at).toLocaleString(), icon: <Clock size={16} /> },
                { 
                  label: 'Network Origin (IP)', 
                  val: (() => {
                    let ip = selectedLog.ip_address;
                    if (ip === '::1') return '127.0.0.1';
                    if (ip && ip.startsWith('::ffff:')) return ip.substring(7);
                    return ip || 'Internal System';
                  })(), 
                  icon: <Terminal size={16} /> 
                },
                { label: 'Executing Officer', val: selectedLog.user_name || 'System', icon: <User size={16} /> },
                { label: 'Officer Authority Role', val: selectedLog.user_role?.toUpperCase() || 'SYSTEM / AUTOMATED', icon: <CheckCircle2 size={16} /> },
                { label: 'Impacted Module', val: selectedLog.entity_type?.toUpperCase() || 'GLOBAL SYSTEM', icon: <Database size={16} /> },
                { label: 'Target / Entity Record ID', val: selectedLog.entity_id ? `# ${selectedLog.entity_id}` : 'N/A (Global / Structural Action)', icon: <FileText size={16} /> },
                { 
                  label: 'AI IP Location Analysis', 
                  val: (() => {
                    let ip = selectedLog.ip_address || '127.0.0.1';
                    if (ip === '::1') ip = '127.0.0.1';
                    if (ip.startsWith('::ffff:')) ip = ip.substring(7);
                    if (ip === '127.0.0.1' || ip === 'localhost' || 
                        ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.') || 
                        ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.') || 
                        ip.startsWith('172.20.') || ip.startsWith('172.21.') || ip.startsWith('172.22.') || 
                        ip.startsWith('172.23.') || ip.startsWith('172.24.') || ip.startsWith('172.25.') || 
                        ip.startsWith('172.26.') || ip.startsWith('172.27.') || ip.startsWith('172.28.') || 
                        ip.startsWith('172.29.') || ip.startsWith('172.30.') || ip.startsWith('172.31.') ||
                        ip.startsWith('197.85.') || ip.startsWith('41.186.') || ip.startsWith('197.243.')) {
                      return '🏥 Work Network (Clinic Subnet)';
                    } else if (ip.startsWith('105.178.') || ip.startsWith('196.223.') || ip.startsWith('197.244.') || ip.startsWith('41.216.')) {
                      return '🏠 Home Network (MTN/Airtel Rwanda)';
                    } else {
                      return '⚠️ Elsewhere Network (External/Abroad)';
                    }
                  })(), 
                  icon: <Activity size={16} /> 
                },
                { label: 'Event Classification', val: selectedLog.action, icon: <ShieldAlert size={16} /> }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>{item.icon}</div>
                  <div>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.02em' }}>{item.label}</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{item.val}</p>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--bg-color)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={18} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', margin: 0 }}>Payload Data</h3>
              </div>
              <div style={{ 
                padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '16px', border: '1.5px solid #f1f5f9',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)', maxHeight: '400px', overflowY: 'auto'
              }}>
                {renderDetails(selectedLog.details)}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '0.5rem' }}>
              <button 
                onClick={() => setSelectedLog(null)}
                style={{ padding: '0.8rem 1.5rem', backgroundColor: '#f1f5f9', color: 'var(--primary-dark)', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Close Investigation
              </button>
              <button 
                className="no-print"
                onClick={() => window.print()}
                style={{ padding: '0.8rem 1.5rem', backgroundColor: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Download size={18} />
                Print Record
              </button>
            </div>
          </div>
        )}
      </Modal>

      <PrintFooter />
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .hover-row:hover { background-color: #f8fafc !important; cursor: pointer; }
        .btn-icon:hover { transform: scale(1.1); background-color: rgba(0,123,138,0.15) !important; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AuditLogs;

