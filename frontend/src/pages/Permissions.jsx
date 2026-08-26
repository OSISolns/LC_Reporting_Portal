import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Save, RefreshCw, CheckCircle2, AlertCircle, X, ChevronRight,
  Lock, Key, Eye, EyeOff, Copy, Check, Calendar, History, User,
  Menu, Search, Zap, BarChart2, ToggleLeft, ToggleRight, Info,
  LayoutDashboard, FileText, ReceiptText, AlertTriangle, Users, Brain,
  Award, Clock, PenTool, Stethoscope, MessageSquare, Activity, Building,
  ShieldAlert, TrendingDown, ShieldCheck, Server, Database, Filter, Sliders,
  UserCheck, CornerDownRight, CheckSquare, Square, RotateCcw, HelpCircle,
  FlaskConical, Heart, Dumbbell, Settings, ScanLine, ArrowRight
} from 'lucide-react';
import {
  getModules, getRoleMatrix, updateRolePermissions,
  resetRolePermissions, getUserEffectivePermissions, setUserOverride
} from '../api/permissions';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

// ─── Roles List & Categorization ───────────────────────────────────────────────
const ROLE_GROUPS = [
  {
    name: 'Executive & Management',
    roles: ['admin', 'coo', 'deputy_coo', 'chairman', 'sales_manager', 'medical_director']
  },
  {
    name: 'Clinical & Doctors',
    roles: ['doctor', 'consultant', 'pa', 'staff']
  },
  {
    name: 'Nursing Department',
    roles: ['nurse', 'chef-nurse', 'deputy_chef_nurse', 'deputy-chef-nurse', 'deputy_chief_nurse']
  },
  {
    name: 'Diagnostics & Labs',
    roles: ['lab_team_lead', 'lab_lead', 'lab_manager', 'quality_manager', 'qm', 'lab_tech', 'lab', 'imaging_tech', 'imaging_manager']
  },
  {
    name: 'Specialized Clinics',
    roles: ['dentist', 'dental_hod', 'dental_tech', 'dental_lab_manager', 'dental', 'physiotherapist', 'physio', 'physio_manager']
  },
  {
    name: 'Operations & Support',
    roles: ['operations_staff', 'operations', 'cashier', 'principal_cashier', 'customer_care', 'stock-manager', 'procurement-manager', 'it_officer', 'hsfp']
  }
];

const ALL_ROLES = ROLE_GROUPS.flatMap(g => g.roles);

// Role display colors for badges
const ROLE_COLORS = {
  admin: '#1C69A0', it_officer: '#2563eb', coo: '#0891b2', deputy_coo: '#0284c7',
  chairman: '#d97706', sales_manager: '#059669', cashier: '#0f766e',
  principal_cashier: '#0d9488', customer_care: '#1C69A0', lab_team_lead: '#4f46e5',
  lab_lead: '#4f46e5', lab_manager: '#4338ca', quality_manager: '#0d9488', qm: '#0d9488', consultant: '#1C69A0',
  operations_staff: '#b45309', operations: '#b45309', pa: '#1C69A0',
  staff: '#64748b', hsfp: '#dc2626', nurse: '#db2777', 'chef-nurse': '#1C69A0',
  chief_nurse: '#1C69A0', head_nurse: '#1C69A0', nursing_lead: '#1C69A0',
  deputy_chef_nurse: '#0284c7', 'deputy-chef-nurse': '#0284c7', deputy_chief_nurse: '#0284c7',
  'stock-manager': '#16a34a', doctor: '#2563eb', medical_director: '#be123c',
  'procurement-manager': '#0d9488', imaging_tech: '#8b5cf6', imaging_manager: '#7c3aed',
  dental_hod: '#059669', dental_tech: '#10b981', dental_lab_manager: '#047857',
  dental: '#34d399', dentist: '#059669', lab_tech: '#6366f1', lab: '#818cf8',
  physio_manager: '#ea580c', physio: '#f97316', physiotherapist: '#f97316'
};

const formatRole = (r) => r ? r.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';

