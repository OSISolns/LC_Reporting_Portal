import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Bell, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import NotificationDropdown from './NotificationDropdown';

const Header = ({ onMenuToggle }) => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
      zIndex: 100, /* Higher z-index for dropdown stack */
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
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--primary-dark)', 
              position: 'relative', 
              padding: '4px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{ 
                position: 'absolute', 
                top: '-2px', 
                right: '-2px', 
                minWidth: '18px', 
                height: '18px', 
                backgroundColor: 'var(--danger)', 
                borderRadius: '50%', 
                border: '2px solid #fff',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px'
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <NotificationDropdown 
            isOpen={dropdownOpen} 
            onClose={() => setDropdownOpen(false)} 
          />
        </div>


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
