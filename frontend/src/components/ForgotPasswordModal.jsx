import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../api/axios';
import { KeyRound, Mail, AlertCircle, CheckCircle2, Send } from 'lucide-react';

const ForgotPasswordModal = ({ isOpen, onClose, initialUsername = '' }) => {
  const [username, setUsername] = useState(initialUsername);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUsername(initialUsername);
      setError('');
      setSuccessMessage('');
    }
  }, [isOpen, initialUsername]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!username.trim()) {
      setError('Please enter your staff username.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { username: username.trim() });
      if (res.data?.success) {
        setSuccessMessage(res.data.message || 'A temporary password has been sent to your registered email address.');
      } else {
        setError(res.data?.message || 'Failed to send temporary password.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to send temporary password. Please check your username or contact your system administrator.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccessMessage('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reset Password" maxWidth="480px">
      {successMessage ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle2 size={38} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-dark)', margin: 0 }}>
            Temporary Password Sent!
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
            {successMessage}
          </p>
          <button
            onClick={handleClose}
            style={{
              marginTop: '1rem',
              padding: '10px 24px',
              backgroundColor: '#003b44',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Back to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{
            padding: '1rem',
            borderRadius: '10px',
            backgroundColor: 'rgba(28, 105, 160, 0.08)',
            borderLeft: '4px solid #1c69a0',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start'
          }}>
            <KeyRound size={20} style={{ color: '#1c69a0', flexShrink: 0, marginTop: '2px' }} />
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e293b', lineHeight: '1.5' }}>
              Enter your staff username below. A temporary password will be generated and dispatched to your registered email address.
            </p>
          </div>

          {error && (
            <div style={{
              padding: '0.875rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(220, 53, 69, 0.1)',
              border: '1px solid rgba(220, 53, 69, 0.2)',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-dark)' }}>
              Staff Username
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Enter username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 46px',
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#f1f5f9',
                color: 'var(--text-secondary)',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                padding: '12px',
                backgroundColor: '#003b44',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Sending...' : 'Send Temporary Password'}
              <Send size={16} />
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ForgotPasswordModal;
