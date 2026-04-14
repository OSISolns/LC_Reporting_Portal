import { useState } from 'react';
import { Lock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import api from '../api/axios';

const ChangePasswordModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 4) {
      setError('New password must be at least 4 characters long');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/password/change', {
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword
      });
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="medical-form-modern" style={{ padding: '0.5rem' }}>
      {success ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: 'rgba(7, 137, 107, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <ShieldCheck size={32} color="#07896b" />
          </div>
          <h3 style={{ color: '#07896b', marginBottom: '0.5rem' }}>Password Updated!</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Your security credentials have been successfully modernized.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={14} />
              Ensure your new password is secure and not used elsewhere.
            </p>
          </div>

          {error && (
            <div style={{ padding: '12px', backgroundColor: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '8px', color: '#c53030', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '0.9rem' }}>Current Password</label>
            <input
              type="password"
              required
              value={formData.oldPassword}
              onChange={(e) => setFormData({ ...formData, oldPassword: e.target.value })}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid var(--border-color)', outline: 'none' }}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '0.9rem' }}>New Password</label>
            <input
              type="password"
              required
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid var(--border-color)', outline: 'none' }}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '0.9rem' }}>Confirm New Password</label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid var(--border-color)', outline: 'none' }}
              placeholder="••••••••"
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={loading}
              style={{ flex: 1, padding: '0.75rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Update Password'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '0.75rem', backgroundColor: '#e2e8f0', color: 'var(--text-primary)', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ChangePasswordModal;