// ─── Module Categorization ─────────────────────────────────────────────────────
const MODULE_GROUPS = {
  'Core System & Admin': ['user_management', 'audit_logs', 'reports', 'ai_insights', 'it_support'],
  'Clinical & Patient Care': ['clinical_observation', 'patients', 'incident_reports', 'feedbacks', 'staff_performance'],
  'Diagnostics & Speciality': ['lab', 'imaging', 'dental', 'physio', 'results_transfer'],
  'Operations & Logistics': ['operations', 'shifts', 'inventory', 'procurement', 'cancellations', 'refunds'],
  'Quality & Governance': ['safety', 'compliance', 'revenue_leakage']
};

// ─── Sidebar config persistence ────────────────────────────────────────────────
const SIDEBAR_CONFIG_KEY = 'lc_sidebar_config';
const loadSidebarConfig = () => { try { return JSON.parse(localStorage.getItem(SIDEBAR_CONFIG_KEY) || '{}'); } catch { return {}; } };
const persistSidebarConfig = (cfg) => { localStorage.setItem(SIDEBAR_CONFIG_KEY, JSON.stringify(cfg)); window.dispatchEvent(new CustomEvent('sidebar-config-changed')); };

// ─── Sidebar Items List ────────────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { key: 'dashboard',       name: 'Dashboard',           Icon: LayoutDashboard, path: '/',                         allowedRoles: ALL_ROLES },
  { key: 'cancellations',   name: 'Cancellations',       Icon: FileText,        path: '/cancellations',            allowedRoles: ['cashier','principal_cashier','customer_care','operations_staff','sales_manager','coo','chairman','admin','deputy_coo','consultant'] },
  { key: 'refunds',         name: 'Refunds',             Icon: ReceiptText,     path: '/refunds',                  allowedRoles: ['cashier','principal_cashier','customer_care','operations_staff','sales_manager','coo','chairman','admin','deputy_coo','consultant'] },
  { key: 'incidents',       name: 'Incident Reports',    Icon: AlertTriangle,   path: '/incidents',                allowedRoles: ['nurse','admin','doctor','consultant','hsfp','operations_staff','customer_care','it_officer','chef-nurse','pa','stock-manager','coo','deputy_coo','medical_director','procurement-manager'] },
  { key: 'safety',          name: 'Safety Workspace',    Icon: PenTool,         path: '/safety-management',        allowedRoles: ['hsfp','admin','deputy_coo','medical_director'] },
  { key: 'risk',            name: 'Risk Register',       Icon: ShieldAlert,     path: '/risk-register',            allowedRoles: ['hsfp','admin','deputy_coo','medical_director'] },
  { key: 'infection',       name: 'Infection Control',   Icon: Activity,        path: '/infection-control',        allowedRoles: ['hsfp','admin','deputy_coo','medical_director'] },
  { key: 'results',         name: 'Result Transfers',    Icon: RefreshCw,       path: '/results-transfer',         allowedRoles: ['cashier','principal_cashier','customer_care','operations_staff','lab_team_lead','sales_manager','coo','chairman','admin','deputy_coo','consultant'] },
  { key: 'performance',     name: 'Performance',         Icon: Award,           path: '/performance',              allowedRoles: ['sales_manager','coo','chairman','admin','deputy_coo','cashier','principal_cashier','customer_care','operations_staff'] },
  { key: 'nursing_hub',     name: 'Nursing Hub',         Icon: Stethoscope,     path: '/nursing-hub',              allowedRoles: ['nurse','admin','chef-nurse'] },
  { key: 'doctor_hub',      name: 'Doctor Hub',          Icon: Stethoscope,     path: '/doctor-hub',               allowedRoles: ['doctor','consultant','admin','medical_director'] },
  { key: 'imaging',         name: 'Imaging Hub',         Icon: ScanLine,        path: '/imaging',                  allowedRoles: ['imaging_tech','imaging_manager','admin','coo','deputy_coo','medical_director'] },
  { key: 'lab_hub',         name: 'Laboratory Hub',      Icon: FlaskConical,    path: '/lab',                      allowedRoles: ['admin','deputy_coo','lab_team_lead','lab_tech','lab'] },
  { key: 'dental_hub',      name: 'Dental Hub',          Icon: Heart,           path: '/dental',                   allowedRoles: ['admin','deputy_coo','dental','dentist','dental_tech','dental_hod','dental_lab_manager'] },
  { key: 'physio_hub',      name: 'Physio Hub',          Icon: Dumbbell,        path: '/physio',                   allowedRoles: ['admin','deputy_coo','physiotherapist','physio','physio_manager'] },
  { key: 'operations_hub',  name: 'Operations Hub',      Icon: Settings,        path: '/operations',               allowedRoles: ['admin','deputy_coo','operations_staff','coo'] },
  { key: 'central_store',   name: 'General Store',       Icon: Database,        path: '/central-store',            allowedRoles: ['admin','deputy_coo','stock-manager'] },
  { key: 'master',          name: 'Master Module',       Icon: Database,        path: '/master',                   allowedRoles: ['admin','stock-manager'] },
  { key: 'procurement',     name: 'Procurement Hub',     Icon: Building,        path: '/procurement',              allowedRoles: ['admin','procurement-manager','deputy_coo'] },
  { key: 'supplier',        name: 'Supplier Portal',     Icon: Building,        path: '/supplier-portal-manager',  allowedRoles: ['admin','procurement-manager','deputy_coo'] },
  { key: 'daily_report',    name: 'Daily Report',        Icon: Activity,        path: '/nursing-hub/daily-report', allowedRoles: ['nurse','chef-nurse'] },
  { key: 'daily_board',     name: 'Reports Board',       Icon: FileText,        path: '/daily-reports-board',      allowedRoles: ['sales_manager','coo','chairman','admin','deputy_coo','principal_cashier','consultant','chef-nurse','pa','medical_director'] },
  { key: 'clinical_sheets', name: 'Clinical Sheets',     Icon: FileText,        path: '/clinical-sheets',          allowedRoles: ['nurse','admin','doctor','consultant','chef-nurse','medical_director'] },
  { key: 'insights',        name: 'AI Insights',         Icon: Brain,           path: '/ai-insights',              allowedRoles: ['sales_manager','coo','chairman','admin','deputy_coo','principal_cashier','consultant','medical_director'] },
  { key: 'revenue',         name: 'Revenue Tracker',     Icon: TrendingDown,    path: '/revenue-tracker',          allowedRoles: ['sales_manager','chairman','admin','principal_cashier','deputy_coo'] },
  { key: 'compliance',      name: 'Compliance',          Icon: ShieldCheck,     path: '/compliance',               allowedRoles: ['admin','hsfp'] },
  { key: 'it_hub',          name: 'IT Support Hub',      Icon: Server,          path: '/it-ticketing',             allowedRoles: ALL_ROLES },
  { key: 'users',           name: 'User Management',     Icon: Users,           path: '/users',                    allowedRoles: ['admin','it_officer'] },
  { key: 'permissions',     name: 'Permissions',         Icon: Shield,          path: '/permissions',              allowedRoles: ['admin'] },
  { key: 'audit_logs',      name: 'Audit Logs',          Icon: History,         path: '/audit-logs',               allowedRoles: ['admin'] },
  { key: 'shifts',          name: 'Shifts',              Icon: Clock,           path: '/shifts',                   allowedRoles: ['cashier','customer_care','nurse','principal_cashier','sales_manager','deputy_coo','coo','admin','operations_staff','chef-nurse','pa'] },
  { key: 'roster_generator', name: 'Roster Generator',   Icon: FileText,        path: '/roster-generator',         allowedRoles: ['admin','deputy_coo','coo','pa','medical_director','doctor','consultant','chef-nurse'] },
  { key: 'feedbacks',       name: 'Internal Feedback',   Icon: MessageSquare,   path: '/feedbacks',                allowedRoles: ['coo','deputy_coo','chef-nurse','medical_director'] },
];

