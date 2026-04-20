import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ShieldAlert, Home, ArrowLeft, Lock } from 'lucide-react';

const Unauthorized = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 🚨 Report security violation to system admin
    const reportViolation = async () => {
      try {
        await api.post('/audit/report-violation', { 
          path: window.location.pathname 
        });
      } catch (err) {
        console.error('Failed to report security violation');
      }
    };
    reportViolation();
  }, []);

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#f8fafc',
      padding: '2rem'
    }}>
      <div style={{ 
        maxWidth: '500px', 
        width: '100%', 
        backgroundColor: '#ffffff', 
        borderRadius: '24px', 
        padding: '3rem', 
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.04)',
        border: '1px solid #e2e8f0',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Accent */}
        <div style={{ 
          position: 'absolute', 
          top: '-50px', 
          right: '-50px', 
          width: '150px', 
          height: '150px', 
          borderRadius: '50%', 
          backgroundColor: '#fef2f2',
          zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            backgroundColor: '#fef2f2', 
            borderRadius: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 2rem',
            color: '#dc2626'
          }}>
            <ShieldAlert size={40} />
          </div>

          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 800, 
            color: '#1e293b', 
            marginBottom: '1rem',
            letterSpacing: '-0.025em'
          }}>
            403 - Access Denied
          </h1>

          <p style={{ 
            color: '#64748b', 
            fontSize: '1.1rem', 
            lineHeight: 1.6, 
            marginBottom: '2.5rem' 
          }}>
            You do not have the required security clearing to access this sector of the clinical terminal. 
            Detailed unauthorized access attempts are logged for system audit.
          </p>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem' 
          }}>
            <button 
              onClick={() => navigate('/')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '10px', 
                padding: '12px 24px', 
                backgroundColor: '#1e293b', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '12px', 
                fontWeight: 700, 
                fontSize: '1rem', 
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0f172a'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#1e293b'; e.currentTarget.style.transform = 'none'; }}
            >
              <Home size={18} /> Return to Dashboard
            </button>
            
            <button 
              onClick={() => navigate(-1)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '10px', 
                padding: '12px 24px', 
                backgroundColor: 'transparent', 
                color: '#64748b', 
                border: '1.5px solid #e2e8f0', 
                borderRadius: '12px', 
                fontWeight: 700, 
                fontSize: '1rem', 
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              <ArrowLeft size={18} /> Go Back
            </button>
          </div>

          <div style={{ 
            marginTop: '3rem', 
            paddingTop: '2rem', 
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#94a3b8',
            fontSize: '0.8rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            <Lock size={14} /> Integrated Security Protocol Active
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
