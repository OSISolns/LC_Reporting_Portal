import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff, ShieldAlert, ShieldCheck, AlertCircle, Loader2, LogOut } from 'lucide-react';
import api from '../api/axios';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, setUser, loading, logout } = useAuth();
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (loading) return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#0f172a' 
    }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#00b4d8', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  
  if (!user) return <Navigate to="/login" replace />;

  // Intercept and force password change on first login / administrative reset
  if (user.mustChangePassword) {
    const strength = (() => {
      const p = form.newPassword;
      if (!p) return 0;
      let s = 0;
      if (p.length >= 6) s++;
      if (p.length >= 10) s++;
      if (/[A-Z]/.test(p)) s++;
      if (/[0-9]/.test(p)) s++;
      if (/[^A-Za-z0-9]/.test(p)) s++;
      return s;
    })();

    const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength];
    const strengthColor = ['', '#f87171', '#fbbf24', '#60a5fa', '#34d399', '#059669'][strength];

    const handleSubmit = async e => {
      e.preventDefault();
      setError('');
      if (form.newPassword !== form.confirmPassword) return setError('New passwords do not match.');
      if (form.newPassword.length < 6) return setError('New password must be at least 6 characters.');
      if (form.newPassword === form.oldPassword) return setError('New password cannot be the same as your current temporary password.');
      if (strength < 3) return setError('Please choose a stronger password (at least Good).');

      setSubmitLoading(true);
      try {
        await api.post('/auth/password/change', { 
          oldPassword: form.oldPassword, 
          newPassword: form.newPassword 
        });
        setSuccess(true);
        setTimeout(() => {
          setUser(prev => ({ ...prev, mustChangePassword: false }));
        }, 2000);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to update password. Please verify current password.');
      } finally {
        setSubmitLoading(false);
      }
    };

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top right, #1e1b4b 0%, #0f172a 100%)',
        padding: '2rem 1rem',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#f8fafc'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '480px',
          backdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '2.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'fadeIn 0.6s ease'
        }}>
          {/* Logo */}
          <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
            <img src="/logo.png" alt="Legacy Clinics" style={{ height: '42px', objectFit: 'contain' }} />
          </div>

          {success ? (
            <div style={{ textAlign: 'center', width: '100%', padding: '1rem 0' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(52, 211, 153, 0.1)',
                border: '2px solid #34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                color: '#34d399'
              }}>
                <ShieldCheck size={36} className="animate-bounce" />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px', color: '#34d399' }}>Security Verified</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>Your account password has been secured. Loading your portal workspace...</p>
            </div>
          ) : (
            <>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1.5px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
                color: '#f87171'
              }}>
                <ShieldAlert size={28} />
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px', textAlign: 'center', letterSpacing: '-0.02em' }}>
                Password Update Required
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0 0 1.75rem', textAlign: 'center', lineHeight: '1.5' }}>
                This is your first login or your credentials have been reset. For absolute security, please establish a strong personal password to continue.
              </p>

              {error && (
                <div style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'start',
                  gap: '10px',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '12px',
                  color: '#fca5a5',
                  fontSize: '0.82rem',
                  marginBottom: '1.5rem',
                  boxSizing: 'border-box'
                }}>
                  <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ lineHeight: '1.4' }}>{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Current Temporary Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Current Temporary Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showOld ? 'text' : 'password'}
                      value={form.oldPassword}
                      onChange={e => setForm(f => ({ ...f, oldPassword: e.target.value }))}
                      placeholder="Enter temporary password"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 42px 12px 14px',
                        backgroundColor: 'rgba(15, 23, 42, 0.4)',
                        border: '1.5px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '0.92rem',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={e => e.target.style.borderColor = '#38bdf8'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOld(!showOld)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}
                    >
                      {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Secure Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    New Personal Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={form.newPassword}
                      onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                      placeholder="Establish secure password"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 42px 12px 14px',
                        backgroundColor: 'rgba(15, 23, 42, 0.4)',
                        border: '1.5px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '0.92rem',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={e => e.target.style.borderColor = '#38bdf8'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {form.newPassword && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <div style={{ flex: 1, height: '4px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(strength / 5) * 100}%`, backgroundColor: strengthColor, transition: 'all 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: strengthColor }}>{strengthLabel}</span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Confirm New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      placeholder="Repeat secure password"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 42px 12px 14px',
                        backgroundColor: 'rgba(15, 23, 42, 0.4)',
                        border: '1.5px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '0.92rem',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={e => e.target.style.borderColor = '#38bdf8'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                    <span style={{ fontSize: '0.72rem', color: '#f87171' }}>Passwords do not match</span>
                  )}
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={submitLoading || !form.oldPassword || !form.newPassword || form.newPassword !== form.confirmPassword}
                  style={{
                    marginTop: '0.5rem',
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: submitLoading || strength < 3 ? 'rgba(56, 189, 248, 0.3)' : '#0284c7',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    cursor: submitLoading || strength < 3 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)'
                  }}
                >
                  {submitLoading ? (
                    <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Securing Account…</>
                  ) : (
                    <><Lock size={15} /> Establish Secure Credentials</>
                  )}
                </button>
              </form>

              {/* Logout Option */}
              <button
                onClick={logout}
                style={{
                  marginTop: '1.5rem',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={e => e.target.style.color = '#f87171'}
                onMouseLeave={e => e.target.style.color = '#94a3b8'}
              >
                <LogOut size={14} /> Cancel & Logout
              </button>
            </>
          )}
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-spin { animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
