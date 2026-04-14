import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  AlertTriangle, 
  Users, 
  History, 
  LogOut 
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', roles: ['all'] },
    { name: 'Cancellations', icon: <FileText size={20} />, path: '/cancellations', roles: ['all'] },
    { name: 'Incident Reports', icon: <AlertTriangle size={20} />, path: '/incidents', roles: ['all'] },
    { name: 'User Management', icon: <Users size={20} />, path: '/users', roles: ['coo', 'chairman'] },
    { name: 'Audit Logs', icon: <History size={20} />, path: '/audit-logs', roles: ['coo', 'chairman'] },
  ];

  const filteredMenu = menuItems.filter(item => 
    item.roles.includes('all') || item.roles.includes(user?.role)
  );

  return (
    <aside style={{
      width: '260px',
      backgroundColor: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem'
    }}>
      <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src="/logo.png" alt="Legacy Clinics" style={{ height: '40px', objectFit: 'contain' }} />
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filteredMenu.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              textDecoration: 'none',
              color: location.pathname === item.path ? '#ffffff' : 'rgba(255,255,255,0.7)',
              backgroundColor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              fontWeight: 500,
              transition: 'all 0.2s',
              borderLeft: location.pathname === item.path ? '4px solid #ffffff' : '4px solid transparent',
              marginLeft: location.pathname === item.path ? '-1.5rem' : '0',
              paddingLeft: location.pathname === item.path ? 'calc(1.5rem + 1rem)' : '1rem',
            }}
          >
            {item.icon}
            {item.name}
          </Link>
        ))}
      </nav>

      <button
        onClick={logout}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: 'transparent',
          color: '#ef4444',
          fontWeight: 500,
          marginTop: 'auto'
        }}
      >
        <LogOut size={20} />
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;
