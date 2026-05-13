import { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import api from '../api/axios';

const field = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};
const label = {
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};
const inputBase = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1.5px solid #e2e8f0',
  fontSize: '0.95rem',
  outline: 'none',
  transition: 'border-color 0.2s',
  backgroundColor: '#f8fafc',
  boxSizing: 'border-box',
};

const PasswordInput = ({ value, onChange, placeholder, autoFocus }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder || '••••••••'}
        autoFocus={autoFocus}
        required
        style={{ ...inputBase, paddingRight: '42px' }}
        onFocus={e => (e.target.style.borderColor = '#007b8a')}
        onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}
        tabIndex={-1}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

const ChangePasswordModal = ({ onClose }) => {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

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
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e', '#059669'][strength];

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmPassword) return setError('Passwords do not match.');
    if (form.newPassword.length < 4) return setError('New password must be at least 4 characters.');
    setLoading(true);
    try {
      await api.post('/auth/password/change', { oldPassword: form.oldPassword, newPassword: form.newPassword });
      setSuccess(true);
      setTimeout(onClose, 2200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <ShieldCheck size={28} color="#16a34a" />
        </div>
        <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Password Updated</h3>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>Your credentials have been secured. Closing shortly…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.25rem 0' }}>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c', fontSize: '0.85rem' }}>
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Current Password */}
      <div style={field}>
        <label style={label}>Current Password</label>
        <PasswordInput value={form.oldPassword} onChange={set('oldPassword')} autoFocus />
      </div>

      {/* New Password */}
      <div style={field}>
        <label style={label}>New Password</label>
        <PasswordInput value={form.newPassword} onChange={set('newPassword')} />
        {form.newPassword && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <div style={{ flex: 1, height: 4, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(strength / 5) * 100}%`, background: strengthColor, borderRadius: 99, transition: 'all 0.3s ease' }} />
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: strengthColor, minWidth: 64 }}>{strengthLabel}</span>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div style={field}>
        <label style={label}>Confirm New Password</label>
        <PasswordInput value={form.confirmPassword} onChange={set('confirmPassword')} />
        {form.confirmPassword && form.newPassword !== form.confirmPassword && (
          <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 2 }}>Passwords don't match</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
        <button
          type="button"
          onClick={onClose}
          style={{ flex: 1, padding: '0.7rem', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{ flex: 2, padding: '0.7rem', borderRadius: 8, border: 'none', background: loading ? '#94a3b8' : '#007b8a', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}
        >
          {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Updating…</> : <><Lock size={15} /> Update Password</>}
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </form>
  );
};

export default ChangePasswordModal;
