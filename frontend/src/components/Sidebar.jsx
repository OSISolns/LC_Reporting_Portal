import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, ReceiptText,
  AlertTriangle, Users, History, LogOut, Key, Brain, X, RefreshCw, Shield, Database, Award, Clock, PenTool, Stethoscope, MessageSquare, Activity, Building, Mail, ShieldAlert, TrendingDown, ShieldCheck, Server, ScanLine, ClipboardList, FlaskConical, Heart, Dumbbell, Settings
} from 'lucide-react';
import Modal from './Modal';
import ChangePasswordModal from './ChangePasswordModal';
import { useState, useEffect } from 'react';

// Read sidebar visibility config written by the Permissions module
const getSidebarConfig = () => {
  try {
    const raw = localStorage.getItem('lc_sidebar_config');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const ALL_ROLES = [
  'admin', 'it_officer', 'coo', 'deputy_coo', 'chairman', 'sales_manager',
  'cashier', 'principal_cashier', 'customer_care', 'lab_team_lead',
  'consultant', 'operations_staff', 'pa', 'staff', 'hsfp', 'nurse',
  'chef-nurse', 'stock-manager', 'doctor', 'medical_director',
  'procurement-manager', 'imaging_tech', 'imaging_manager',
  'physiotherapist', 'physio', 'dental_hod', 'dental_tech', 'dental_lab_manager',
  'dentist', 'dental'
];

const Sidebar = ({ onClose }) => {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const [sidebarConfigState, setSidebarConfigState] = useState(() => getSidebarConfig());

  // Re-read sidebar config whenever admin saves it from Permissions page
  useEffect(() => {
    const handler = () => setSidebarConfigState(getSidebarConfig());
    window.addEventListener('sidebar-config-changed', handler);
    return () => window.removeEventListener('sidebar-config-changed', handler);
  }, []);

  const menuItems = [
    { configKey: 'dashboard',     name: 'Dashboard',        icon: <LayoutDashboard size={20} />, path: '/',            requiredPerm: null },
    { configKey: 'cancellations', name: 'Cancellations',    icon: <FileText size={20} />,        path: '/cancellations', requiredPerm: { mod: 'cancellations', act: 'view' }, allowedRoles: ['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant'] },
    { configKey: 'refunds',       name: 'Refunds',          icon: <ReceiptText size={20} />,     path: '/refunds',      requiredPerm: { mod: 'refunds', act: 'view' }, allowedRoles: ['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant'] },
    { configKey: 'incidents',     name: 'Incident Reports', icon: <AlertTriangle size={20} />,   path: '/incidents',    requiredPerm: null, allowedRoles: ALL_ROLES },
    { configKey: 'safety',        name: 'Safety Workspace', icon: <PenTool size={20} />,         path: '/safety-management', requiredPerm: { mod: 'incident_reports', act: 'approve' }, allowedRoles: ['hsfp', 'admin', 'deputy_coo', 'medical_director'] },
    { configKey: 'risk',          name: 'Risk Register',    icon: <ShieldAlert size={20} />,     path: '/risk-register', requiredPerm: { mod: 'incident_reports', act: 'approve' }, allowedRoles: ['hsfp', 'admin', 'deputy_coo', 'medical_director'] },
    { configKey: 'infection',     name: 'Infection Control',icon: <Activity size={20} />,         path: '/infection-control', requiredPerm: { mod: 'incident_reports', act: 'approve' }, allowedRoles: ['hsfp', 'admin', 'deputy_coo', 'medical_director'] },
    { configKey: 'results',       name: 'Result Transfers', icon: <RefreshCw size={20} />,       path: '/results-transfer', requiredPerm: { mod: 'results_transfer', act: 'view' }, allowedRoles: ['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'lab_team_lead', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant'] },
    { configKey: 'performance',   name: 'Performance',      icon: <Award size={20} />,           path: '/performance',  requiredPerm: { mod: 'staff_performance', act: 'view' }, allowedRoles: ['sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'dental_hod', 'dental_lab_manager'] },
    { configKey: 'nursing_hub',   name: 'Nursing Hub',      icon: <Stethoscope size={20} />,     path: '/nursing-hub',  requiredPerm: { mod: 'clinical_observation', act: 'view' }, allowedRoles: ['nurse', 'admin', 'chef-nurse'] },
    { configKey: 'doctor_hub',    name: 'Doctor Hub',       icon: <Stethoscope size={20} />,     path: '/doctor-hub',   requiredPerm: { mod: 'clinical_observation', act: 'view' }, allowedRoles: ['doctor', 'consultant', 'admin', 'medical_director'] },
    { configKey: 'imaging',       name: 'Imaging Hub',      icon: <ScanLine size={20} />,        path: '/imaging',      requiredPerm: { mod: 'imaging', act: 'view' }, allowedRoles: ['imaging_tech', 'imaging_manager', 'admin', 'coo', 'deputy_coo', 'medical_director'] },
    { configKey: 'lab_hub',       name: 'Laboratory Hub',   icon: <FlaskConical size={20} />,    path: '/lab',          requiredPerm: null, allowedRoles: ['admin', 'deputy_coo', 'lab_team_lead', 'lab_tech', 'lab'] },
    { configKey: 'dental_hub',    name: 'Dental Hub',       icon: <Heart size={20} />,           path: '/dental',       requiredPerm: null, allowedRoles: ['admin', 'deputy_coo', 'dental', 'dentist', 'dental_tech', 'dental_hod', 'dental_lab_manager'] },
    { configKey: 'physio_hub',     name: 'Physio Hub',       icon: <Dumbbell size={20} />,        path: '/physio',       requiredPerm: null, allowedRoles: ['admin', 'deputy_coo', 'physiotherapist', 'physio'] },
    { configKey: 'operations_hub',  name: 'Operations Hub',   icon: <Settings size={20} />,        path: '/operations',   requiredPerm: null, allowedRoles: ['admin', 'deputy_coo', 'operations_staff', 'coo'] },
    { configKey: 'daily_stock',   name: 'Daily Stock Checkup', icon: <Database size={20} />,     path: '/nursing-hub/inventory', requiredPerm: { mod: 'clinical_observation', act: 'view' }, allowedRoles: ['nurse', 'chef-nurse', 'admin'] },
    { configKey: 'central_store', name: 'General Store Hub', icon: <Database size={20} />,       path: '/central-store', requiredPerm: null, allowedRoles: ['admin', 'deputy_coo', 'stock-manager'] },
    { configKey: 'consumables',   name: 'Consumables Log',  icon: <ClipboardList size={20} />,   path: '/consumables-log', requiredPerm: null, allowedRoles: ['admin', 'deputy_coo', 'chef-nurse', 'nurse', 'lab_team_lead', 'lab_tech', 'lab', 'dental', 'dentist', 'dental_tech', 'dental_hod', 'dental_lab_manager', 'imaging_tech', 'imaging_manager', 'operations_staff', 'coo', 'hsfp'] },
    { configKey: 'master',        name: 'master',            icon: <Database size={20} />,       path: '/master',       requiredPerm: null, allowedRoles: ['admin', 'stock-manager'] },
    { configKey: 'procurement',   name: 'Procurement Hub',   icon: <Building size={20} />,       path: '/procurement',  requiredPerm: null, allowedRoles: ['admin', 'procurement-manager', 'deputy_coo'] },
    { configKey: 'supplier',      name: 'Supplier Portal Management',   icon: <Building size={20} />,       path: '/supplier-portal-manager', requiredPerm: null, allowedRoles: ['admin', 'procurement-manager', 'deputy_coo'] },
    { configKey: 'daily_report',  name: 'Daily Report',      icon: <Activity size={20} />,       path: '/nursing-hub/daily-report', requiredPerm: { mod: 'clinical_observation', act: 'view' }, allowedRoles: ['nurse', 'chef-nurse'] },
    { configKey: 'daily_board',   name: 'Daily Reports Board', icon: <FileText size={20} />,     path: '/daily-reports-board', requiredPerm: { mod: 'clinical_observation', act: 'view' }, allowedRoles: ['sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'principal_cashier', 'consultant', 'chef-nurse', 'pa', 'medical_director'] },
    { configKey: 'clinical_sheets', name: 'Clinical Sheets',  icon: <FileText size={20} />,     path: '/clinical-sheets', requiredPerm: { mod: 'clinical_observation', act: 'view' }, allowedRoles: ['nurse', 'admin', 'doctor', 'consultant', 'chef-nurse', 'medical_director'] },
    { configKey: 'insights',      name: 'Insights',          icon: <Brain size={20} />,          path: '/ai-insights',  requiredPerm: { mod: 'reports', act: 'view' }, allowedRoles: ['sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'principal_cashier', 'consultant', 'medical_director'] },
    { configKey: 'revenue',       name: 'Revenue Tracker',   icon: <TrendingDown size={20} />,   path: '/revenue-tracker', requiredPerm: { mod: 'reports', act: 'view' }, allowedRoles: ['sales_manager', 'chairman', 'admin', 'principal_cashier', 'deputy_coo'] },
    { configKey: 'compliance',    name: 'Compliance Portal', icon: <ShieldCheck size={20} />,    path: '/compliance',   requiredPerm: null, allowedRoles: ['admin', 'hsfp'] },
    { configKey: 'it_hub',        name: (user?.role === 'admin' || user?.role === 'it_officer') ? 'IT Support Hub' : 'IT Support',    icon: <Server size={20} />,         path: '/it-ticketing', requiredPerm: null, allowedRoles: ALL_ROLES },
    { configKey: 'users',         name: 'User Management',   icon: <Users size={20} />,          path: '/users',        requiredPerm: { mod: 'user_management', act: 'view' }, allowedRoles: ['admin', 'it_officer'] },
    { configKey: 'permissions',   name: 'Permissions',       icon: <Shield size={20} />,         path: '/permissions',  requiredPerm: { mod: 'user_management', act: 'edit' }, allowedRoles: ['admin'] },
    { configKey: 'audit_logs',    name: 'Audit Logs',        icon: <History size={20} />,        path: '/audit-logs',   requiredPerm: { mod: 'audit_logs', act: 'view' }, allowedRoles: ['admin'] },
    // Shift Module
    { configKey: 'shifts',        name: 'Shift Management',  icon: <Clock size={20} />,          path: '/shifts',       requiredPerm: { mod: 'shifts', act: 'create' }, allowedRoles: ['cashier', 'customer_care', 'nurse'] },
    { configKey: 'shifts',        name: 'Shift Log',         icon: <Clock size={20} />,          path: '/shifts',       requiredPerm: { mod: 'shifts', act: 'view' }, allowedRoles: ['principal_cashier', 'sales_manager', 'deputy_coo', 'coo', 'admin', 'operations_staff', 'chef-nurse', 'pa'] },
    { configKey: 'feedbacks',     name: 'Internal Feedback', icon: <MessageSquare size={20} />,  path: '/feedbacks',    requiredPerm: { mod: 'feedbacks', act: 'view' }, allowedRoles: ['coo', 'deputy_coo', 'chef-nurse', 'medical_director'] },
  ];

  const filteredMenu = menuItems.filter(item => {
    // ── Gate 1: Role-based route access (hard gate, non-negotiable) ──────────
    if (item.allowedRoles && !item.allowedRoles.includes(user?.role)) return false;

    // ── Gate 2: Backend module permission (if this item has one) ─────────────
    // If a permission module is specified, the user MUST have it granted.
    // This respects whatever the admin configured in the Permissions matrix.
    if (item.requiredPerm) {
      if (!hasPermission(item.requiredPerm.mod, item.requiredPerm.act)) return false;
    }

    // ── Gate 3: Admin sidebar config override (localStorage) ─────────────────
    // Admin can additionally hide items per-role via Permissions > Sidebar Config.
    const roleCfg = sidebarConfigState[user?.role];
    if (roleCfg && item.configKey && roleCfg[item.configKey] === false) {
      const isHsfpsCore = user?.role === 'hsfp' && ['incidents', 'safety', 'risk', 'infection', 'compliance'].includes(item.configKey);
      if (!isHsfpsCore) return false;
    }

    return true;
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
