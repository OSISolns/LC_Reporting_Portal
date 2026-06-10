import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, ReceiptText,
  AlertTriangle, Users, History, LogOut, Key, Brain, X, RefreshCw, Shield, Database, Award, Clock, PenTool, Stethoscope, MessageSquare, Activity, Building, Mail
} from 'lucide-react';
import Modal from './Modal';
import ChangePasswordModal from './ChangePasswordModal';
import { useState } from 'react';

const Sidebar = ({ onClose }) => {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard',        icon: <LayoutDashboard size={20} />, path: '/',            requiredPerm: null },
    { name: 'Cancellations',    icon: <FileText size={20} />,        path: '/cancellations', requiredPerm: { mod: 'cancellations', act: 'view' }, allowedRoles: ['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant', 'reviewer'] },
    { name: 'Refunds',          icon: <ReceiptText size={20} />,     path: '/refunds',      requiredPerm: { mod: 'refunds', act: 'view' }, allowedRoles: ['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant', 'reviewer'] },
    { name: 'Incident Reports', icon: <AlertTriangle size={20} />,   path: '/incidents',    requiredPerm: { mod: 'incident_reports', act: 'view' }, allowedRoles: ['nurse', 'admin', 'doctor', 'consultant', 'hsfp', 'operations_staff', 'customer_care', 'it_officer', 'reviewer', 'chef-nurse', 'pa', 'stock-manager', 'coo', 'deputy_coo'] },
    { name: 'Safety Workspace', icon: <PenTool size={20} />,         path: '/safety-management', requiredPerm: { mod: 'incident_reports', act: 'approve' }, allowedRoles: ['hsfp', 'admin', 'reviewer', 'coo', 'deputy_coo'] },
    { name: 'Result Transfers', icon: <RefreshCw size={20} />,       path: '/results-transfer', requiredPerm: { mod: 'results_transfer', act: 'view' }, allowedRoles: ['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'lab_team_lead', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant', 'reviewer'] },
    { name: 'Performance',      icon: <Award size={20} />,           path: '/performance',      requiredPerm: { mod: 'staff_performance', act: 'view' }, allowedRoles: ['sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'reviewer', 'chef-nurse'] },
    { name: ['doctor', 'consultant'].includes(user?.role) ? 'Doctor Hub' : 'Nursing Hub', icon: <Stethoscope size={20} />, path: '/nursing-hub', requiredPerm: { mod: 'clinical_observation', act: 'view' }, allowedRoles: ['nurse', 'admin', 'doctor', 'consultant', 'reviewer', 'chef-nurse'] },
    { name: 'Daily Stock Checkup', icon: <Database size={20} />, path: '/nursing-hub/inventory', requiredPerm: { mod: 'clinical_observation', act: 'view' }, allowedRoles: ['nurse', 'chef-nurse', 'admin', 'doctor', 'consultant'] },
    { name: 'Central Store Hub', icon: <Database size={20} />, path: '/central-store', requiredPerm: null, allowedRoles: ['admin', 'deputy_coo', 'chef-nurse', 'stock-manager'] },
    { name: 'master', icon: <Database size={20} />, path: '/master', requiredPerm: null, allowedRoles: ['admin', 'stock-manager'] },
    { name: 'Supplier Portal', icon: <Building size={20} />, path: '/?tab=supplier-portal', requiredPerm: null, allowedRoles: ['admin', 'stock-manager'] },
    { name: 'E-Prescriptions', icon: <FileText size={20} />, path: '/e-prescriptions', requiredPerm: null, allowedRoles: ['doctor', 'consultant'] },
    { name: 'Daily Report', icon: <Activity size={20} />, path: '/nursing-hub/daily-report', requiredPerm: { mod: 'clinical_observation', act: 'view' }, allowedRoles: ['nurse', 'chef-nurse'] },
    { name: 'Daily Reports Board', icon: <FileText size={20} />, path: '/daily-reports-board', requiredPerm: { mod: 'clinical_observation', act: 'view' }, allowedRoles: ['sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'principal_cashier', 'consultant', 'reviewer', 'chef-nurse', 'pa'] },
    { name: 'Clinical Sheets', icon: <FileText size={20} />, path: '/clinical-sheets', requiredPerm: { mod: 'clinical_observation', act: 'view' }, allowedRoles: ['nurse', 'admin', 'doctor', 'consultant', 'reviewer', 'chef-nurse'] },
    { name: 'Insights',         icon: <Brain size={20} />,           path: '/ai-insights',  requiredPerm: { mod: 'reports', act: 'view' }, allowedRoles: ['sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'principal_cashier', 'consultant', 'reviewer'] },
    { name: 'User Management',  icon: <Users size={20} />,           path: '/users',        requiredPerm: { mod: 'user_management', act: 'view' }, allowedRoles: ['admin', 'it_officer'] },
    { name: 'Permissions',      icon: <Shield size={20} />,          path: '/permissions',  requiredPerm: { mod: 'user_management', act: 'edit' }, allowedRoles: ['admin'] },
    { name: 'Audit Logs',       icon: <History size={20} />,         path: '/audit-logs',   requiredPerm: { mod: 'audit_logs', act: 'view' }, allowedRoles: ['admin'] },
    // Shift Module
    { name: 'Shift Management', icon: <Clock size={20} />,           path: '/shifts',  requiredPerm: { mod: 'shifts', act: 'create' }, allowedRoles: ['cashier', 'customer_care', 'nurse'] },
    { name: 'Shift Log',        icon: <Clock size={20} />,           path: '/shifts',       requiredPerm: { mod: 'shifts', act: 'view' }, allowedRoles: ['principal_cashier', 'sales_manager', 'deputy_coo', 'coo', 'admin', 'operations_staff', 'chef-nurse', 'pa'] },
    { name: 'Internal Feedback', icon: <MessageSquare size={20} />,   path: '/feedbacks',    requiredPerm: { mod: 'feedbacks', act: 'view' }, allowedRoles: ['coo', 'deputy_coo', 'chef-nurse'] },
  ];

  const filteredMenu = menuItems.filter(item => {
    // Explicitly hide Insights from HSFP
    if (item.name === 'Insights' && user?.role === 'hsfp') return false;
    
    // Explicitly hide modules if the user's role does not have route access
    if (item.allowedRoles && !item.allowedRoles.includes(user?.role)) return false;
    
    if (!item.requiredPerm) return true;
    return hasPermission(item.requiredPerm.mod, item.requiredPerm.act);
  });

  const isActive = (path) => {
    if (path.includes('?tab=')) {
      const tabParam = path.split('?')[1];
      return location.pathname === '/' && location.search.includes(tabParam);
    }
    if (path === '/') {
      return location.pathname === '/' && !location.search.includes('tab=');
    }
    if (path === '/nursing-hub') {
      return location.pathname === '/nursing-hub';
    }
    return location.pathname.startsWith(path);
  };

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
        <a
          href="https://legacyclinics.rw/webmail"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'none' }}
        >
          <Mail size={20} /> Webmail
        </a>

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
