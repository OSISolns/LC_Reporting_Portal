import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, Save, RefreshCw, CheckCircle2, AlertCircle, X, ChevronRight,
  Lock, Key, Eye, EyeOff, Copy, Check, Calendar, History, User,
  Menu, Search, Zap, BarChart2, ToggleLeft, ToggleRight, Info,
  LayoutDashboard, FileText, ReceiptText, AlertTriangle, Users, Brain,
  Award, Clock, PenTool, Stethoscope, MessageSquare, Activity, Building,
  ShieldAlert, TrendingDown, ShieldCheck, Server, Database
} from 'lucide-react';
import {
  getModules, getRoleMatrix, updateRolePermissions,
  resetRolePermissions, getUnlockLogs, getStockPassword, regenerateStockPassword
} from '../api/permissions';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

// ─── Month helpers ─────────────────────────────────────────────────────────────
const generateMonths = () => {
  const months = [];
  const start = new Date(2026, 2, 1);
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  let current = new Date(start);
  while (current <= end) {
    months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
    current.setMonth(current.getMonth() + 1);
  }
  return months.reverse();
};
const DYNAMIC_MONTHS = generateMonths();
const CURRENT_MONTH_STR = DYNAMIC_MONTHS[0];
const getMonthLabel = (s) => {
  if (!s) return '';
  const [y, m] = s.split('-');
  return new Date(+y, +m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
};

// ─── Roles ─────────────────────────────────────────────────────────────────────
const ALL_ROLES = [
  'admin', 'it_officer', 'coo', 'deputy_coo', 'chairman', 'sales_manager',
  'cashier', 'principal_cashier', 'customer_care', 'lab_team_lead',
  'consultant', 'operations_staff', 'pa', 'staff', 'hsfp', 'nurse',
  'chef-nurse', 'reviewer', 'stock-manager', 'doctor', 'medical_director',
  'procurement-manager',
];

// Role display colors for badges
const ROLE_COLORS = {
  admin: '#7c3aed', it_officer: '#2563eb', coo: '#0891b2', deputy_coo: '#0284c7',
  chairman: '#d97706', sales_manager: '#059669', cashier: '#0f766e',
  principal_cashier: '#0d9488', customer_care: '#7c3aed', lab_team_lead: '#4f46e5',
  consultant: '#6d28d9', operations_staff: '#b45309', pa: '#9333ea',
  staff: '#64748b', hsfp: '#dc2626', nurse: '#db2777', 'chef-nurse': '#c026d3',
  reviewer: '#ea580c', 'stock-manager': '#16a34a', doctor: '#2563eb',
  medical_director: '#be123c', 'procurement-manager': '#0d9488',
};

const formatRole = (r) => r ? r.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';

// ─── Sidebar items ──────────────────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { key: 'dashboard',       name: 'Dashboard',           Icon: LayoutDashboard, path: '/',                         allowedRoles: ALL_ROLES },
  { key: 'cancellations',   name: 'Cancellations',       Icon: FileText,        path: '/cancellations',            allowedRoles: ['cashier','principal_cashier','customer_care','operations_staff','sales_manager','coo','chairman','admin','deputy_coo','consultant','reviewer'] },
  { key: 'refunds',         name: 'Refunds',             Icon: ReceiptText,     path: '/refunds',                  allowedRoles: ['cashier','principal_cashier','customer_care','operations_staff','sales_manager','coo','chairman','admin','deputy_coo','consultant','reviewer'] },
  { key: 'incidents',       name: 'Incident Reports',    Icon: AlertTriangle,   path: '/incidents',                allowedRoles: ['nurse','admin','doctor','consultant','hsfp','operations_staff','customer_care','it_officer','reviewer','chef-nurse','pa','stock-manager','coo','deputy_coo','medical_director','procurement-manager'] },
  { key: 'safety',          name: 'Safety Workspace',    Icon: PenTool,         path: '/safety-management',        allowedRoles: ['hsfp','admin','reviewer','deputy_coo'] },
  { key: 'risk',            name: 'Risk Register',       Icon: ShieldAlert,     path: '/risk-register',            allowedRoles: ['hsfp','admin','reviewer','deputy_coo'] },
  { key: 'infection',       name: 'Infection Control',   Icon: Activity,        path: '/infection-control',        allowedRoles: ['hsfp','admin','reviewer','deputy_coo'] },
  { key: 'results',         name: 'Result Transfers',    Icon: RefreshCw,       path: '/results-transfer',         allowedRoles: ['cashier','principal_cashier','customer_care','operations_staff','lab_team_lead','sales_manager','coo','chairman','admin','deputy_coo','consultant','reviewer'] },
  { key: 'performance',     name: 'Performance',         Icon: Award,           path: '/performance',              allowedRoles: ['sales_manager','coo','chairman','admin','deputy_coo','cashier','principal_cashier','customer_care','operations_staff','reviewer'] },
  { key: 'nursing_hub',     name: 'Nursing Hub',         Icon: Stethoscope,     path: '/nursing-hub',              allowedRoles: ['nurse','admin','reviewer','chef-nurse'] },
  { key: 'doctor_hub',      name: 'Doctor Hub',          Icon: Stethoscope,     path: '/doctor-hub',               allowedRoles: ['doctor','consultant','admin','medical_director'] },
  { key: 'daily_stock',     name: 'Daily Stock',         Icon: Database,        path: '/nursing-hub/inventory',    allowedRoles: ['nurse','chef-nurse','admin'] },
  { key: 'central_store',   name: 'Central Store',       Icon: Database,        path: '/central-store',            allowedRoles: ['admin','deputy_coo','stock-manager'] },
  { key: 'master',          name: 'Master Module',       Icon: Database,        path: '/master',                   allowedRoles: ['admin','stock-manager'] },
  { key: 'procurement',     name: 'Procurement Hub',     Icon: Building,        path: '/procurement',              allowedRoles: ['admin','procurement-manager','deputy_coo'] },
  { key: 'supplier',        name: 'Supplier Portal',     Icon: Building,        path: '/supplier-portal-manager',  allowedRoles: ['admin','procurement-manager','deputy_coo'] },
  { key: 'daily_report',    name: 'Daily Report',        Icon: Activity,        path: '/nursing-hub/daily-report', allowedRoles: ['nurse','chef-nurse'] },
  { key: 'daily_board',     name: 'Reports Board',       Icon: FileText,        path: '/daily-reports-board',      allowedRoles: ['sales_manager','coo','chairman','admin','deputy_coo','principal_cashier','consultant','reviewer','chef-nurse','pa','medical_director'] },
  { key: 'clinical_sheets', name: 'Clinical Sheets',     Icon: FileText,        path: '/clinical-sheets',          allowedRoles: ['nurse','admin','doctor','consultant','reviewer','chef-nurse','medical_director'] },
  { key: 'insights',        name: 'AI Insights',         Icon: Brain,           path: '/ai-insights',              allowedRoles: ['sales_manager','coo','chairman','admin','deputy_coo','principal_cashier','consultant','reviewer'] },
  { key: 'revenue',         name: 'Revenue Tracker',     Icon: TrendingDown,    path: '/revenue-tracker',          allowedRoles: ['sales_manager','chairman','admin','principal_cashier','deputy_coo'] },
  { key: 'compliance',      name: 'Compliance',          Icon: ShieldCheck,     path: '/compliance',               allowedRoles: ['admin','hsfp','reviewer'] },
  { key: 'it_hub',          name: 'IT Support Hub',      Icon: Server,          path: '/it-ticketing',             allowedRoles: ALL_ROLES },
  { key: 'users',           name: 'User Management',     Icon: Users,           path: '/users',                    allowedRoles: ['admin','it_officer'] },
  { key: 'permissions',     name: 'Permissions',         Icon: Shield,          path: '/permissions',              allowedRoles: ['admin'] },
  { key: 'audit_logs',      name: 'Audit Logs',          Icon: History,         path: '/audit-logs',               allowedRoles: ['admin'] },
  { key: 'shifts',          name: 'Shifts',              Icon: Clock,           path: '/shifts',                   allowedRoles: ['cashier','customer_care','nurse','principal_cashier','sales_manager','deputy_coo','coo','admin','operations_staff','chef-nurse','pa'] },
  { key: 'feedbacks',       name: 'Internal Feedback',   Icon: MessageSquare,   path: '/feedbacks',                allowedRoles: ['coo','deputy_coo','chef-nurse','medical_director'] },
];