const RoleBadge = ({ role, size = 'sm' }) => {
  const color = ROLE_COLORS[role] || '#64748b';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold tracking-tight border ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}
      style={{ backgroundColor: `${color}12`, color, borderColor: `${color}30` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {formatRole(role)}
    </span>
  );
};

export default function Permissions() {
  const [activeTab, setActiveTab] = useState('roles'); // 'roles' | 'overrides' | 'sidebar' | 'evaluator'

  // Matrix state
  const [modules, setModules]       = useState([]);
  const [roleMatrix, setRoleMatrix] = useState({});
  const [origMatrix, setOrigMatrix] = useState({});
  const [selectedRole, setSelectedRole] = useState('nurse');
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const [moduleSearch, setModuleSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Copy modal
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySourceRole, setCopySourceRole]   = useState('');

  // Reset modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [adminPassword, setAdminPassword]       = useState('');
  const [resetting, setResetting]               = useState(false);

  // Sidebar Config state
  const [sidebarConfigState, setSidebarConfigState] = useState(() => loadSidebarConfig());
  const [sidebarChanged, setSidebarChanged]         = useState(false);

  // User Overrides state
  const [usersList, setUsersList]               = useState([]);
  const [selectedUser, setSelectedUser]         = useState(null);
  const [userEffectivePerms, setUserEffectivePerms] = useState({});
  const [loadingUserPerms, setLoadingUserPerms] = useState(false);
  const [overrideReason, setOverrideReason]     = useState('');
  const [userSearchTerm, setUserSearchTerm]     = useState('');

  // Access Evaluator Simulator state
  const [evalRole, setEvalRole]       = useState('nurse');
  const [evalModule, setEvalModule] = useState('clinical_observation');
  const [evalAction, setEvalAction] = useState('view');

  // Load initial permissions matrix & modules
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [modRes, matrixRes, usersRes] = await Promise.all([
        getModules(),
        getRoleMatrix(),
        api.get('/users').catch(() => ({ data: { data: [] } }))
      ]);
      setModules(modRes.data || []);
      setRoleMatrix(matrixRes.data || {});
      setOrigMatrix(JSON.parse(JSON.stringify(matrixRes.data || {})));
      setUsersList(usersRes.data?.data || usersRes.data || []);
    } catch (err) {
      toast.error('Failed to load system permissions matrix');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load user effective permissions when user selected in Overrides tab
  const loadUserPerms = useCallback(async (userId) => {
    if (!userId) return;
    try {
      setLoadingUserPerms(true);
      const res = await getUserEffectivePermissions(userId);
      setUserEffectivePerms(res.data || {});
    } catch {
      toast.error('Failed to fetch user permissions');
    } finally {
      setLoadingUserPerms(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUser?.id) loadUserPerms(selectedUser.id);
  }, [selectedUser, loadUserPerms]);

  // Matrix cell toggle
  const handleToggle = (moduleName, action) => {
    setRoleMatrix(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[selectedRole]) next[selectedRole] = {};
      if (!next[selectedRole][moduleName]) next[selectedRole][moduleName] = {};
      next[selectedRole][moduleName][action] = !next[selectedRole][moduleName][action];
      return next;
    });
    setHasChanges(true);
  };

  // Bulk actions for role
  const handleBulkGrantAll = () => {
    setRoleMatrix(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[selectedRole]) next[selectedRole] = {};
      modules.forEach(m => {
        if (!next[selectedRole][m.name]) next[selectedRole][m.name] = {};
        m.actions.forEach(a => { next[selectedRole][m.name][a] = true; });
      });
      return next;
    });
    setHasChanges(true);
    toast.success(`Granted all permissions for ${formatRole(selectedRole)}`);
  };

  const handleBulkRevokeAll = () => {
    setRoleMatrix(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[selectedRole]) next[selectedRole] = {};
      modules.forEach(m => {
        if (!next[selectedRole][m.name]) next[selectedRole][m.name] = {};
        m.actions.forEach(a => { next[selectedRole][m.name][a] = false; });
      });
      return next;
    });
    setHasChanges(true);
    toast.success(`Revoked all permissions for ${formatRole(selectedRole)}`);
  };

  const handleCopyPermissions = () => {
    if (!copySourceRole) return;
    const sourcePerms = roleMatrix[copySourceRole] || {};
    setRoleMatrix(prev => ({
      ...prev,
      [selectedRole]: JSON.parse(JSON.stringify(sourcePerms))
    }));
    setHasChanges(true);
    setIsCopyModalOpen(false);
    toast.success(`Copied permissions from ${formatRole(copySourceRole)} to ${formatRole(selectedRole)}`);
  };

  // Save role permissions
  const handleSave = async () => {
    try {
      setSaving(true);
      const permsToSave = roleMatrix[selectedRole] || {};
      await updateRolePermissions(selectedRole, permsToSave);
      setOrigMatrix(JSON.parse(JSON.stringify(roleMatrix)));
      setHasChanges(false);
      toast.success(`Access permissions for ${formatRole(selectedRole)} saved!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save role permissions');
    } finally {
      setSaving(false);
    }
  };

  // Reset role to system defaults
  const handleReset = async (e) => {
    e.preventDefault();
    if (!adminPassword) return toast.error('Admin password required');
    try {
      setResetting(true);
      await resetRolePermissions(selectedRole, adminPassword);
      setIsResetModalOpen(false);
      setAdminPassword('');
      await loadData();
      toast.success(`Permissions for ${formatRole(selectedRole)} reset to defaults.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid admin password');
    } finally {
      setResetting(false);
    }
  };

  // User override action
  const handleSetUserOverride = async (moduleName, actionName, currentVal) => {
    if (!selectedUser) return;
    const nextVal = currentVal === null ? true : currentVal === true ? false : null; // Toggle: Default -> Grant -> Deny -> Default
    try {
      await setUserOverride(selectedUser.id, moduleName, actionName, nextVal, overrideReason || 'Admin override');
      toast.success(nextVal === null ? 'Override removed (reverted to role default)' : `Override set: ${nextVal ? 'GRANTED' : 'DENIED'}`);
      loadUserPerms(selectedUser.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set override');
    }
  };

  // Sidebar config toggle
  const handleSidebarToggle = (role, itemKey) => {
    setSidebarConfigState(prev => {
      const roleCfg = { ...(prev[role] || {}) };
      roleCfg[itemKey] = roleCfg[itemKey] === false ? true : false;
      return { ...prev, [role]: roleCfg };
    });
    setSidebarChanged(true);
  };

  const saveSidebarCfg = () => {
    persistSidebarConfig(sidebarConfigState);
    setSidebarChanged(false);
    toast.success('Sidebar visibility configuration saved!');
  };

  // Filtered modules by category & search
  const filteredModules = useMemo(() => {
    return modules.filter(m => {
      const matchSearch = m.name.toLowerCase().includes(moduleSearch.toLowerCase()) ||
                          (m.display || m.display_name || '').toLowerCase().includes(moduleSearch.toLowerCase());
      if (selectedCategory === 'All') return matchSearch;
      const groupModules = MODULE_GROUPS[selectedCategory] || [];
      return matchSearch && groupModules.includes(m.name);
    });
  }, [modules, moduleSearch, selectedCategory]);

  // Diff count for current role
  const diffCount = useMemo(() => {
    let count = 0;
    const cur = roleMatrix[selectedRole] || {};
    const orig = origMatrix[selectedRole] || {};
    modules.forEach(m => {
      m.actions.forEach(a => {
        if (!!cur[m.name]?.[a] !== !!orig[m.name]?.[a]) count++;
      });
    });
    return count;
  }, [roleMatrix, origMatrix, selectedRole, modules]);

  // Filtered users for overrides search
  const filteredUsers = useMemo(() => {
    if (!userSearchTerm) return usersList;
    return usersList.filter(u =>
      (u.full_name || u.fullName || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (u.role || '').toLowerCase().includes(userSearchTerm.toLowerCase())
    );
  }, [usersList, userSearchTerm]);

  // Evaluation Simulator status computation
  const evalResult = useMemo(() => {
    if (evalRole === 'admin') return { granted: true, reason: 'Admin role bypass (full system access granted)' };
    const curPerms = roleMatrix[evalRole] || {};
    const granted = curPerms[evalModule]?.[evalAction] ?? false;
    return {
      granted,
      reason: granted
        ? `Access GRANTED for role '${formatRole(evalRole)}' on module '${evalModule}' (${evalAction})`
        : `Access DENIED — role '${formatRole(evalRole)}' does not have '${evalAction}' permission on '${evalModule}'`
    };
  }, [evalRole, evalModule, evalAction, roleMatrix]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
            <Shield size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-800">Access Control Matrix & Governance</h1>
              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                v2.4 Production
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage system permissions, functional role matrices, user overrides, and navigation visibility
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
            >
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              Save Changes ({diffCount})
            </button>
          )}
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <RefreshCw size={15} /> Reload
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        {[
          { id: 'roles',     label: 'Role Permissions Matrix', icon: Shield },
          { id: 'overrides', label: 'User Permission Overrides', icon: UserCheck },
          { id: 'sidebar',   label: 'Sidebar Navigation Config', icon: Menu },
          { id: 'evaluator', label: 'Access Simulator',         icon: Zap },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 -mb-px transition-all whitespace-nowrap ${
              activeTab === id
                ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          TAB 1: ROLE PERMISSIONS MATRIX
      ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column — Role Selector Panel */}
          <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-5 space-y-4 shadow-sm h-fit">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Select Role</span>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{ALL_ROLES.length} Roles</span>
            </div>

            {/* Role Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search roles..."
                value={roleSearch}
                onChange={e => setRoleSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:border-blue-400"
              />
            </div>

            {/* Role Groups List */}
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {ROLE_GROUPS.map(group => {
                const groupRoles = group.roles.filter(r =>
                  formatRole(r).toLowerCase().includes(roleSearch.toLowerCase()) || r.toLowerCase().includes(roleSearch.toLowerCase())
                );
                if (groupRoles.length === 0) return null;

                return (
                  <div key={group.name} className="space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 pt-1">{group.name}</div>
                    {groupRoles.map(role => {
                      const isSelected = selectedRole === role;
                      const color = ROLE_COLORS[role] || '#64748b';
                      return (
                        <button
                          key={role}
                          onClick={() => {
                            if (hasChanges && !window.confirm('Discard unsaved changes for the current role?')) return;
                            setSelectedRole(role);
                            setHasChanges(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                              : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isSelected ? '#ffffff' : color }} />
                            <span>{formatRole(role)}</span>
                          </div>
                          <ChevronRight size={14} className={isSelected ? 'text-white' : 'text-slate-300'} />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column — Permission Grid */}
          <div className="lg:col-span-8 space-y-4">
            {/* Header info & bulk actions bar */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-800">{formatRole(selectedRole)}</h2>
                    <RoleBadge role={selectedRole} />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure granular functional permissions for users assigned the <span className="font-semibold text-slate-600">{selectedRole}</span> role.
                  </p>
                </div>

                {/* Bulk Action Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkGrantAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors"
                  >
                    <CheckSquare size={13} /> Grant All
                  </button>
                  <button
                    onClick={handleBulkRevokeAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <Square size={13} /> Revoke All
                  </button>
                  <button
                    onClick={() => setIsCopyModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    <Copy size={13} /> Copy From...
                  </button>
                  <button
                    onClick={() => setIsResetModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
                  >
                    <RotateCcw size={13} /> Reset Defaults
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-1">Category:</span>
                  {['All', ...Object.keys(MODULE_GROUPS)].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                        selectedCategory === cat ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search module..."
                    value={moduleSearch}
                    onChange={e => setModuleSearch(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:border-blue-400 w-44"
                  />
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                      <th className="px-5 py-3.5">Module</th>
                      <th className="px-3 py-3.5 text-center">View</th>
                      <th className="px-3 py-3.5 text-center">Create</th>
                      <th className="px-3 py-3.5 text-center">Edit</th>
                      <th className="px-3 py-3.5 text-center">Review</th>
                      <th className="px-3 py-3.5 text-center">Approve</th>
                      <th className="px-3 py-3.5 text-center">Reject</th>
                      <th className="px-3 py-3.5 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredModules.map((m, idx) => {
                      const curPerms = roleMatrix[selectedRole]?.[m.name] || {};
                      const origPerms = origMatrix[selectedRole]?.[m.name] || {};

                      return (
                        <tr key={m.name} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3">
                            <div className="font-bold text-slate-800">{m.display || m.display_name || m.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{m.name}</div>
                          </td>
                          {['view', 'create', 'edit', 'review', 'approve', 'reject', 'delete'].map(act => {
                            const isSupported = m.actions.includes(act);
                            if (!isSupported) {
                              return <td key={act} className="px-3 py-3 text-center text-slate-200">—</td>;
                            }
                            const isChecked = !!curPerms[act];
                            const isDiff = !!curPerms[act] !== !!origPerms[act];

                            return (
                              <td key={act} className={`px-3 py-3 text-center transition-colors ${isDiff ? 'bg-amber-50/50' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggle(m.name, act)}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          TAB 2: USER PERMISSION OVERRIDES
      ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overrides' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column — User Selector */}
          <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-5 space-y-4 shadow-sm h-fit">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Select User</span>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{usersList.length} Users</span>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name or role..."
                value={userSearchTerm}
                onChange={e => setUserSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:border-blue-400"
              />
            </div>

            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
              {filteredUsers.map(u => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left border transition-all ${
                      isSelected ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-sm' : 'bg-slate-50/50 border-slate-100 hover:border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{u.full_name || u.fullName || u.username}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">@{u.username} • {formatRole(u.role)}</div>
                    </div>
                    <RoleBadge role={u.role} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column — User Effective Matrix & Overrides */}
          <div className="lg:col-span-8 space-y-4">
            {!selectedUser ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center space-y-3">
                <UserCheck size={36} className="text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">No User Selected</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Select a staff member from the left list to view their effective system permissions or grant/revoke specific custom overrides.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-800">{selectedUser.full_name || selectedUser.fullName}</h2>
                        <RoleBadge role={selectedUser.role} />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        User ID #{selectedUser.id} • User-level overrides supercede standard role defaults.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-500">Override Reason / Justification:</label>
                    <input
                      type="text"
                      placeholder="e.g. Approved by COO for special project access..."
                      value={overrideReason}
                      onChange={e => setOverrideReason(e.target.value)}
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                  {loadingUserPerms ? (
                    <div className="flex items-center justify-center py-16">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                            <th className="px-5 py-3.5">Module</th>
                            <th className="px-3 py-3.5 text-center">Action</th>
                            <th className="px-3 py-3.5 text-center">Role Default</th>
                            <th className="px-3 py-3.5 text-center">Effective Access</th>
                            <th className="px-4 py-3.5 text-right">Custom Override Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {modules.map(m => {
                            const userMod = userEffectivePerms[m.name] || {};
                            return m.actions.map(act => {
                              const item = userMod[act] || { granted: false, source: 'role' };
                              const isOverride = item.source === 'override';

                              return (
                                <tr key={`${m.name}-${act}`} className={isOverride ? 'bg-amber-50/30' : 'hover:bg-slate-50/50'}>
                                  <td className="px-5 py-2.5 font-bold text-slate-800">{m.display || m.name}</td>
                                  <td className="px-3 py-2.5 text-center font-mono text-slate-500">{act}</td>
                                  <td className="px-3 py-2.5 text-center text-slate-400">
                                    {item.source === 'role' ? (item.granted ? 'Granted' : 'Denied') : 'Role default'}
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      item.granted ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                      {item.granted ? '✓ Granted' : '✗ Denied'}
                                      {isOverride && <span className="text-amber-600 font-black ml-1">(Override)</span>}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => handleSetUserOverride(m.name, act, true)}
                                        className="px-2 py-1 text-[10px] font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg"
                                      >
                                        Force Grant
                                      </button>
                                      <button
                                        onClick={() => handleSetUserOverride(m.name, act, false)}
                                        className="px-2 py-1 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg"
                                      >
                                        Force Deny
                                      </button>
                                      {isOverride && (
                                        <button
                                          onClick={() => handleSetUserOverride(m.name, act, null)}
                                          className="px-2 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg"
                                        >
                                          Revert
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          TAB 3: SIDEBAR NAVIGATION CONFIG MATRIX
      ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'sidebar' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-800">Sidebar Menu Visibility Matrix</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Toggle which sidebar navigation links appear for each system role. Overrides default routing accessibility.
              </p>
            </div>

            {sidebarChanged && (
              <button
                onClick={saveSidebarCfg}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-md"
              >
                <Save size={15} /> Save Sidebar Config
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="px-5 py-3.5 sticky left-0 bg-slate-50">Sidebar Link Item</th>
                    {ALL_ROLES.map(r => (
                      <th key={r} className="px-3 py-3.5 text-center min-w-[90px]">{formatRole(r)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {SIDEBAR_ITEMS.map(item => (
                    <tr key={item.key} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 font-bold text-slate-800 sticky left-0 bg-white shadow-sm flex items-center gap-2">
                        {item.Icon && <item.Icon size={15} className="text-slate-400" />}
                        {item.name}
                      </td>
                      {ALL_ROLES.map(role => {
                        const isRoleAllowed = item.allowedRoles.includes(role);
                        const roleCfg = sidebarConfigState[role] || {};
                        const isExplicitlyHidden = roleCfg[item.key] === false;
                        const isVisible = isRoleAllowed && !isExplicitlyHidden;

                        return (
                          <td key={role} className="px-3 py-3 text-center">
                            {isRoleAllowed ? (
                              <button
                                onClick={() => handleSidebarToggle(role, item.key)}
                                className={`w-6 h-6 rounded-lg font-bold text-[11px] transition-all inline-flex items-center justify-center ${
                                  isVisible
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                }`}
                              >
                                {isVisible ? '✓' : '✕'}
                              </button>
                            ) : (
                              <span className="text-slate-200">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          TAB 4: ACCESS SIMULATOR / INSPECTOR
      ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'evaluator' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-md">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">Permission Evaluation Simulator</h2>
              <p className="text-xs text-slate-400 mt-0.5">Test real-time access rules for any role, module, and action combination.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Select Role</label>
              <select
                value={evalRole}
                onChange={e => setEvalRole(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
              >
                {ALL_ROLES.map(r => <option key={r} value={r}>{formatRole(r)}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Select Module</label>
              <select
                value={evalModule}
                onChange={e => setEvalModule(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
              >
                {modules.map(m => <option key={m.name} value={m.name}>{m.display || m.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Select Action</label>
              <select
                value={evalAction}
                onChange={e => setEvalAction(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
              >
                {['view', 'create', 'edit', 'review', 'approve', 'reject', 'delete', 'download'].map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className={`p-5 rounded-2xl border ${evalResult.granted ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-3">
              {evalResult.granted ? <CheckCircle2 size={24} className="text-green-600" /> : <AlertTriangle size={24} className="text-red-500" />}
              <div>
                <h3 className={`font-black text-sm ${evalResult.granted ? 'text-green-900' : 'text-red-900'}`}>
                  {evalResult.granted ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                </h3>
                <p className={`text-xs mt-0.5 ${evalResult.granted ? 'text-green-700' : 'text-red-700'}`}>
                  {evalResult.reason}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Modal */}
      <Modal isOpen={isCopyModalOpen} onClose={() => setIsCopyModalOpen(false)} title="Copy Role Permissions" maxWidth="420px">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Copy all permission module settings from another role to <span className="font-bold text-slate-800">{formatRole(selectedRole)}</span>.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Source Role</label>
            <select
              value={copySourceRole}
              onChange={e => setCopySourceRole(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
            >
              <option value="">-- Select Source Role --</option>
              {ALL_ROLES.filter(r => r !== selectedRole).map(r => <option key={r} value={r}>{formatRole(r)}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button onClick={() => setIsCopyModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">
              Cancel
            </button>
            <button onClick={handleCopyPermissions} disabled={!copySourceRole} className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50">
              Copy Permissions
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset Modal */}
      <Modal isOpen={isResetModalOpen} onClose={() => { setIsResetModalOpen(false); setAdminPassword(''); }} title="Protocol Reset Authorization" maxWidth="440px">
        <form onSubmit={handleReset} className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 leading-relaxed">
            <div className="font-bold text-red-900 mb-1">⚠️ CRITICAL RESET ACTION</div>
            This will overwrite all custom permissions for <span className="font-bold">{formatRole(selectedRole)}</span> with system default parameters.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm Admin Password</label>
            <input
              type="password"
              placeholder="Enter your password..."
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">
              Cancel
            </button>
            <button type="submit" disabled={resetting || !adminPassword} className="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50">
              {resetting ? 'Resetting...' : 'Reset to Defaults'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
