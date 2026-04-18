import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, ReceiptText,
  AlertTriangle, Users, History, LogOut, Key, Brain, X, RefreshCw
} from 'lucide-react';
import Modal from './Modal';
import ChangePasswordModal from './ChangePasswordModal';
import { useState } from 'react';

const Sidebar = ({ onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard',       icon: <LayoutDashboard size={20} />, path: '/',            roles: ['all'] },
    { name: 'Cancellations',   icon: <FileText size={20} />,        path: '/cancellations', roles: ['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant'] },
    { name: 'Refunds',         icon: <ReceiptText size={20} />,     path: '/refunds',      roles: ['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant'] },
    { name: 'Incident Reports',icon: <AlertTriangle size={20} />,   path: '/incidents',    roles: ['all'] },
    { name: 'Result Transfers', icon: <RefreshCw size={20} />,       path: '/results-transfer', roles: ['all'] },
    { name: 'Insights',        icon: <Brain size={20} />,           path: '/ai-insights',  roles: ['sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'quality_assurance', 'principal_cashier', 'consultant'] },
    { name: 'User Management', icon: <Users size={20} />,           path: '/users',        roles: ['admin'] },
    { name: 'Audit Logs',      icon: <History size={20} />,         path: '/audit-logs',   roles: ['admin'] },
  ];

  const filteredMenu = menuItems.filter(item =>
    item.roles.includes('all') || item.roles.includes(user?.role)
  );

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const linkStyle = (path) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    textDecoration: 'none',
    color: isActive(path) ? '#ffffff' : 'rgba(255,255,255,0.7)',
    backgroundColor: isActive(path) ? 'rgba(255,255,255,0.12)' : 'transparent',
    fontWeight: isActive(path) ? 700 : 500,
    transition: 'all 0.2s',
    borderLeft: isActive(path) ? '4px solid #ffffff' : '4px solid transparent',
    marginLeft: isActive(path) ? '-1.5rem' : '0',
    paddingLeft: isActive(path) ? 'calc(1.5rem + 1rem)' : '1rem',
    fontSize: '0.9rem',
  });

  return (
    <aside style={{
      width: '260px',
      minWidth: '260px',
      backgroundColor: 'var(--sidebar-bg)',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.25rem 1.5rem',
      height: '100vh',
      overflowY: 'auto',
      position: 'relative',
    }}>

      {/* ── Logo + mobile close button ── */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="/logo.png" alt="Legacy Clinics" style={{ height: '38px', objectFit: 'contain' }} />
        <button
          onClick={onClose}
          className="sidebar-close-btn"
          style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer', padding: '4px', borderRadius: '6px',
            display: 'none', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {filteredMenu.map((item) => (
          <Link key={item.path} to={item.path} style={linkStyle(item.path)}>
            {item.icon}
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>

      {/* ── User actions ── */}
      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <button
          onClick={() => setIsPasswordModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left' }}
        >
          <Key size={20} /> Update Password
        </button>

        <button
          onClick={logout}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#ef4444', fontWeight: 500, cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left' }}
        >
          <LogOut size={20} /> Logout
        </button>
      </div>

      {/* ── User card ── */}
      <div style={{ marginTop: '1rem', padding: '0.9rem', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.fullName}</div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>@{user?.username}</div>
        <div style={{ marginTop: '4px', display: 'inline-block', padding: '2px 8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '99px', fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {user?.role?.replace(/_/g, ' ')}
        </div>
      </div>

      <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="Account Security" maxWidth="500px">
        <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />
      </Modal>
    </aside>
  );
};

export default Sidebar;