// ─── Sidebar config persistence ────────────────────────────────────────────────
const SIDEBAR_CONFIG_KEY = 'lc_sidebar_config';
const loadSidebarConfig = () => { try { return JSON.parse(localStorage.getItem(SIDEBAR_CONFIG_KEY) || '{}'); } catch { return {}; } };
const persistSidebarConfig = (cfg) => { localStorage.setItem(SIDEBAR_CONFIG_KEY, JSON.stringify(cfg)); window.dispatchEvent(new CustomEvent('sidebar-config-changed')); };

// ─── All possible actions (superset) ───────────────────────────────────────────
const ALL_ACTIONS = ['view', 'create', 'edit', 'review', 'approve', 'reject', 'delete', 'download'];

// ─── Sub-components ────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, disabled = false }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
    <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} style={{ display: 'none' }} />
    <div style={{ width: 32, height: 18, borderRadius: 18, position: 'relative', backgroundColor: checked ? 'var(--primary)' : '#d1d5db', transition: 'background-color 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '50%', left: checked ? '14px' : '2px', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  </label>
);

const RoleBadge = ({ role, size = 'sm' }) => {
  const color = ROLE_COLORS[role] || '#64748b';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: size === 'sm' ? '2px 7px' : '3px 10px',
      borderRadius: '99px', fontSize: size === 'sm' ? '0.65rem' : '0.72rem',
      fontWeight: 700, letterSpacing: '0.02em',
      backgroundColor: color + '15', color, border: `1px solid ${color}30`,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
      {formatRole(role)}
    </span>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const Permissions = () => {
  // Core
  const [modules, setModules]       = useState([]);
  const [roleMatrix, setRoleMatrix] = useState({});
  const [origMatrix, setOrigMatrix] = useState({});   // snapshot for diff highlighting
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [toast, setToast]           = useState(null);
  const [moduleSearch, setModuleSearch] = useState('');

  // Modals
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [adminPassword, setAdminPassword]       = useState('');
  const [resetting, setResetting]               = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState('roles');

  // Stock passcode
  const [unlockLogs, setUnlockLogs]         = useState([]);
  const [loadingLogs, setLoadingLogs]       = useState(false);
  const [selectedMonth, setSelectedMonth]   = useState(CURRENT_MONTH_STR);
  const [monthPasscode, setMonthPasscode]   = useState(null);
  const [loadingPasscode, setLoadingPasscode] = useState(false);
  const [regenerating, setRegenerating]     = useState(false);
  const [passcodeVisible, setPasscodeVisible] = useState(false);
  const [copied, setCopied]                 = useState(false);

  // Sidebar config
  const [sidebarConfig, setSidebarConfig] = useState(loadSidebarConfig);
  const [sidebarRole, setSidebarRole]     = useState(ALL_ROLES[0]);
  const [sidebarChanged, setSidebarChanged] = useState(false);

  // Auto-save debounce ref
  const saveTimer = useRef(null);

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [modRes, matRes] = await Promise.all([getModules(), getRoleMatrix()]);
      const mods = modRes.data || [];
      const mat  = matRes.data || {};
      setModules(mods);
      const full = {};
      for (const role of ALL_ROLES) full[role] = mat[role] || {};
      setRoleMatrix(full);
      setOrigMatrix(JSON.parse(JSON.stringify(full)));
      if (!selectedRole) setSelectedRole(ALL_ROLES[0]);
    } catch { showToast('Could not load permission matrix.', 'error'); }
    finally { setLoading(false); }
  }, [selectedRole, showToast]);

  useEffect(() => { fetchData(); }, []);

  // Passcode / logs
  const loadPasscode = useCallback(async (month) => {
    setLoadingPasscode(true);
    try { const r = await getStockPassword(month); setMonthPasscode(r.success ? r.password : null); }
    catch { showToast('Failed to load passcode.', 'error'); }
    finally { setLoadingPasscode(false); }
  }, [showToast]);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try { const r = await getUnlockLogs(); if (r.success) setUnlockLogs(r.data || []); }
    catch { showToast('Failed to load logs.', 'error'); }
    finally { setLoadingLogs(false); }
  }, [showToast]);

  useEffect(() => { if (activeTab === 'stock_unlock') { loadPasscode(selectedMonth); fetchLogs(); } }, [activeTab]);
  useEffect(() => { if (activeTab === 'stock_unlock') loadPasscode(selectedMonth); }, [selectedMonth]);

  // ── Permission helpers ─────────────────────────────────────────────────────────
  const validModNames = new Set(modules.map(m => m.name));

  const handleToggle = (modName, action) => {
    setRoleMatrix(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[selectedRole][modName]) next[selectedRole][modName] = {};
      next[selectedRole][modName][action] = !next[selectedRole][modName][action];
      return next;
    });
    setHasChanges(true);
  };

  // Select-all for a whole row (module)
  const toggleRow = (mod) => {
    const supported = mod.actions;
    const allOn = supported.every(a => roleMatrix[selectedRole]?.[mod.name]?.[a]);
    setRoleMatrix(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[selectedRole][mod.name]) next[selectedRole][mod.name] = {};
      supported.forEach(a => { next[selectedRole][mod.name][a] = !allOn; });
      return next;
    });
    setHasChanges(true);
  };

  // Select-all for a whole column (action)
  const toggleColumn = (action) => {
    const supportedMods = modules.filter(m => m.actions.includes(action));
    const allOn = supportedMods.every(m => roleMatrix[selectedRole]?.[m.name]?.[action]);
    setRoleMatrix(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      supportedMods.forEach(m => {
        if (!next[selectedRole][m.name]) next[selectedRole][m.name] = {};
        next[selectedRole][m.name][action] = !allOn;
      });
      return next;
    });
    setHasChanges(true);
  };

  // Grant all / revoke all for selected role
  const grantAll = () => {
    setRoleMatrix(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      modules.forEach(m => {
        if (!next[selectedRole][m.name]) next[selectedRole][m.name] = {};
        m.actions.forEach(a => { next[selectedRole][m.name][a] = true; });
      });
      return next;
    });
    setHasChanges(true);
  };
  const revokeAll = () => {
    setRoleMatrix(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      modules.forEach(m => {
        if (!next[selectedRole][m.name]) next[selectedRole][m.name] = {};
        m.actions.forEach(a => { next[selectedRole][m.name][a] = false; });
      });
      return next;
    });
    setHasChanges(true);
  };

  // Is a cell changed from original?
  const isDirty = (modName, action) => {
    const orig = origMatrix[selectedRole]?.[modName]?.[action] ?? false;
    const curr = roleMatrix[selectedRole]?.[modName]?.[action] ?? false;
    return orig !== curr;
  };

  // Granted count for a role
  const grantedCount = (role) => {
    let n = 0;
    const perms = roleMatrix[role] || {};
    for (const mod of Object.values(perms)) for (const v of Object.values(mod)) if (v) n++;
    return n;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleaned = {};
      for (const [k, v] of Object.entries(roleMatrix[selectedRole] || {})) {
        if (validModNames.has(k)) cleaned[k] = v;
      }
      await updateRolePermissions(selectedRole, cleaned);
      setOrigMatrix(prev => { const n = { ...prev }; n[selectedRole] = JSON.parse(JSON.stringify(cleaned)); return n; });
      showToast(`Permissions for "${formatRole(selectedRole)}" saved.`, 'success');
      setHasChanges(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Save failed.', 'error');
    } finally { setSaving(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetting(true);
    try {
      await resetRolePermissions(selectedRole, adminPassword);
      showToast(`"${formatRole(selectedRole)}" reset to defaults.`, 'success');
      setIsResetModalOpen(false); setAdminPassword('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Authorization failed.', 'error');
    } finally { setResetting(false); }
  };

  // Passcode actions
  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const r = await regenerateStockPassword(selectedMonth);
      if (r.success) { setMonthPasscode(r.password); setPasscodeVisible(true); setCopied(false); showToast(`Passcode generated for ${getMonthLabel(selectedMonth)}.`); }
    } catch (err) { showToast(err.response?.data?.message || 'Regeneration failed.', 'error'); }
    finally { setRegenerating(false); }
  };
  const handleCopy = () => { if (!monthPasscode) return; navigator.clipboard.writeText(monthPasscode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };

  // ── Sidebar config helpers ────────────────────────────────────────────────────
  const isVisible = (role, key) => { const c = sidebarConfig[role]; return !c || c[key] !== false; };

  const toggleSidebarItem = (role, key) => {
    setSidebarConfig(prev => {
      const next = { ...prev, [role]: { ...(prev[role] || {}), [key]: !isVisible(role, key) } };
      setSidebarChanged(true);
      return next;
    });
  };

  const saveSidebarCfg = () => {
    persistSidebarConfig(sidebarConfig);
    setSidebarChanged(false);
    showToast('Sidebar configuration saved.');
  };

  const resetSidebarRole = (role) => {
    const next = { ...sidebarConfig }; delete next[role];
    setSidebarConfig(next);
    persistSidebarConfig(next);
    showToast(`Sidebar for "${formatRole(role)}" reset.`);
  };

  const visibleCount = (role) => SIDEBAR_ITEMS.filter(i => i.allowedRoles.includes(role) && isVisible(role, i.key)).length;
  const totalAccessible = (role) => SIDEBAR_ITEMS.filter(i => i.allowedRoles.includes(role)).length;

  // ── Derived ───────────────────────────────────────────────────────────────────
  const filteredModules = modules.filter(m =>
    !moduleSearch || m.display_name.toLowerCase().includes(moduleSearch.toLowerCase()) || m.name.toLowerCase().includes(moduleSearch.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  // ── Render ────────────────────────────────────────────────────────────────────
  const TabBtn = ({ id, label, icon }) => (
    <button onClick={() => setActiveTab(id)} style={{
      display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px',
      border: 'none', borderBottom: activeTab === id ? '2px solid var(--primary)' : '2px solid transparent',
      backgroundColor: 'transparent',
      color: activeTab === id ? 'var(--primary)' : 'var(--text-secondary)',
      fontWeight: activeTab === id ? 700 : 500, fontSize: '0.88rem',
      cursor: 'pointer', transition: 'all 0.2s', marginBottom: '-2px', whiteSpace: 'nowrap',
    }}>
      {icon}{label}
    </button>
  );

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>

      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 10, minWidth: 300,
          backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', animation: 'slideInRight 0.3s ease',
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} color="#16a34a" /> : <AlertCircle size={18} color="#dc2626" />}
          <span style={{ fontSize: '0.84rem', fontWeight: 600, flex: 1, color: toast.type === 'success' ? '#15803d' : '#dc2626' }}>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={14} /></button>
        </div>
      )}

      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '0.2rem', letterSpacing: '-0.02em' }}>
            Access Control Matrix
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            {ALL_ROLES.length} roles · {modules.length} modules · {SIDEBAR_ITEMS.length} sidebar items
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {activeTab === 'roles' && <>
            <button onClick={() => setIsResetModalOpen(true)} style={btnStyle('ghost-danger')}>
              <RefreshCw size={14} /> Reset to Defaults
            </button>
            {hasChanges && (
              <button onClick={handleSave} disabled={saving} style={btnStyle('success')}>
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
          </>}
          {activeTab === 'sidebar' && sidebarChanged && (
            <button onClick={saveSidebarCfg} style={btnStyle('success')}>
              <Save size={14} /> Save Sidebar Config
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Bar ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem', overflowX: 'auto' }}>
        <TabBtn id="roles"       label="Role Permissions"  icon={<Shield size={15} />} />
        <TabBtn id="sidebar"     label="Sidebar Config"    icon={<Menu size={15} />} />
        <TabBtn id="stock_unlock" label="Stock Passcode"   icon={<Key size={15} />} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 1: ROLE PERMISSIONS
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: '1.1rem', alignItems: 'start' }}>

          {/* Role selector panel */}
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <Shield size={13} /> System Roles <span style={countBadge}>{ALL_ROLES.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '75vh', overflowY: 'auto' }}>
              {ALL_ROLES.map(role => {
                const count = grantedCount(role);
                const active = selectedRole === role;
                const color = ROLE_COLORS[role] || '#64748b';
                return (
                  <button key={role} onClick={() => {
                    if (hasChanges && !window.confirm('Discard unsaved changes?')) return;
                    setSelectedRole(role); setHasChanges(false); setModuleSearch('');
                  }} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 10px', borderRadius: '7px', border: 'none',
                    backgroundColor: active ? color + '15' : 'transparent',
                    color: active ? color : 'var(--text-primary)',
                    fontWeight: active ? 700 : 500,
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.8rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatRole(role)}</span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: active ? color : '#94a3b8', fontWeight: 700, background: active ? color + '20' : '#f1f5f9', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permissions table panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {selectedRole && (
              <div style={{ ...panelStyle, overflow: 'hidden' }}>
                {/* Panel header */}
                <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '7px', backgroundColor: ROLE_COLORS[selectedRole] || 'var(--primary-dark)', color: '#fff', borderRadius: '8px' }}>
                      <Lock size={15} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-dark)' }}>{formatRole(selectedRole)}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {grantedCount(selectedRole)} permissions granted · {hasChanges ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>● Unsaved changes</span> : <span style={{ color: '#10b981' }}>● Saved</span>}
                      </div>
                    </div>
                  </div>
                  {/* Bulk actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="text" placeholder="Filter modules…" value={moduleSearch}
                        onChange={e => setModuleSearch(e.target.value)}
                        style={{ paddingLeft: 26, paddingRight: 8, paddingTop: 6, paddingBottom: 6, border: '1.5px solid var(--border-color)', borderRadius: 7, fontSize: '0.78rem', outline: 'none', width: 150 }}
                      />
                    </div>
                    <button onClick={grantAll} style={btnStyle('ghost-sm')} title="Grant all permissions"><ToggleRight size={14} /> All On</button>
                    <button onClick={revokeAll} style={btnStyle('ghost-sm-danger')} title="Revoke all permissions"><ToggleLeft size={14} /> All Off</button>
                  </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.77rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '0.55rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.66rem', textAlign: 'left', minWidth: 160 }}>
                          Module
                        </th>
                        {ALL_ACTIONS.map(action => (
                          <th key={action} style={{ padding: '0.55rem 0.4rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => toggleColumn(action)}
                              title={`Toggle all "${action}" permissions`}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.66rem', padding: '2px 4px', borderRadius: '4px', transition: 'background 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,123,138,0.08)'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              {action}
                            </button>
                          </th>
                        ))}
                        <th style={{ padding: '0.55rem 0.6rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.66rem', textAlign: 'center', whiteSpace: 'nowrap' }}>Row</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredModules.length === 0 ? (
                        <tr><td colSpan={ALL_ACTIONS.length + 2} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>No modules match "{moduleSearch}"</td></tr>
                      ) : filteredModules.map((mod, idx) => {
                        const supported = mod.actions;
                        const allRowOn = supported.every(a => roleMatrix[selectedRole]?.[mod.name]?.[a]);
                        return (
                          <tr key={mod.name} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                            <td style={{ padding: '0.5rem 1rem' }}>
                              <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.79rem', lineHeight: 1.2 }}>{mod.display_name}</div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'monospace', opacity: 0.8 }}>{mod.name}</div>
                            </td>
                            {ALL_ACTIONS.map(action => {
                              const isSupported = supported.includes(action);
                              const isGranted   = !!roleMatrix[selectedRole]?.[mod.name]?.[action];
                              const changed     = isSupported && isDirty(mod.name, action);
                              return (
                                <td key={action} style={{ padding: '0.5rem 0.4rem', textAlign: 'center', position: 'relative' }}>
                                  {isSupported ? (
                                    <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
                                      {changed && (
                                        <div style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', backgroundColor: '#f59e0b', zIndex: 1 }} title="Changed" />
                                      )}
                                      <input
                                        type="checkbox" checked={isGranted}
                                        onChange={() => handleToggle(mod.name, action)}
                                        style={{ width: 14, height: 14, cursor: 'pointer', accentColor: ROLE_COLORS[selectedRole] || 'var(--primary)', margin: 0 }}
                                      />
                                    </label>
                                  ) : (
                                    <span style={{ fontSize: '0.55rem', color: '#e2e8f0' }}>—</span>
                                  )}
                                </td>
                              );
                            })}
                            {/* Row toggle */}
                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                              <button
                                onClick={() => toggleRow(mod)}
                                title={allRowOn ? 'Revoke all for this module' : 'Grant all for this module'}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: allRowOn ? '#10b981' : '#94a3b8', display: 'inline-flex', padding: '2px' }}
                              >
                                {allRowOn ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Diff legend + audit notice */}
            {hasChanges && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.7rem 1rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '0.78rem', color: '#92400e' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b', flexShrink: 0 }} />
                <strong>Unsaved changes:</strong> Orange dots mark modified cells. Click <em>Save Changes</em> to commit.
              </div>
            )}
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(0,123,138,0.04)', border: '1px dashed rgba(0,123,138,0.2)', borderRadius: '8px', fontSize: '0.76rem', color: 'var(--primary-dark)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <Info size={14} style={{ marginTop: 1, flexShrink: 0 }} />
              <div><strong>Column headers</strong> are clickable to toggle that action across all modules. <strong>Row toggles (→)</strong> grant or revoke all actions for a single module. Orange dot = unsaved change.</div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 2: SIDEBAR CONFIG
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'sidebar' && (
        <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: '1.1rem', alignItems: 'start' }}>

          {/* Role selector */}
          <div style={panelStyle}>
            <div style={panelHeaderStyle}><Menu size={13} /> Select Role</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '75vh', overflowY: 'auto' }}>
              {ALL_ROLES.map(role => {
                const active = sidebarRole === role;
                const color  = ROLE_COLORS[role] || '#64748b';
                const vis    = visibleCount(role);
                const total  = totalAccessible(role);
                return (
                  <button key={role} onClick={() => setSidebarRole(role)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 10px', borderRadius: '7px', border: 'none',
                    backgroundColor: active ? color + '15' : 'transparent',
                    color: active ? color : 'var(--text-primary)',
                    fontWeight: active ? 700 : 500, textAlign: 'left',
                    cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.8rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatRole(role)}</span>
                    </div>
                    <span style={{ fontSize: '0.63rem', color: active ? color : '#94a3b8', fontWeight: 700, background: active ? color + '20' : '#f1f5f9', padding: '1px 5px', borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {vis}/{total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div style={{ ...panelStyle, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ padding: '7px', backgroundColor: ROLE_COLORS[sidebarRole] || 'var(--primary-dark)', color: '#fff', borderRadius: '8px' }}>
                    <Menu size={15} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-dark)' }}>Sidebar: {formatRole(sidebarRole)}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>{visibleCount(sidebarRole)} visible</span> of {totalAccessible(sidebarRole)} accessible items
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => resetSidebarRole(sidebarRole)} style={btnStyle('ghost-danger')}>
                    <RefreshCw size={13} /> Reset
                  </button>
                </div>
              </div>

              {/* Item grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                {SIDEBAR_ITEMS.map((item, idx) => {
                  const hasAccess = item.allowedRoles.includes(sidebarRole);
                  const visible   = isVisible(sidebarRole, item.key);
                  const isLast    = idx === SIDEBAR_ITEMS.length - 1;
                  const { Icon }  = item;
                  return (
                    <div key={item.key} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.6rem 0.9rem',
                      borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                      opacity: hasAccess ? 1 : 0.38,
                      backgroundColor: !hasAccess ? '#fafbfc' : visible ? '#fff' : '#fff8f8',
                      transition: 'background-color 0.15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '7px', flexShrink: 0,
                          backgroundColor: hasAccess && visible ? (ROLE_COLORS[sidebarRole] || 'var(--primary)') + '15' : '#f1f5f9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: hasAccess && visible ? (ROLE_COLORS[sidebarRole] || 'var(--primary)') : '#9ca3af',
                          transition: 'all 0.2s',
                        }}>
                          <Icon size={14} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                          <div style={{ fontSize: '0.63rem', color: 'var(--text-secondary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.path}</div>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, marginLeft: '0.5rem' }}>
                        {!hasAccess
                          ? <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600, background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>No Access</span>
                          : <Toggle checked={visible} onChange={() => toggleSidebarItem(sidebarRole, item.key)} />
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(245,158,11,0.05)', border: '1px dashed rgba(245,158,11,0.3)', borderRadius: '8px', fontSize: '0.76rem', color: '#92400e', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
              <div>Sidebar config is stored in the browser and takes effect immediately. Items with <strong>"No Access"</strong> cannot be enabled — they are blocked by route-level permissions. Toggling only hides items the role already has access to. Click <strong>"Save Sidebar Config"</strong> to persist changes.</div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 3: STOCK PASSCODE
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'stock_unlock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Passcode generator */}
          <div style={panelStyle}>
            <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', backgroundColor: 'rgba(0,123,138,0.1)', color: 'var(--primary-dark)', borderRadius: '8px' }}><Key size={17} /></div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-dark)' }}>Daily Stock Checkup Passcode</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Generate monthly override passwords for nursing staff to unlock stock editing</div>
              </div>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'flex-end' }}>
              {/* Month */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 190 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={13} /> Target Month
                </label>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                  style={{ padding: '9px 10px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '8px', fontSize: '0.88rem', outline: 'none', cursor: 'pointer' }}>
                  {DYNAMIC_MONTHS.map(m => <option key={m} value={m}>{getMonthLabel(m)}</option>)}
                </select>
              </div>
              {/* Passcode display */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: 240 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-dark)' }}>Active Passcode</label>
                <div style={{ display: 'flex', gap: '7px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input type={passcodeVisible ? 'text' : 'password'} readOnly
                      value={loadingPasscode ? 'Loading…' : (monthPasscode || 'No passcode for this month')}
                      style={{
                        width: '100%', padding: '9px 36px 9px 12px',
                        backgroundColor: monthPasscode ? '#f8fafc' : '#fff1f2',
                        border: `1.5px solid ${monthPasscode ? 'var(--border-color)' : '#fecaca'}`,
                        borderRadius: '8px', fontSize: '0.95rem', fontWeight: monthPasscode ? 700 : 400,
                        color: monthPasscode ? 'var(--text-primary)' : '#b91c1c',
                        letterSpacing: passcodeVisible && monthPasscode ? '0.12em' : 'normal', outline: 'none',
                      }} />
                    {monthPasscode && (
                      <button type="button" onClick={() => setPasscodeVisible(v => !v)}
                        style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        {passcodeVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    )}
                  </div>
                  {monthPasscode && (
                    <button type="button" onClick={handleCopy}
                      style={{ padding: '0.55rem 0.8rem', backgroundColor: '#fff', border: '1.5px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', color: copied ? '#10b981' : 'var(--text-primary)', transition: 'all 0.2s' }}>
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  )}
                </div>
              </div>
              {/* Action */}
              <button type="button" onClick={handleRegenerate} disabled={regenerating || loadingPasscode}
                style={{ ...btnStyle(monthPasscode ? 'primary' : 'success'), height: 40, opacity: regenerating || loadingPasscode ? 0.7 : 1 }}>
                <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
                {monthPasscode ? 'Regenerate' : 'Generate Passcode'}
              </button>
            </div>
          </div>

          {/* Unlock logs */}
          <div style={panelStyle}>
            <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', backgroundColor: 'rgba(0,123,138,0.1)', color: 'var(--primary-dark)', borderRadius: '8px' }}><History size={17} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-dark)' }}>Stock Unlock Audit Logs</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Staff who unlocked stock editing this period</div>
                </div>
              </div>
              <button onClick={fetchLogs} disabled={loadingLogs} style={btnStyle('ghost-sm')}>
                <RefreshCw size={13} className={loadingLogs ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
            <div style={{ padding: loadingLogs || unlockLogs.length === 0 ? '2rem' : 0 }}>
              {loadingLogs ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}><RefreshCw size={24} className="animate-spin" style={{ color: 'var(--primary)' }} /></div>
              ) : unlockLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 0', border: '1.5px dashed var(--border-color)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  <History size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.25 }} /><br />No unlock logs recorded.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', backgroundColor: '#f8fafc', borderBottom: '1.5px solid var(--border-color)' }}>
                        {['Target Month', 'Staff Member', 'Username', 'Unlock Timestamp'].map(h => (
                          <th key={h} style={{ padding: '0.65rem 1rem', fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {unlockLogs.map(log => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{getMonthLabel(log.month_year)}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                              <User size={12} style={{ color: 'var(--text-secondary)' }} />{log.full_name || 'N/A'}
                            </div>
                          </td>
                          <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>@{log.username}</td>
                          <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>
                            {new Date(log.unlocked_at).toLocaleString('default', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Modal ────────────────────────────────────────────────────────── */}
      <Modal isOpen={isResetModalOpen} onClose={() => { setIsResetModalOpen(false); setAdminPassword(''); }} title="Protocol Reset Authorization" maxWidth="460px">
        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#fff1f2', borderRadius: '9px', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.83rem', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 6px', fontWeight: 700 }}>⚠ CRITICAL ACTION</p>
            This will overwrite all custom permissions for <RoleBadge role={selectedRole} /> with system defaults. <strong>This cannot be undone.</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-dark)' }}>Confirm with your password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input type="password" required value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
                placeholder="Enter your admin password"
                style={{ width: '100%', padding: '9px 9px 9px 34px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '8px', outline: 'none', fontSize: '0.9rem' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button type="submit" disabled={resetting || !adminPassword}
              style={{ flex: 2, padding: '0.75rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', opacity: resetting || !adminPassword ? 0.7 : 1, fontSize: '0.88rem' }}>
              {resetting ? 'Verifying…' : 'Confirm Reset'}
            </button>
            <button type="button" onClick={() => { setIsResetModalOpen(false); setAdminPassword(''); }}
              style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f1f5f9', color: 'var(--text-primary)', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <style>{`
        @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

// ─── Style helpers ─────────────────────────────────────────────────────────────
const panelStyle = { backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid var(--border-color, #e2e8f0)' };
const panelHeaderStyle = { padding: '0.55rem 0.85rem', fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' };
const countBadge = { marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 700, background: 'rgba(0,123,138,0.1)', color: 'var(--primary)', padding: '1px 5px', borderRadius: '4px' };

const btnStyle = (variant) => {
  const base = { display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s', fontSize: '0.82rem', padding: '0.55rem 1rem', whiteSpace: 'nowrap' };
  const variants = {
    primary:        { ...base, backgroundColor: 'var(--primary)', color: '#fff' },
    success:        { ...base, backgroundColor: '#059669', color: '#fff', boxShadow: '0 4px 10px -2px rgba(5,150,105,0.3)' },
    'ghost-danger': { ...base, backgroundColor: 'transparent', color: '#dc2626', border: '1.5px solid rgba(220,53,69,0.2)', padding: '0.45rem 0.9rem' },
    'ghost-sm':     { ...base, backgroundColor: '#f8fafc', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)', padding: '0.4rem 0.75rem', fontSize: '0.78rem' },
    'ghost-sm-danger': { ...base, backgroundColor: '#fff8f8', color: '#dc2626', border: '1.5px solid #fecaca', padding: '0.4rem 0.75rem', fontSize: '0.78rem' },
  };
  return variants[variant] || base;
};

export default Permissions;
