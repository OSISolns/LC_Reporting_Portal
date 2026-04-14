import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, devLogin } = useAuth();
  const navigate = useNavigate();
  const showDevBypass = import.meta.env.DEV;

  const demoAccounts = [
    { label: 'Select Demo Account', email: '', role: '' },
    { label: 'Cashier (John)', email: 'cashier@legacyclinics.com', role: 'Cashier' },
    { label: 'Customer Care (Sarah)', email: 'care@legacyclinics.com', role: 'Customer Care' },
    { label: 'Operations Staff (Mike)', email: 'ops@legacyclinics.com', role: 'Operations' },
    { label: 'Sales Manager (David)', email: 'sales@legacyclinics.com', role: 'Sales Manager' },
    { label: 'COO (Alice)', email: 'coo@legacyclinics.com', role: 'COO' },
    { label: 'Chairman (Robert)', email: 'chairman@legacyclinics.com', role: 'Chairman' },
  ];

  const handleDemoLogin = async (e) => {
    const selectedEmail = e.target.value;
    if (!selectedEmail) return;

    setError('');
    setLoading(true);

    try {
      await devLogin(selectedEmail);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Bypass failed. Database might be unreachable or user seeded incorrectly.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f1f5f9',
      backgroundImage: 'radial-gradient(at 0% 0%, rgba(0, 123, 138, 0.05) 0px, transparent 50%), radial-gradient(at 50% 0%, rgba(0, 59, 68, 0.05) 0px, transparent 50%)',
      padding: '1rem'
    }}>
      <div className="card-shadow" style={{
        width: '100%',
        maxWidth: '450px',
        padding: '3rem',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="Legacy Clinics" style={{ height: '64px', marginBottom: '1.5rem', objectFit: 'contain' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>Reporting Portal</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Clinical & Administrative Dashboard
          </p>
        </div>

        {showDevBypass && (
          <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              Quick Access (Bypass)
            </label>
            <select 
              onChange={handleDemoLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1.5px solid var(--border-color)',
                backgroundColor: '#ffffff',
                color: 'var(--primary-dark)',
                fontWeight: 600,
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {demoAccounts.map(account => (
                <option key={account.email} value={account.email}>
                  {account.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ position: 'relative', textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', backgroundColor: 'var(--border-color)', zIndex: 1 }}></div>
          <span style={{ position: 'relative', backgroundColor: '#ffffff', padding: '0 15px', color: 'var(--text-secondary)', fontSize: '0.8rem', zIndex: 2, fontWeight: 500 }}>
            OR SECURE LOGIN
          </span>
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
            gap: '10px',
            marginBottom: '2rem'
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@legacyclinics.com"
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--border-color)',
                  backgroundColor: '#ffffff',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '0.95rem',
                  transition: 'border-color 0.2s'
                }}
                className="focus-teal"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--border-color)',
                  backgroundColor: '#ffffff',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '1rem',
              marginTop: '1rem',
              boxShadow: '0 4px 6px -1px rgba(0, 123, 138, 0.2)',
              opacity: loading ? 0.7 : 1,
              cursor: 'pointer'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
