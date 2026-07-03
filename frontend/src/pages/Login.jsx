import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle, Eye, EyeOff, MessageSquare } from 'lucide-react';
import FeedbackModal from '../components/FeedbackModal';


const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, devLogin } = useAuth();
  const navigate = useNavigate();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);


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

  const rot13 = (s) => s.replace(/[a-zA-Z]/g, c => String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26));

  useEffect(() => {
    const checkSignature = () => {
      const sigId = rot13('if-fvt');
      // The text on screen should literally be the encoded string
      const displayedText = 'Inyrel Fgehpgher';
      const el = document.getElementById(sigId);

      // Verify both that the element exists and contains the encoded text, 
      // and that decoding it yields the original author's signature
      if (!el || el.innerText !== displayedText || rot13(el.innerText) !== 'Valery Structure') {
        console.warn('System signature integrity check failed.');
      }
    };

    const interval = setInterval(checkSignature, 3000);
    return () => clearInterval(interval);
  }, []);


  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1c69a0',
      backgroundImage: 'linear-gradient(135deg, #1c69a0 0%, #71b647 100%)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Watermark */}
      <img
        src="/caduceus_bg.png"
        alt=""
        style={{
          position: 'absolute',
          bottom: '-2rem',
          left: '-2rem',
          height: '400px',
          opacity: 0.07,
          pointerEvents: 'none',
          zIndex: 0,
          transform: 'rotate(15deg)'
        }}
      />
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>Lumina Portal</h1>
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

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '1.5rem 0 0.5rem 0',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '1px',
            backgroundColor: 'var(--border-color)',
            zIndex: 1
          }}></div>
          <span style={{
            position: 'relative',
            zIndex: 2,
            backgroundColor: '#ffffff',
            padding: '0 12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>Staff Feedback</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => setShowFeedbackModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1.5px dashed #1b669d',
              backgroundColor: 'rgba(27, 102, 157, 0.03)',
              color: '#1b669d',
              fontWeight: 600,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginTop: '0.25rem'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(27, 102, 157, 0.08)';
              e.currentTarget.style.borderStyle = 'solid';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(27, 102, 157, 0.03)';
              e.currentTarget.style.borderStyle = 'dashed';
            }}
          >
            <MessageSquare size={14} />
            Internal Feedback / Ibitekerezo
          </button>
        </div>
      </div>

      <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />


      {/* Subtle Protected Signature */}
      <div
        id={rot13('if-fvt')}
        style={{
          position: 'fixed',
          bottom: '8px',
          right: '8px',
          fontSize: '10px',
          fontFamily: 'monospace',
          color: 'rgba(0, 0, 0, 0.15)',
          userSelect: 'none',
          pointerEvents: 'none',
          zIndex: 9999,
          letterSpacing: '0.05em',
          opacity: 0.8
        }}
      >
        {rot13('Inyrel Fgehpgher') === 'Valery Structure' ? 'Inyrel Fgehpgher' : ''}
      </div>
    </div>
  );
};

export default Login;
