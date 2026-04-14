import { useAuth } from '../context/AuthContext';
import { Bell, User } from 'lucide-react';

const Header = () => {
  const { user } = useAuth();

  return (
    <header style={{
      height: '70px',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#ffffff',
      boxShadow: 'var(--shadow-sm)',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img src="/logo.png" alt="Legacy Clinics" style={{ height: '32px', objectFit: 'contain' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <button style={{ 
          background: 'none', 
          border: 'none', 
          color: 'var(--primary-dark)',
          position: 'relative'
        }}>
          <Bell size={20} />
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '8px',
            height: '8px',
            backgroundColor: 'var(--danger)',
            borderRadius: '50%',
            border: '2px solid var(--bg-color)'
          }}></span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '1.5rem', borderLeft: '1px solid var(--border-color)' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>{user?.fullName}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{user?.role.replace('_', ' ')}</p>
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--card-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            border: '1px solid var(--border-color)'
          }}>
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
