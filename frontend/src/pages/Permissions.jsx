import { useState, useEffect } from 'react';
import { Shield, Save, RefreshCw, CheckCircle2, AlertCircle, X, ChevronRight, Lock, Key, Eye, EyeOff, Copy, Check, Calendar, History, User } from 'lucide-react';
import { getModules, getRoleMatrix, updateRolePermissions, resetRolePermissions, getUnlockLogs, getStockPassword, regenerateStockPassword } from '../api/permissions';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

// Dynamic month generation (from March 2026 to Current Month)
const generateMonths = () => {
  const months = [];
  const start = new Date(2026, 2, 1); // March 2026
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);

  let current = new Date(start);
  while (current <= end) {
    const yr = current.getFullYear();
    const mo = String(current.getMonth() + 1).padStart(2, '0');
    months.push(`${yr}-${mo}`);
    current.setMonth(current.getMonth() + 1);
  }
  return months.reverse(); // Newest first
};
const DYNAMIC_MONTHS = generateMonths();
const CURRENT_MONTH_STR = DYNAMIC_MONTHS[0];

const getMonthLabel = (YYYY_MM) => {
  if (!YYYY_MM) return '';
  const [y, m] = YYYY_MM.split('-');
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
};

const Permissions = () => {
  const [modules, setModules] = useState([]);
  const [roleMatrix, setRoleMatrix] = useState({});
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const [activeTab, setActiveTab] = useState('roles'); // 'roles' or 'stock_unlock'
  const [unlockLogs, setUnlockLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH_STR);
  const [monthPasscode, setMonthPasscode] = useState(null);
  const [loadingPasscode, setLoadingPasscode] = useState(false);
  const [regeneratingPasscode, setRegeneratingPasscode] = useState(false);
  const [passcodeVisible, setPasscodeVisible] = useState(false);
  const [copiedPasscode, setCopiedPasscode] = useState(false);

  const loadPasscode = async (month) => {
    setLoadingPasscode(true);
    try {
      const res = await getStockPassword(month);
      if (res.success) {
        setMonthPasscode(res.password);
      } else {
        setMonthPasscode(null);
      }
    } catch (err) {
      console.error('Failed to load passcode:', err);
      showToast('Failed to load passcode for the selected month.', 'error');
    } finally {
      setLoadingPasscode(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await getUnlockLogs();
      if (res.success) {
        setUnlockLogs(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch unlock logs:', err);
      showToast('Failed to fetch stock unlock logs.', 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleRegeneratePasscode = async () => {
    setRegeneratingPasscode(true);
    try {
      const res = await regenerateStockPassword(selectedMonth);
      if (res.success) {
        setMonthPasscode(res.password);
        setPasscodeVisible(true);
        setCopiedPasscode(false);
        showToast(`Passcode generated successfully for ${getMonthLabel(selectedMonth)}.`, 'success');
      }
    } catch (err) {
      console.error('Failed to regenerate passcode:', err);
      showToast(err.response?.data?.message || 'Failed to regenerate passcode.', 'error');
    } finally {
      setRegeneratingPasscode(false);
    }
  };

  const handleCopyPasscode = () => {
    if (!monthPasscode) return;
    navigator.clipboard.writeText(monthPasscode).then(() => {
      setCopiedPasscode(true);
      setTimeout(() => setCopiedPasscode(false), 2000);
    });
  };

  useEffect(() => {
    if (activeTab === 'stock_unlock') {
      loadPasscode(selectedMonth);
    }
  }, [activeTab, selectedMonth]);

  useEffect(() => {
    if (activeTab === 'stock_unlock') {
      fetchLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [modulesRes, matrixRes] = await Promise.all([
        getModules(),
        getRoleMatrix()
      ]);
      setModules(modulesRes.data || []);
      setRoleMatrix(matrixRes.data || {});
      
      const roles = Object.keys(matrixRes.data || {});
      if (roles.length > 0 && !selectedRole) {
        setSelectedRole(roles[0]);
      }
    } catch (err) {
      console.error('Failed to fetch permissions data', err);
      showToast('System Error: Could not retrieve permission matrix.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggle = (moduleName, action) => {
    const newMatrix = { ...roleMatrix };
    if (!newMatrix[selectedRole][moduleName]) {
      newMatrix[selectedRole][moduleName] = {};
    }
    newMatrix[selectedRole][moduleName][action] = !newMatrix[selectedRole][moduleName][action];
    setRoleMatrix(newMatrix);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRolePermissions(selectedRole, roleMatrix[selectedRole]);
      showToast(`Access protocols for "${selectedRole}" updated successfully.`, 'success');
      setHasChanges(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to sync permissions with the secure server.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetting(true);
    try {
      await resetRolePermissions(selectedRole, adminPassword);
      showToast(`Protocol synchronization complete. "${selectedRole}" has been reset to system defaults.`, 'success');
      setIsResetModalOpen(false);
      setAdminPassword('');
      fetchData(); // Reload data
    } catch (err) {
      showToast(err.response?.data?.message || 'Administrative verification failed.', 'error');
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const roles = Object.keys(roleMatrix);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderRadius: '12px',
          backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
          minWidth: '320px',
          animation: 'slideInRight 0.3s ease',
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={22} color='#16a34a' /> : <AlertCircle size={22} color='#dc2626' />}
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: toast.type === 'success' ? '#15803d' : '#dc2626', flex: 1 }}>
            {toast.message}
          </span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={16} /></button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Access Control Matrix
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '600px' }}>
            Configure granular functional permissions for system roles. Changes take effect immediately across all sessions.
          </p>
        </div>
        
        {activeTab === 'roles' && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => setIsResetModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.875rem 1.5rem',
                backgroundColor: 'transparent',
                color: 'var(--danger)',
                border: '1.5px solid rgba(220, 53, 69, 0.2)',
                borderRadius: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={18} />
              Reset to Defaults
            </button>

            {hasChanges && (
              <button 
                onClick={handleSave}
                disabled={saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '0.875rem 1.75rem',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                {saving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                Commit Changes
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '2rem',
        paddingBottom: '2px'
      }}>
        <button
          onClick={() => setActiveTab('roles')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'roles' ? '3px solid var(--primary)' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'roles' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'roles' ? 700 : 500,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-3px'
          }}
        >
          <Shield size={18} />
          Role Permissions
        </button>
        <button
          onClick={() => setActiveTab('stock_unlock')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'stock_unlock' ? '3px solid var(--primary)' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'stock_unlock' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'stock_unlock' ? 700 : 500,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-3px'
          }}
        >
          <Key size={18} />
          Stock Unlock Passcode & Logs
        </button>
      </div>

      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Role Selector Sidebar */}
          <div className="glass card-shadow" style={{ padding: '1rem', backgroundColor: '#ffffff', borderRadius: '16px' }}>
            <div style={{ padding: '0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System Roles
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {roles.map(role => (
                <button
                  key={role}
                  onClick={() => {
                    if (hasChanges && !window.confirm('You have unsaved changes. Discard them?')) return;
                    setSelectedRole(role);
                    setHasChanges(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: selectedRole === role ? 'rgba(0, 123, 138, 0.08)' : 'transparent',
                    color: selectedRole === role ? 'var(--primary)' : 'var(--text-primary)',
                    fontWeight: selectedRole === role ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Shield size={16} style={{ opacity: selectedRole === role ? 1 : 0.4 }} />
                    {role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  {selectedRole === role && <ChevronRight size={16} />}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {selectedRole && (
              <div className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '10px', backgroundColor: 'var(--primary-dark)', color: '#ffffff', borderRadius: '10px' }}>
                    <Lock size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                      Permissions for {selectedRole.replace(/_/g, ' ').toUpperCase()}
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Defined functional capabilities for this user group.
                    </p>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Module</th>
                      <th style={{ padding: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>View</th>
                      <th style={{ padding: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Create</th>
                      <th style={{ padding: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Edit</th>
                      <th style={{ padding: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Review</th>
                      <th style={{ padding: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Approve</th>
                      <th style={{ padding: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Reject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map(mod => (
                      <tr key={mod.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '1.25rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{mod.display_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{mod.name}</div>
                        </td>
                        {['view', 'create', 'edit', 'review', 'approve', 'reject'].map(action => {
                          const isSupported = mod.actions.includes(action);
                          const isGranted = roleMatrix[selectedRole]?.[mod.name]?.[action];
                          
                          return (
                            <td key={action} style={{ padding: '1.25rem', textAlign: 'center' }}>
                              {isSupported ? (
                                <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={!!isGranted}
                                    onChange={() => handleToggle(mod.name, action)}
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      cursor: 'pointer',
                                      accentColor: 'var(--primary)',
                                    }}
                                  />
                                </label>
                              ) : (
                                <span style={{ fontSize: '0.7rem', color: '#cbd5e1', fontWeight: 600 }}>N/A</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div style={{ 
              padding: '1.25rem', 
              backgroundColor: 'rgba(0, 123, 138, 0.05)', 
              border: '1px dashed rgba(0, 123, 138, 0.2)', 
              borderRadius: '12px',
              fontSize: '0.85rem',
              color: 'var(--primary-dark)',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <AlertCircle size={18} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <strong>Audit Notice:</strong> All changes to the permission matrix are recorded in the system audit logs. 
                Modifying these settings may affect critical clinic workflows. Please verify all changes before committing.
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stock_unlock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Top Panel: Passcode Generator */}
          <div className="glass card-shadow" style={{ padding: '2rem', backgroundColor: '#ffffff', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <div style={{ padding: '10px', backgroundColor: 'rgba(0, 123, 138, 0.1)', color: 'var(--primary-dark)', borderRadius: '10px' }}>
                <Key size={22} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                  Daily Stock Checkup Passcode Generator
                </h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Generate and view monthly stock editing override passwords. Provide this passcode to nursing staff to temporarily unlock stock modifications.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-end' }}>
              
              {/* Month selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={16} />
                  Target Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{
                    padding: '12px',
                    backgroundColor: '#f8fafc',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {DYNAMIC_MONTHS.map(m => (
                    <option key={m} value={m}>{getMonthLabel(m)}</option>
                  ))}
                </select>
              </div>

              {/* Passcode input display */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1', minWidth: '300px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                  Active Passcode
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type={passcodeVisible ? "text" : "password"}
                      readOnly
                      value={loadingPasscode ? "Loading..." : (monthPasscode || "No passcode generated for this month")}
                      style={{
                        width: '100%',
                        padding: '12px 42px 12px 16px',
                        backgroundColor: monthPasscode ? '#f8fafc' : '#fff1f2',
                        border: `1.5px solid ${monthPasscode ? 'var(--border-color)' : '#fecaca'}`,
                        borderRadius: '10px',
                        fontSize: '1.1rem',
                        fontWeight: monthPasscode ? 700 : 500,
                        color: monthPasscode ? 'var(--text-primary)' : '#b91c1c',
                        letterSpacing: passcodeVisible && monthPasscode ? '0.15em' : 'normal',
                        outline: 'none'
                      }}
                    />
                    {monthPasscode && (
                      <button
                        type="button"
                        onClick={() => setPasscodeVisible(!passcodeVisible)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {passcodeVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                  </div>

                  {monthPasscode && (
                    <button
                      type="button"
                      onClick={handleCopyPasscode}
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: '#ffffff',
                        border: '1.5px solid var(--border-color)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: copiedPasscode ? '#10b981' : 'var(--text-primary)',
                        transition: 'all 0.2s'
                      }}
                      title="Copy Passcode"
                    >
                      {copiedPasscode ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Action button */}
              <div>
                <button
                  type="button"
                  onClick={handleRegeneratePasscode}
                  disabled={regeneratingPasscode || loadingPasscode}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    backgroundColor: monthPasscode ? 'var(--primary)' : '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 750,
                    cursor: 'pointer',
                    opacity: regeneratingPasscode || loadingPasscode ? 0.7 : 1,
                    transition: 'all 0.2s',
                    boxShadow: monthPasscode ? 'none' : '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
                    height: '46px'
                  }}
                >
                  <RefreshCw size={18} className={regeneratingPasscode ? "animate-spin" : ""} />
                  {monthPasscode ? "Regenerate Passcode" : "Generate Passcode"}
                </button>
              </div>

            </div>
          </div>

          {/* Bottom Panel: Unlock Logs */}
          <div className="glass card-shadow" style={{ padding: '2rem', backgroundColor: '#ffffff', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', backgroundColor: 'rgba(0, 123, 138, 0.1)', color: 'var(--primary-dark)', borderRadius: '10px' }}>
                  <History size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                    Daily Stock Unlock Audit Logs
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Audit record of all staff members who successfully unlocked stock editing permissions.
                  </p>
                </div>
              </div>
              
              <button
                onClick={fetchLogs}
                disabled={loadingLogs}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  transition: 'all 0.2s'
                }}
              >
                <RefreshCw size={14} className={loadingLogs ? "animate-spin" : ""} />
                Refresh Logs
              </button>
            </div>

            {loadingLogs ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
              </div>
            ) : unlockLogs.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                border: '1.5px dashed var(--border-color)',
                borderRadius: '12px',
                color: 'var(--text-secondary)',
                fontSize: '0.95rem'
              }}>
                <History size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                No stock unlock logs recorded in the system.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1.5px solid var(--border-color)', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', backgroundColor: '#f8fafc', borderBottom: '1.5px solid var(--border-color)' }}>
                      <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Target Month</th>
                      <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Staff Member</th>
                      <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Username</th>
                      <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Unlock Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unlockLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--primary-dark)' }}>
                          {getMonthLabel(log.month_year)}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 650 }}>
                            <User size={14} style={{ color: 'var(--text-secondary)' }} />
                            {log.full_name || 'N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          @{log.username}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          {new Date(log.unlocked_at).toLocaleString('default', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Reset to Defaults Modal */}
      <Modal 
        isOpen={isResetModalOpen} 
        onClose={() => {
          setIsResetModalOpen(false);
          setAdminPassword('');
        }} 
        title="Protocol Reset Authorization"
        maxWidth="500px"
      >
        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ 
            padding: '1.25rem', 
            backgroundColor: '#fff1f2', 
            borderRadius: '12px', 
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: '0.9rem',
            lineHeight: '1.5'
          }}>
            <p style={{ margin: '0 0 10px 0', fontWeight: 700 }}>CRITICAL SECURITY ACTION:</p>
            You are about to overwrite all customized permissions for the <strong>{selectedRole?.replace(/_/g, ' ').toUpperCase()}</strong> role with system defaults. This action cannot be reversed.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-dark)' }}>Administrative Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Verify identity to continue"
                style={{ 
                  width: '100%', 
                  padding: '12px 12px 12px 42px', 
                  backgroundColor: '#f8fafc', 
                  border: '1.5px solid var(--border-color)', 
                  borderRadius: '10px',
                  outline: 'none',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button 
              type="submit" 
              disabled={resetting || !adminPassword}
              style={{ 
                flex: 2, 
                padding: '0.875rem', 
                backgroundColor: '#ef4444', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '10px', 
                fontWeight: 700, 
                cursor: 'pointer',
                opacity: resetting || !adminPassword ? 0.7 : 1
              }}
            >
              {resetting ? 'Authorizing...' : 'Confirm Reset to Defaults'}
            </button>
            <button 
              type="button" 
              onClick={() => {
                setIsResetModalOpen(false);
                setAdminPassword('');
              }}
              style={{ 
                flex: 1, 
                padding: '0.875rem', 
                backgroundColor: '#f1f5f9', 
                color: 'var(--primary-dark)', 
                border: 'none', 
                borderRadius: '10px', 
                fontWeight: 600, 
                cursor: 'pointer' 
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
      
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Permissions;
