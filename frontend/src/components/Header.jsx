import { useAuth } from '../context/AuthContext';
import { Bell, User, Menu } from 'lucide-react';

const Header = ({ onMenuToggle }) => {
  const { user } = useAuth();

  return (
    <header style={{
      height: '64px',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 1.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#ffffff',
      boxShadow: 'var(--shadow-sm)',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      gap: '1rem',
    }}>

      {/* ── Left: hamburger (mobile) + logo ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onMenuToggle}
          className="hamburger-btn"
          style={{
            display: 'none',        /* shown via CSS on mobile */
            background: 'none',
            border: 'none',
            color: 'var(--primary-dark)',
            padding: '6px',
            borderRadius: '8px',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>

        <img src="/logo.png" alt="Legacy Clinics" style={{ height: '30px', objectFit: 'contain' }} />
      </div>

      {/* ── Right: bell + user ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button style={{ background: 'none', border: 'none', color: 'var(--primary-dark)', position: 'relative', padding: '4px', cursor: 'pointer' }}>
          <Bell size={20} />
          <span style={{ position: 'absolute', top: '2px', right: '2px', width: '7px', height: '7px', backgroundColor: 'var(--danger)', borderRadius: '50%', border: '2px solid #fff' }} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '1rem', borderLeft: '1px solid var(--border-color)' }}>
          {/* Hide name on very small screens */}
          <div className="header-user-name" style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-dark)', margin: 0, lineHeight: 1.3 }}>
              {user?.fullName?.split(' ').slice(0, 2).join(' ')}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.04em' }}>
              {user?.role?.replace(/_/g, ' ')}
            </p>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
            <User size={18} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
