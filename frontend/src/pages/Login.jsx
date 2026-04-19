import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, devLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
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
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <img src="/logo.png" alt="Legacy Clinics" style={{ height: '64px', marginBottom: '1.5rem', objectFit: 'contain' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>Reporting Portal</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Secure Clinical & Administrative Login
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
            gap: '10px',
            marginBottom: '2rem'
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)', marginLeft: '4px' }}>Staff Username</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px 12px 46px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem', transition: 'all 0.2s' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)', marginLeft: '4px' }}>Security Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)'
                }} />

                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 46px',
                    backgroundColor: '#f8fafc',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s'
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-label={loading ? 'Authenticating...' : 'Sign In'}
            style={{
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#003b44',
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
