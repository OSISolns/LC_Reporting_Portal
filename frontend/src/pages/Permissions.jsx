import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Save, RefreshCw, CheckCircle2, AlertCircle, X, ChevronRight,
  Lock, Eye, EyeOff, Copy, Check, History, Search, Zap,
  ToggleLeft, ToggleRight, Info, LayoutDashboard, FileText, ReceiptText,
  AlertTriangle, Users, Brain, Award, Clock, PenTool, Stethoscope,
  MessageSquare, Activity, Building, ShieldAlert, TrendingDown, ShieldCheck,
  Server, Database, Sliders, UserCheck, CheckSquare, Square, RotateCcw,
  FlaskConical, Heart, Dumbbell, Settings, ScanLine, ArrowRight,
  Layers, Truck, Menu, UserPlus
} from 'lucide-react';
import {
  getModules, getRoleMatrix, updateRolePermissions, createRole,
  resetRolePermissions, getUserEffectivePermissions, setUserOverride,
} from '../api/permissions';
import { getReportSettings, updateReportSettings } from '../api/reports';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

// ─── Action Metadata ────────────────────────────────────────────────────────
const ACTION_META = {
  view:     { label: 'View',     onClass: 'bg-blue-500 text-white',    offClass: 'bg-slate-100 text-slate-300 hover:bg-blue-50 hover:text-blue-400',      headerClass: 'text-blue-700 bg-blue-50'     },
  create:   { label: 'Create',   onClass: 'bg-emerald-500 text-white', offClass: 'bg-slate-100 text-slate-300 hover:bg-emerald-50 hover:text-emerald-400', headerClass: 'text-emerald-700 bg-emerald-50' },
  edit:     { label: 'Edit',     onClass: 'bg-amber-500 text-white',   offClass: 'bg-slate-100 text-slate-300 hover:bg-amber-50 hover:text-amber-400',     headerClass: 'text-amber-700 bg-amber-50'   },
  review:   { label: 'Review',   onClass: 'bg-violet-500 text-white',  offClass: 'bg-slate-100 text-slate-300 hover:bg-violet-50 hover:text-violet-400',   headerClass: 'text-violet-700 bg-violet-50' },
  approve:  { label: 'Approve',  onClass: 'bg-teal-500 text-white',    offClass: 'bg-slate-100 text-slate-300 hover:bg-teal-50 hover:text-teal-400',       headerClass: 'text-teal-700 bg-teal-50'     },
  reject:   { label: 'Reject',   onClass: 'bg-red-500 text-white',     offClass: 'bg-slate-100 text-slate-300 hover:bg-red-50 hover:text-red-400',         headerClass: 'text-red-700 bg-red-50'       },
  delete:   { label: 'Delete',   onClass: 'bg-rose-600 text-white',    offClass: 'bg-slate-100 text-slate-300 hover:bg-rose-50 hover:text-rose-400',       headerClass: 'text-rose-700 bg-rose-50'     },
  download: { label: 'Download', onClass: 'bg-sky-500 text-white',     offClass: 'bg-slate-100 text-slate-300 hover:bg-sky-50 hover:text-sky-400',         headerClass: 'text-sky-700 bg-sky-50'       },
  acquire:  { label: 'Acquire',  onClass: 'bg-purple-500 text-white',  offClass: 'bg-slate-100 text-slate-300 hover:bg-purple-50 hover:text-purple-400',   headerClass: 'text-purple-700 bg-purple-50' },
  report:   { label: 'Report',   onClass: 'bg-indigo-500 text-white',  offClass: 'bg-slate-100 text-slate-300 hover:bg-indigo-50 hover:text-indigo-400',   headerClass: 'text-indigo-700 bg-indigo-50' },
  verify:   { label: 'Verify',   onClass: 'bg-cyan-500 text-white',    offClass: 'bg-slate-100 text-slate-300 hover:bg-cyan-50 hover:text-cyan-400',       headerClass: 'text-cyan-700 bg-cyan-50'     },
};
const ACTION_ORDER = ['view','create','edit','review','approve','reject','delete','download','acquire','report','verify'];

// ─── Role Groups — Matches ACTUAL DB roles exactly ──────────────────────────
const ROLE_GROUPS = [
  {
    name: 'Executive & Management',
    color: '#1C69A0',
    roles: ['admin', 'coo', 'deputy_coo', 'chairman', 'sales_manager', 'medical_director', 'it_officer', 'pa'],
  },
  {
    name: 'Clinical & Doctors',
    color: '#2563eb',
    roles: ['doctor', 'consultant', 'staff'],
  },
  {
    name: 'Nursing Department',
    color: '#db2777',
    roles: ['nurse', 'chef-nurse'],
  },
  {
    name: 'Diagnostics & Labs',
    color: '#4f46e5',
    roles: ['lab_team_lead', 'lab_lead', 'lab_manager', 'lab_tech', 'lab', 'imaging_tech', 'imaging_manager'],
  },
  {
    name: 'Specialized Clinics',
    color: '#059669',
    roles: ['dentist', 'dental_hod', 'dental_tech', 'dental_lab_manager', 'dental', 'physiotherapist', 'physio', 'physio_manager'],
  },
  {
    name: 'Operations & Support',
    color: '#b45309',
    roles: ['operations_staff', 'operations', 'cashier', 'principal_cashier', 'customer_care', 'stock-manager', 'procurement-manager'],
  },
  {
    name: 'Logistics & Facilities',
    color: '#0284c7',
    roles: ['logistics_manager', 'logistics_officer'],
  },
  {
    name: 'Quality & Accreditation',
    color: '#7c3aed',
    roles: ['quality_accreditation_officer', 'quality_manager', 'qm', 'hsfp'],
  },
];

const ALL_ROLES = ROLE_GROUPS.flatMap(g => g.roles);

// ─── Role Colors ─────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  admin: '#1C69A0', it_officer: '#2563eb', coo: '#0891b2', deputy_coo: '#0284c7',
  chairman: '#d97706', sales_manager: '#059669', cashier: '#0f766e',
  principal_cashier: '#0d9488', customer_care: '#1C69A0', lab_team_lead: '#4f46e5',
  lab_lead: '#4f46e5', lab_manager: '#4338ca', quality_manager: '#0d9488', qm: '#0d9488',
  consultant: '#1C69A0', operations_staff: '#b45309', operations: '#b45309',
  pa: '#1C69A0', staff: '#64748b', hsfp: '#dc2626', nurse: '#db2777',
  'chef-nurse': '#1C69A0', 'stock-manager': '#16a34a', doctor: '#2563eb',
  medical_director: '#be123c', 'procurement-manager': '#0d9488',
  imaging_tech: '#8b5cf6', imaging_manager: '#7c3aed',
  dental_hod: '#059669', dental_tech: '#10b981', dental_lab_manager: '#047857',
  dental: '#34d399', dentist: '#059669', physiotherapist: '#d97706',
  physio: '#d97706', physio_manager: '#b45309', lab_tech: '#6366f1', lab: '#818cf8',
  logistics_manager: '#0284c7', logistics_officer: '#0d9488',
  quality_accreditation_officer: '#7c3aed',
};

// ─── Module Groups — Fixed to include daily_stock and logistics ──────────────
const MODULE_GROUPS = {
  'Core System & Admin':      ['user_management', 'audit_logs', 'reports', 'ai_insights', 'it_support'],
  'Clinical & Patient Care':  ['clinical_observation', 'patients', 'incident_reports', 'feedbacks', 'staff_performance'],
  'Diagnostics & Speciality': ['lab', 'imaging', 'dental', 'physio', 'results_transfer'],
  'Operations & Logistics':   ['operations', 'shifts', 'inventory', 'daily_stock', 'procurement', 'logistics', 'cancellations', 'refunds'],
  'Quality & Governance':     ['safety', 'compliance', 'revenue_leakage'],
};

// ─── Sidebar Items ────────────────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { key: 'dashboard',         name: 'Dashboard',            Icon: LayoutDashboard, allowedRoles: ALL_ROLES },
  { key: 'cancellations',     name: 'Cancellations',        Icon: FileText,        allowedRoles: ['cashier','principal_cashier','customer_care','operations_staff','sales_manager','coo','chairman','admin','deputy_coo','consultant'] },
  { key: 'refunds',           name: 'Refunds',              Icon: ReceiptText,     allowedRoles: ['cashier','principal_cashier','customer_care','operations_staff','sales_manager','coo','chairman','admin','deputy_coo','consultant'] },
  { key: 'incidents',         name: 'Incident Reports',     Icon: AlertTriangle,   allowedRoles: ['nurse','admin','doctor','consultant','hsfp','operations_staff','customer_care','it_officer','chef-nurse','pa','stock-manager','coo','deputy_coo','medical_director','procurement-manager'] },
  { key: 'safety',            name: 'Safety Workspace',     Icon: PenTool,         allowedRoles: ['hsfp','admin','deputy_coo','medical_director','quality_accreditation_officer'] },
  { key: 'risk',              name: 'Risk Register',        Icon: ShieldAlert,     allowedRoles: ['hsfp','admin','deputy_coo','medical_director','quality_accreditation_officer'] },
  { key: 'infection',         name: 'Infection Control',    Icon: Activity,        allowedRoles: ['hsfp','admin','deputy_coo','medical_director','quality_accreditation_officer'] },
  { key: 'results',           name: 'Result Transfers',     Icon: RefreshCw,       allowedRoles: ['cashier','principal_cashier','customer_care','operations_staff','lab_team_lead','sales_manager','coo','chairman','admin','deputy_coo','consultant'] },
  { key: 'performance',       name: 'Staff Performance',    Icon: Award,           allowedRoles: ['sales_manager','coo','chairman','admin','deputy_coo','cashier','principal_cashier','customer_care','chef-nurse','medical_director'] },
  { key: 'nursing_hub',       name: 'Nursing Hub',          Icon: Stethoscope,     allowedRoles: ['nurse','admin','chef-nurse','coo','deputy_coo'] },
  { key: 'doctor_hub',        name: 'Doctor Hub',           Icon: Stethoscope,     allowedRoles: ['doctor','consultant','admin','medical_director','coo','deputy_coo'] },
  { key: 'imaging',           name: 'Imaging Hub',          Icon: ScanLine,        allowedRoles: ['imaging_tech','imaging_manager','admin','medical_director','coo','deputy_coo'] },
  { key: 'lab_hub',           name: 'Laboratory Hub',       Icon: FlaskConical,    allowedRoles: ['admin','deputy_coo','coo','lab_team_lead','lab_lead','lab_manager','lab_tech','lab'] },
  { key: 'dental_hub',        name: 'Dental Hub',           Icon: Heart,           allowedRoles: ['admin','deputy_coo','coo','dental','dentist','dental_tech','dental_hod','dental_lab_manager'] },
  { key: 'physio_hub',        name: 'Physio Hub',           Icon: Dumbbell,        allowedRoles: ['admin','deputy_coo','coo','physiotherapist','physio','physio_manager'] },
  { key: 'operations_hub',    name: 'Operations Hub',       Icon: Settings,        allowedRoles: ['admin','deputy_coo','operations_staff','operations','coo'] },
  { key: 'central_store',     name: 'General Store',        Icon: Database,        allowedRoles: ['admin','deputy_coo','coo','stock-manager'] },
  { key: 'master',            name: 'Master Module',        Icon: Database,        allowedRoles: ['admin','stock-manager','coo','deputy_coo'] },
  { key: 'procurement',       name: 'Procurement Hub',      Icon: Building,        allowedRoles: ['admin','procurement-manager','deputy_coo','coo'] },
  { key: 'supplier',          name: 'Supplier Portal',      Icon: Building,        allowedRoles: ['admin','procurement-manager','deputy_coo','coo'] },
  { key: 'logistics_hub',     name: 'Logistics Hub',        Icon: Truck,           allowedRoles: ['admin','logistics_manager','logistics_officer','deputy_coo','coo'] },
  { key: 'daily_report',      name: 'Daily Op. Report',     Icon: Activity,        allowedRoles: ['nurse','chef-nurse','admin','coo','deputy_coo'] },
  { key: 'daily_board',       name: 'Reports Board',        Icon: FileText,        allowedRoles: ['sales_manager','coo','chairman','admin','deputy_coo','principal_cashier','consultant','chef-nurse','pa','medical_director'] },
  { key: 'clinical_sheets',   name: 'Clinical Sheets',      Icon: FileText,        allowedRoles: ['nurse','admin','doctor','consultant','chef-nurse','medical_director','coo','deputy_coo'] },
  { key: 'insights',          name: 'AI Insights',          Icon: Brain,           allowedRoles: ['sales_manager','coo','chairman','admin','deputy_coo','principal_cashier','consultant','medical_director','quality_accreditation_officer'] },
  { key: 'revenue',           name: 'Revenue Tracker',      Icon: TrendingDown,    allowedRoles: ['sales_manager','chairman','admin','principal_cashier','deputy_coo'] },
  { key: 'compliance',        name: 'Compliance Portal',    Icon: ShieldCheck,     allowedRoles: ['admin','hsfp','quality_accreditation_officer','coo','deputy_coo'] },
  { key: 'it_hub',            name: 'IT Support',           Icon: Server,          allowedRoles: ALL_ROLES },
  { key: 'users',             name: 'User Management',      Icon: Users,           allowedRoles: ['admin','it_officer'] },
  { key: 'providers',         name: 'Provider Management',  Icon: UserCheck,       allowedRoles: ['admin','coo','deputy_coo','medical_director'] },
  { key: 'permissions',       name: 'Permissions',          Icon: Shield,          allowedRoles: ['admin'] },
  { key: 'audit_logs',        name: 'Audit Logs',           Icon: History,         allowedRoles: ['admin','quality_accreditation_officer'] },
  { key: 'shifts',            name: 'Shifts',               Icon: Clock,           allowedRoles: ['cashier','customer_care','nurse','principal_cashier','sales_manager','deputy_coo','coo','admin','operations_staff','chef-nurse','pa'] },
  { key: 'roster_generator',  name: 'Roster Generator',     Icon: FileText,        allowedRoles: ['admin','deputy_coo','coo','operations_staff','operations'] },
  { key: 'feedbacks',         name: 'Internal Feedback',    Icon: MessageSquare,   allowedRoles: ['coo','deputy_coo','chef-nurse','medical_director','quality_accreditation_officer'] },
];

// ─── Sidebar Config Persistence ───────────────────────────────────────────────
const SIDEBAR_CONFIG_KEY = 'lc_sidebar_config';
const loadSidebarConfig  = () => { try { return JSON.parse(localStorage.getItem(SIDEBAR_CONFIG_KEY) || '{}'); } catch { return {}; } };
const persistSidebarConfig = (cfg) => { localStorage.setItem(SIDEBAR_CONFIG_KEY, JSON.stringify(cfg)); window.dispatchEvent(new CustomEvent('sidebar-config-changed')); };

// ─── Helper ───────────────────────────────────────────────────────────────────
const ROLE_LABELS = {
  pa: "Chairman's Personal Assistant (PA)",
  hsfp: 'Health & Safety Focal Person (HSFP)',
  quality_accreditation_officer: 'Quality & Accreditation Manager',
  quality_manager: 'Quality Manager',
  qm: 'Quality Manager (QM)',
};

const fmt = (r) => {
  if (!r) return '';
  if (ROLE_LABELS[r]) return ROLE_LABELS[r];
  return r.replace(/_/g,  ' ').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const RoleBadge = ({ role, size = 'sm' }) => {
  const color = ROLE_COLORS[role] || '#64748b';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
      style={{ backgroundColor: `${color}18`, color, borderColor: `${color}35` }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {fmt(role)}
    </span>
  );
};

const PermCell = ({ checked, onChange, action, isDiff }) => {
  const meta = ACTION_META[action] || { onClass: 'bg-slate-500 text-white', offClass: 'bg-slate-100 text-slate-300 hover:bg-slate-200 hover:text-slate-500' };
  return (
    <button
      onClick={onChange}
      title={`${checked ? 'Granted' : 'Denied'} — click to toggle`}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 font-bold ${checked ? meta.onClass + ' shadow-sm' : meta.offClass} ${isDiff ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
    >
      {checked ? <Check size={13} strokeWidth={3} /> : <X size={11} strokeWidth={2.5} />}
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Permissions() {
  const [activeTab, setActiveTab] = useState('roles');

  // Matrix
  const [modules,      setModules]      = useState([]);
  const [roleMatrix,   setRoleMatrix]   = useState({});
  const [origMatrix,   setOrigMatrix]   = useState({});
  const [selectedRole, setSelectedRole] = useState('nurse');
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [hasChanges,   setHasChanges]   = useState(false);
  const [roleSearch,   setRoleSearch]   = useState('');
  const [moduleSearch, setModuleSearch] = useState('');
  const [selCategory,  setSelCategory]  = useState('All');
  const [expandedGrps, setExpandedGrps] = useState({});

  // Copy / Reset modals
  const [isCopyOpen,    setIsCopyOpen]    = useState(false);
  const [copySource,    setCopySource]    = useState('');
  const [isResetOpen,   setIsResetOpen]   = useState(false);
  const [adminPw,       setAdminPw]       = useState('');
  const [showAdminPw,   setShowAdminPw]   = useState(false);
  const [resetting,     setResetting]     = useState(false);

  // Sidebar Config
  const [sidebarCfg,     setSidebarCfg]     = useState(() => loadSidebarConfig());
  const [sidebarChanged, setSidebarChanged] = useState(false);
  const [sidebarGroup,   setSidebarGroup]   = useState(ROLE_GROUPS[0].name);

  // User Overrides
  const [usersList,         setUsersList]         = useState([]);
  const [selectedUser,      setSelectedUser]      = useState(null);
  const [userEffPerms,      setUserEffPerms]      = useState({});
  const [loadingUserPerms,  setLoadingUserPerms]  = useState(false);
  const [overrideReason,    setOverrideReason]    = useState('');
  const [userSearch,        setUserSearch]        = useState('');

  // Simulator
  const [evalRole,   setEvalRole]   = useState('nurse');
  const [evalModule, setEvalModule] = useState('');
  const [evalAction, setEvalAction] = useState('view');

  // Policies
  const [restrictPast,       setRestrictPast]       = useState(true);
  const [loadingSettings,    setLoadingSettings]    = useState(false);
  const [updatingSettings,   setUpdatingSettings]   = useState(false);

  // Role Studio / Custom Role Builder State
  const [newRoleTitle,     setNewRoleTitle]     = useState('');
  const [newRoleKey,       setNewRoleKey]       = useState('');
  const [newRoleGroup,     setNewRoleGroup]     = useState(ROLE_GROUPS[0].name);
  const [newRoleDesc,      setNewRoleDesc]      = useState('');
  const [newRoleColor,     setNewRoleColor]     = useState('#4f46e5');
  const [newRolePerms,     setNewRolePerms]     = useState({});
  const [creatingRole,     setCreatingRole]     = useState(false);

  const handleTitleChange = (val) => {
    setNewRoleTitle(val);
    const slug = val.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    setNewRoleKey(slug);
  };

  const applyPresetAllView = () => {
    const next = {};
    modules.forEach(m => { next[m.name] = { view: true }; });
    setNewRolePerms(next);
    toast.success('Applied preset: Read-Only (All View)');
  };

  const applyPresetFullAdmin = () => {
    const next = {};
    modules.forEach(m => {
      next[m.name] = {};
      m.actions.forEach(act => { next[m.name][act] = true; });
    });
    setNewRolePerms(next);
    toast.success('Applied preset: Full Administrative Access');
  };

  const applyPresetClinical = () => {
    const clinicalMods = ['clinical_observation', 'patients', 'incident_reports', 'feedbacks', 'lab', 'imaging', 'dental', 'physio'];
    const next = {};
    modules.forEach(m => {
      if (clinicalMods.includes(m.name)) {
        next[m.name] = {};
        m.actions.forEach(act => {
          if (['view', 'create', 'edit'].includes(act)) next[m.name][act] = true;
        });
      }
    });
    setNewRolePerms(next);
    toast.success('Applied preset: Clinical Staff Access');
  };

  const applyPresetClear = () => {
    setNewRolePerms({});
    toast.success('Cleared all role permissions');
  };

  const toggleNewRolePerm = (modName, action) => {
    setNewRolePerms(prev => {
      const modPerms = { ...(prev[modName] || {}) };
      modPerms[action] = !modPerms[action];
      return { ...prev, [modName]: modPerms };
    });
  };

  const toggleNewRoleModuleAll = (modName, actions) => {
    setNewRolePerms(prev => {
      const current = prev[modName] || {};
      const allEnabled = actions.every(act => !!current[act]);
      const nextMod = {};
      actions.forEach(act => { nextMod[act] = !allEnabled; });
      return { ...prev, [modName]: nextMod };
    });
  };

  const handleCreateRoleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!newRoleTitle.trim() || !newRoleKey.trim()) {
      toast.error('Please enter a display title and system key for the role.');
      return;
    }

    try {
      setCreatingRole(true);
      const res = await createRole({
        roleName: newRoleKey,
        displayName: newRoleTitle,
        department: newRoleGroup,
        description: newRoleDesc,
        permissions: newRolePerms,
      });

      if (res?.success) {
        toast.success(`Role '${newRoleTitle}' created successfully!`);

        ROLE_COLORS[newRoleKey] = newRoleColor;
        ROLE_LABELS[newRoleKey] = newRoleTitle;

        setSelectedRole(newRoleKey);
        setNewRoleTitle('');
        setNewRoleKey('');
        setNewRoleDesc('');
        setNewRolePerms({});

        await loadData();
        setActiveTab('roles');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create role');
    } finally {
      setCreatingRole(false);
    }
  };

  // ── Data loading ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [modResult, matrixResult, usersResult] = await Promise.all([
        getModules(),
        getRoleMatrix(),
        api.get('/users').catch(() => ({ data: { data: [] } })),
      ]);
      // Defensive unwrap: both API fns return response.data = {success, data: payload}
      // So result.data gives the actual payload.
      const modsRaw   = modResult?.data   ?? modResult   ?? [];
      const matrixRaw = matrixResult?.data ?? matrixResult ?? {};

      const mods = Array.isArray(modsRaw)                                      ? modsRaw : [];
      const mat  = (typeof matrixRaw === 'object' && !Array.isArray(matrixRaw)) ? matrixRaw : {};

      setModules(mods);
      setRoleMatrix(mat);
      setOrigMatrix(JSON.parse(JSON.stringify(mat)));
      setUsersList(usersResult.data?.data || usersResult.data || []);
      if (mods.length > 0) setEvalModule(prev => prev || mods[0].name);
      setExpandedGrps(Object.fromEntries(Object.keys(MODULE_GROUPS).map(k => [k, true])));
    } catch (err) {
      console.error('Permissions load error:', err);
      toast.error('Failed to load permission matrix');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSystemSettings = useCallback(async () => {
    try {
      setLoadingSettings(true);
      const res = await getReportSettings();
      if (res.data?.success) setRestrictPast(Boolean(res.data.data?.restrict_past_daily_reports));
    } catch { /* non-fatal */ } finally { setLoadingSettings(false); }
  }, []);

  useEffect(() => { loadData(); loadSystemSettings(); }, [loadData, loadSystemSettings]);

  // Load user effective permissions
  const loadUserPerms = useCallback(async (userId) => {
    if (!userId) return;
    try {
      setLoadingUserPerms(true);
      const result = await getUserEffectivePermissions(userId);
      setUserEffPerms(result?.data ?? result ?? {});
    } catch { toast.error('Failed to load user permissions'); }
    finally { setLoadingUserPerms(false); }
  }, []);

  useEffect(() => { if (selectedUser?.id) loadUserPerms(selectedUser.id); }, [selectedUser, loadUserPerms]);

  // ── Matrix handlers ───────────────────────────────────────────────────────
  const handleToggle = useCallback((moduleName, action) => {
    setRoleMatrix(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[selectedRole]) next[selectedRole] = {};
      if (!next[selectedRole][moduleName]) next[selectedRole][moduleName] = {};
      next[selectedRole][moduleName][action] = !next[selectedRole][moduleName][action];
      return next;
    });
    setHasChanges(true);
  }, [selectedRole]);

  const handleBulkGrant = useCallback(() => {
    setRoleMatrix(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[selectedRole]) next[selectedRole] = {};
      modules.forEach(m => { if (!next[selectedRole][m.name]) next[selectedRole][m.name] = {}; m.actions.forEach(a => { next[selectedRole][m.name][a] = true; }); });
      return next;
    });
    setHasChanges(true);
    toast.success(`All permissions granted for ${fmt(selectedRole)}`);
  }, [selectedRole, modules]);

  const handleBulkRevoke = useCallback(() => {
    setRoleMatrix(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[selectedRole]) next[selectedRole] = {};
      modules.forEach(m => { if (!next[selectedRole][m.name]) next[selectedRole][m.name] = {}; m.actions.forEach(a => { next[selectedRole][m.name][a] = false; }); });
      return next;
    });
    setHasChanges(true);
    toast.success(`All permissions revoked for ${fmt(selectedRole)}`);
  }, [selectedRole, modules]);

  const handleCopyFrom = useCallback(() => {
    if (!copySource) return;
    setRoleMatrix(prev => ({ ...prev, [selectedRole]: JSON.parse(JSON.stringify(prev[copySource] || {})) }));
    setHasChanges(true);
    setIsCopyOpen(false);
    toast.success(`Copied permissions from ${fmt(copySource)} → ${fmt(selectedRole)}`);
  }, [copySource, selectedRole]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      await updateRolePermissions(selectedRole, roleMatrix[selectedRole] || {});
      setOrigMatrix(JSON.parse(JSON.stringify(roleMatrix)));
      setHasChanges(false);
      toast.success(`Permissions for ${fmt(selectedRole)} saved!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save permissions');
    } finally { setSaving(false); }
  }, [roleMatrix, selectedRole]);

  const handleReset = useCallback(async (e) => {
    e.preventDefault();
    if (!adminPw) return toast.error('Admin password required');
    try {
      setResetting(true);
      await resetRolePermissions(selectedRole, adminPw);
      setIsResetOpen(false); setAdminPw('');
      await loadData();
      toast.success(`${fmt(selectedRole)} permissions reset to system defaults.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid admin password');
    } finally { setResetting(false); }
  }, [selectedRole, adminPw, loadData]);

  // ── Override handlers (FIXED — direct operations, no broken cycle) ────────
  const handleForceGrant = useCallback(async (moduleName, actionName) => {
    if (!selectedUser) return;
    try {
      await setUserOverride(selectedUser.id, moduleName, actionName, true, overrideReason || 'Admin: force grant');
      toast.success(`Force GRANTED: ${moduleName} → ${actionName}`);
      loadUserPerms(selectedUser.id);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to set override'); }
  }, [selectedUser, overrideReason, loadUserPerms]);

  const handleForceDeny = useCallback(async (moduleName, actionName) => {
    if (!selectedUser) return;
    try {
      await setUserOverride(selectedUser.id, moduleName, actionName, false, overrideReason || 'Admin: force deny');
      toast.success(`Force DENIED: ${moduleName} → ${actionName}`);
      loadUserPerms(selectedUser.id);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to set override'); }
  }, [selectedUser, overrideReason, loadUserPerms]);

  const handleRevert = useCallback(async (moduleName, actionName) => {
    if (!selectedUser) return;
    try {
      await setUserOverride(selectedUser.id, moduleName, actionName, null, 'Admin: reverted to role default');
      toast.success('Override removed — reverted to role default');
      loadUserPerms(selectedUser.id);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to revert override'); }
  }, [selectedUser, loadUserPerms]);

  // ── Sidebar Config ────────────────────────────────────────────────────────
  const handleSidebarToggle = useCallback((role, key) => {
    setSidebarCfg(prev => { const r = { ...(prev[role] || {}) }; r[key] = r[key] === false ? true : false; return { ...prev, [role]: r }; });
    setSidebarChanged(true);
  }, []);

  const saveSidebarCfg = useCallback(() => {
    persistSidebarConfig(sidebarCfg);
    setSidebarChanged(false);
    toast.success('Sidebar visibility config saved!');
  }, [sidebarCfg]);

  // ── Computed values ───────────────────────────────────────────────────────
  const filteredModules = useMemo(() =>
    modules.filter(m => {
      const q = moduleSearch.toLowerCase();
      const matchQ = !q || m.name.includes(q) || (m.display || '').toLowerCase().includes(q);
      return matchQ && (selCategory === 'All' || (MODULE_GROUPS[selCategory] || []).includes(m.name));
    }), [modules, moduleSearch, selCategory]);

  // Dynamic columns — only actions supported by ≥1 visible module
  const visibleActions = useMemo(() => {
    const s = new Set();
    filteredModules.forEach(m => m.actions.forEach(a => s.add(a)));
    return ACTION_ORDER.filter(a => s.has(a));
  }, [filteredModules]);

  // Modules grouped for accordion display
  const displayGroups = useMemo(() => {
    const g = {};
    filteredModules.forEach(m => {
      let grp = 'Other';
      for (const [name, names] of Object.entries(MODULE_GROUPS)) { if (names.includes(m.name)) { grp = name; break; } }
      if (!g[grp]) g[grp] = [];
      g[grp].push(m);
    });
    return g;
  }, [filteredModules]);

  // Unsaved diff count
  const diffCount = useMemo(() => {
    let n = 0;
    const cur = roleMatrix[selectedRole] || {};
    const org = origMatrix[selectedRole] || {};
    modules.forEach(m => m.actions.forEach(a => { if (!!cur[m.name]?.[a] !== !!org[m.name]?.[a]) n++; }));
    return n;
  }, [roleMatrix, origMatrix, selectedRole, modules]);

  // Per-role coverage (all roles, memoised)
  const allCoverage = useMemo(() => {
    if (!modules.length) return {};
    return Object.fromEntries(ALL_ROLES.map(r => {
      const rp = roleMatrix[r] || {};
      let tot = 0, grt = 0;
      modules.forEach(m => m.actions.forEach(a => { tot++; if (rp[m.name]?.[a]) grt++; }));
      return [r, { granted: grt, total: tot, pct: tot > 0 ? Math.round((grt / tot) * 100) : 0 }];
    }));
  }, [modules, roleMatrix]);

  const selCov = allCoverage[selectedRole] || { granted: 0, total: 0, pct: 0 };

  const filteredUsers = useMemo(() => {
    if (!userSearch) return usersList;
    const q = userSearch.toLowerCase();
    return usersList.filter(u => (u.full_name || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q));
  }, [usersList, userSearch]);

  const evalModObj   = useMemo(() => modules.find(m => m.name === evalModule), [modules, evalModule]);
  const evalModActs  = evalModObj?.actions || [];

  useEffect(() => {
    if (evalModActs.length > 0 && !evalModActs.includes(evalAction)) setEvalAction(evalModActs[0]);
  }, [evalModule, evalModActs, evalAction]);

  const evalResult = useMemo(() => {
    if (!evalModule) return { granted: false, reason: 'Select a module to evaluate.' };
    if (evalRole === 'admin') return { granted: true, reason: "Admin role has unconditional system bypass — all actions permanently granted." };
    const granted = !!(roleMatrix[evalRole]?.[evalModule]?.[evalAction]);
    return {
      granted,
      reason: granted
        ? `ACCESS GRANTED — '${fmt(evalRole)}' has '${ACTION_META[evalAction]?.label || evalAction}' on '${evalModule}'.`
        : `ACCESS DENIED — '${fmt(evalRole)}' does NOT have '${ACTION_META[evalAction]?.label || evalAction}' on '${evalModule}'.`,
    };
  }, [evalRole, evalModule, evalAction, roleMatrix]);

  const sidebarGroupRoles = useMemo(() => ROLE_GROUPS.find(g => g.name === sidebarGroup)?.roles || [], [sidebarGroup]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-36 gap-3">
      <LoadingSpinner />
      <p className="text-sm text-slate-400 font-medium animate-pulse">Loading permission matrix…</p>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-5 max-w-[1700px] mx-auto space-y-4">

      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-100 rounded-2xl px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 text-white flex-shrink-0">
            <Shield size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-black text-slate-800 tracking-tight">Access Control & Governance</h1>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">Production</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {modules.length} modules · {ALL_ROLES.length} roles · {usersList.length} staff accounts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('builder')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
          >
            <UserPlus size={14} /> + New Custom Role
          </button>
          {hasChanges && (
            <motion.button initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              Save Changes {diffCount > 0 && `(${diffCount})`}
            </motion.button>
          )}
          <button onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <RefreshCw size={14} /> Reload
          </button>
        </div>
      </div>

      {/* ── Tab Nav ── */}
      <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm overflow-x-auto">
        {[
          { id: 'roles',     label: 'Role Permissions', icon: Shield },
          { id: 'overrides', label: 'User Overrides',   icon: UserCheck },
          { id: 'builder',   label: 'Role Studio & Creator', icon: UserPlus, badge: 'New' },
          { id: 'sidebar',   label: 'Sidebar Config',   icon: Menu },
          { id: 'evaluator', label: 'Access Simulator', icon: Zap },
          { id: 'policies',  label: 'System Policies',  icon: Sliders },
        ].map(({ id, label, icon: Icon, badge }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <Icon size={14} />{label}
            {badge && (
              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider ${activeTab === id ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════ TAB 1: ROLE PERMISSIONS MATRIX ════════════════════ */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Left: Role Selector App Window */}
          <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl shadow-md flex flex-col overflow-hidden ring-1 ring-slate-900/5">
            {/* macOS / App Window Titlebar */}
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border-b border-slate-200/90 flex items-center justify-between flex-shrink-0 select-none">
              <div className="flex items-center gap-2">
                {/* Window action controls */}
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400/90 border border-rose-500/30 inline-block shadow-2xs" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90 border border-amber-500/30 inline-block shadow-2xs" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/90 border border-emerald-500/30 inline-block shadow-2xs" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 pl-1">
                  Roles Explorer
                </span>
              </div>
              <span className="text-[9px] font-black text-slate-500 bg-slate-200/70 border border-slate-300/60 px-2 py-0.5 rounded-md font-mono">
                {ALL_ROLES.length} ROLES
              </span>
            </div>

            {/* Search Input Bar */}
            <div className="px-3 pt-3 pb-2 flex-shrink-0 bg-slate-50/40 border-b border-slate-100">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter role list…"
                  value={roleSearch}
                  onChange={e => setRoleSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium shadow-2xs"
                />
              </div>
            </div>

            {/* Window Inset Viewport Container */}
            <div className="p-2 flex-1 flex flex-col bg-slate-100/50">
              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 max-h-[64vh] bg-white border border-slate-200/90 rounded-xl shadow-inner divide-y divide-slate-100">
                {ROLE_GROUPS.map((group) => {
                  const gRoles = group.roles.filter(r => !roleSearch || fmt(r).toLowerCase().includes(roleSearch.toLowerCase()) || r.toLowerCase().includes(roleSearch.toLowerCase()));
                  if (!gRoles.length) return null;
                  return (
                    <div key={group.name} className="py-1.5 first:pt-0 last:pb-0">
                      <div className="text-[9px] font-black uppercase tracking-widest px-2 py-1 text-slate-400 flex items-center justify-between">
                        <span style={{ color: group.color }}>{group.name}</span>
                        <span className="text-[8px] font-bold opacity-60">({gRoles.length})</span>
                      </div>
                      <div className="space-y-0.5 mt-0.5">
                        {gRoles.map(role => {
                          const sel  = selectedRole === role;
                          const cov  = allCoverage[role] || { granted: 0, total: 0, pct: 0 };
                          const clr  = ROLE_COLORS[role] || '#64748b';
                          return (
                            <button key={role}
                              onClick={() => {
                                if (hasChanges && !window.confirm('You have unsaved changes. Discard and switch role?')) return;
                                setSelectedRole(role); setHasChanges(false);
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all ${sel ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-slate-700 hover:bg-slate-50 font-semibold'}`}
                            >
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sel ? '#ffffff' : clr }} />
                              <span className="text-xs flex-1 truncate">{fmt(role)}</span>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <div className={`w-9 h-1.5 rounded-full overflow-hidden ${sel ? 'bg-blue-400/40' : 'bg-slate-100'}`}>
                                  <div className="h-full rounded-full transition-all"
                                    style={{ width: `${cov.pct}%`, backgroundColor: sel ? '#fff' : clr, opacity: sel ? 1 : 0.65 }}
                                  />
                                </div>
                                <span className={`text-[9px] font-mono font-black tabular-nums w-6 text-right ${sel ? 'text-blue-100' : 'text-slate-400'}`}>{cov.pct}%</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Window Status Bar Frame Separator */}
            <div className="px-3.5 py-2 bg-slate-100/90 border-t border-slate-200/90 flex items-center justify-between flex-shrink-0 select-none text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active: <span className="text-slate-700 font-extrabold">{fmt(selectedRole)}</span>
              </span>
              <span className="font-mono text-slate-400 text-[9px]">
                {selCov.pct}% Access
              </span>
            </div>
          </div>

          {/* Right: Matrix */}
          <div className="lg:col-span-9 space-y-4">
            {/* Controls */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-black text-slate-800">{fmt(selectedRole)}</h2>
                    <RoleBadge role={selectedRole} />
                    {diffCount > 0 && (
                      <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200">
                        {diffCount} unsaved change{diffCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{selCov.granted} of {selCov.total} permissions granted</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={handleBulkGrant} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"><CheckSquare size={12} /> Grant All</button>
                  <button onClick={handleBulkRevoke} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"><Square size={12} /> Revoke All</button>
                  <button onClick={() => setIsCopyOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors"><Copy size={12} /> Copy From…</button>
                  <button onClick={() => setIsResetOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"><RotateCcw size={12} /> Reset</button>
                </div>
              </div>
              {/* Coverage bar */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-blue-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${selCov.pct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
                </div>
                <span className="text-xs font-black text-slate-600 tabular-nums w-10 text-right">{selCov.pct}%</span>
              </div>
              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div className="flex flex-wrap gap-1">
                  {['All', ...Object.keys(MODULE_GROUPS)].map(cat => (
                    <button key={cat} onClick={() => setSelCategory(cat)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors whitespace-nowrap ${selCategory === cat ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >{cat === 'All' ? 'All Modules' : cat}</button>
                  ))}
                </div>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search module…" value={moduleSearch} onChange={e => setModuleSearch(e.target.value)}
                    className="pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 w-40"
                  />
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            {filteredModules.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-14 text-center">
                <Layers size={32} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">No modules found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or category</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[560px]">
                    <thead>
                      <tr className="bg-slate-50 border-b-2 border-slate-100">
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 sticky left-0 bg-slate-50 z-10 w-52">Module</th>
                        {visibleActions.map(act => {
                          const m = ACTION_META[act] || {};
                          return (
                            <th key={act} className="px-2 py-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${m.headerClass || 'text-slate-500 bg-slate-100'}`}>{m.label || act}</span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {Object.entries(displayGroups).map(([groupName, groupMods]) => {
                        const expanded = expandedGrps[groupName] !== false;
                        return (
                          <React.Fragment key={groupName}>
                            <tr className="bg-gradient-to-r from-slate-50 to-white border-y border-slate-100">
                              <td colSpan={visibleActions.length + 1} className="px-4 py-2">
                                <button onClick={() => setExpandedGrps(p => ({ ...p, [groupName]: !expanded }))} className="flex items-center gap-2 w-full">
                                  <ChevronRight size={13} className={`text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{groupName}</span>
                                  <span className="text-[10px] text-slate-300 ml-1">({groupMods.length})</span>
                                </button>
                              </td>
                            </tr>
                            {expanded && groupMods.map((m, idx) => {
                              const cur = roleMatrix[selectedRole]?.[m.name] || {};
                              const org = origMatrix[selectedRole]?.[m.name] || {};
                              return (
                                <tr key={m.name} className={`hover:bg-blue-50/20 transition-colors ${idx % 2 !== 0 ? 'bg-slate-50/30' : ''}`}>
                                  <td className="px-4 py-2.5 sticky left-0 bg-inherit z-10">
                                    <div className="font-bold text-slate-800 text-xs">{m.display || m.name}</div>
                                    <div className="text-[9px] text-slate-400 font-mono mt-0.5 truncate max-w-[11rem]">{m.name}</div>
                                  </td>
                                  {visibleActions.map(act => {
                                    if (!m.actions.includes(act)) return <td key={act} className="px-2 py-2.5 text-center"><span className="text-slate-200">·</span></td>;
                                    const checked = !!cur[act];
                                    const isDiff  = !!cur[act] !== !!org[act];
                                    return (
                                      <td key={act} className={`px-2 py-2.5 text-center ${isDiff ? 'bg-amber-50/50' : ''}`}>
                                        <div className="flex justify-center">
                                          <PermCell checked={checked} onChange={() => handleToggle(m.name, act)} action={act} isDiff={isDiff} />
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 2: USER OVERRIDES ════════════════════ */}
      {activeTab === 'overrides' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* User list */}
          <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Staff</span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{usersList.length}</span>
            </div>
            <div className="px-3 pt-3 pb-2 flex-shrink-0">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search by name or role…" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 transition-colors"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5 max-h-[68vh]">
              {filteredUsers.map(u => {
                const sel = selectedUser?.id === u.id;
                const name = u.full_name || u.fullName || u.username || '?';
                return (
                  <button key={u.id} onClick={() => setSelectedUser(u)}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left border transition-all ${sel ? 'bg-blue-50 border-blue-300 shadow-sm' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${sel ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-bold truncate ${sel ? 'text-blue-900' : 'text-slate-700'}`}>{name}</div>
                      <RoleBadge role={u.role} />
                    </div>
                  </button>
                );
              })}
              {filteredUsers.length === 0 && <p className="text-xs text-slate-400 text-center py-8">No staff found</p>}
            </div>
          </div>

          {/* Override panel */}
          <div className="lg:col-span-9 space-y-4">
            {!selectedUser ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center">
                <UserCheck size={40} className="text-slate-200 mx-auto mb-4" />
                <h3 className="text-sm font-bold text-slate-600">No Staff Member Selected</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Select a staff member to view their effective permissions and configure individual overrides.</p>
              </div>
            ) : (
              <>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-base font-black flex-shrink-0">
                        {(selectedUser.full_name || selectedUser.username || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-slate-800">{selectedUser.full_name || selectedUser.username}</span>
                          <RoleBadge role={selectedUser.role} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">User #{selectedUser.id} — overrides take precedence over role defaults</p>
                      </div>
                    </div>
                    <button onClick={() => loadUserPerms(selectedUser.id)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"><RefreshCw size={14} className="text-slate-500" /></button>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Justification:</label>
                    <input type="text" placeholder="e.g. Approved by COO for temporary access…" value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-400 transition-colors"
                    />
                  </div>
                  <div className="flex items-start gap-2 text-[10px] bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    <Info size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-500"><span className="font-bold text-amber-700">Override rules:</span> Force Grant = always allowed regardless of role. Force Deny = always blocked. Revert = returns to role default. All actions are audit-logged.</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  {loadingUserPerms ? (
                    <div className="flex items-center justify-center py-16"><LoadingSpinner /></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[680px]">
                        <thead>
                          <tr className="bg-slate-50 border-b-2 border-slate-100">
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Module / Action</th>
                            <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">Role Default</th>
                            <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">Effective</th>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">Override Controls</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {modules.map(m => m.actions.map((act, ai) => {
                            const userMod = userEffPerms[m.name] || {};
                            const item = userMod[act] || { granted: false, source: 'role' };
                            const isOverride = item.source === 'override';
                            const actMeta = ACTION_META[act] || {};
                            return (
                              <tr key={`${m.name}-${act}`} className={`transition-colors ${isOverride ? 'bg-amber-50/40' : 'hover:bg-slate-50/40'}`}>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    {ai === 0 ? (
                                      <div>
                                        <div className="font-bold text-slate-800">{m.display || m.name}</div>
                                        <div className="text-[9px] text-slate-400 font-mono">{m.name}</div>
                                      </div>
                                    ) : <span className="text-slate-200 ml-3">└</span>}
                                    <span className={`ml-auto inline-block px-1.5 py-0.5 rounded text-[10px] font-black ${actMeta.headerClass || 'bg-slate-100 text-slate-500'}`}>{actMeta.label || act}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${item.source === 'role' ? (item.granted ? 'text-emerald-600' : 'text-slate-400') : 'text-slate-300'}`}>
                                    {item.source === 'role' ? (item.granted ? <><Check size={10} strokeWidth={3} /> Granted</> : <><X size={10} strokeWidth={3} /> Denied</>) : '—'}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${item.granted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                    {item.granted ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
                                    {item.granted ? 'Granted' : 'Denied'}
                                    {isOverride && <span className="text-amber-500 ml-0.5">★</span>}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button onClick={() => handleForceGrant(m.name, act)} className="px-2 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">Force Grant</button>
                                    <button onClick={() => handleForceDeny(m.name, act)}  className="px-2 py-1 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors">Force Deny</button>
                                    {isOverride && <button onClick={() => handleRevert(m.name, act)} className="px-2 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors">Revert</button>}
                                  </div>
                                </td>
                              </tr>
                            );
                          }))}
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

      {/* ════════════════════ TAB 3: SIDEBAR CONFIG ════════════════════ */}
      {activeTab === 'sidebar' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-black text-slate-800">Sidebar Navigation Visibility</h2>
              <p className="text-xs text-slate-400 mt-0.5">Control which navigation links appear for each role. Saved to localStorage and broadcast live.</p>
            </div>
            {sidebarChanged && (
              <button onClick={saveSidebarCfg} className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-md flex-shrink-0">
                <Save size={14} /> Save Config
              </button>
            )}
          </div>

          {/* Role group filter tabs */}
          <div className="bg-white border border-slate-100 rounded-2xl p-2 shadow-sm flex items-center gap-1 overflow-x-auto">
            {ROLE_GROUPS.map(g => (
              <button key={g.name} onClick={() => setSidebarGroup(g.name)}
                className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${sidebarGroup === g.name ? 'text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                style={sidebarGroup === g.name ? { backgroundColor: g.color } : {}}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sidebarGroup === g.name ? '#ffffff80' : g.color }} />
                {g.name}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${sidebarGroup === g.name ? 'bg-white/20' : 'bg-slate-100'}`}>{g.roles.length}</span>
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-100">
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 sticky left-0 bg-slate-50 z-10 w-52">Navigation Item</th>
                    {sidebarGroupRoles.map(r => <th key={r} className="px-3 py-3 text-center min-w-[110px]"><RoleBadge role={r} /></th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {SIDEBAR_ITEMS.map((item, idx) => (
                    <tr key={item.key} className={`hover:bg-slate-50/50 transition-colors ${idx % 2 !== 0 ? 'bg-slate-50/20' : ''}`}>
                      <td className="px-4 py-2.5 sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-2">
                          {item.Icon && <item.Icon size={13} className="text-slate-400 flex-shrink-0" />}
                          <span className="font-semibold text-slate-700 text-xs">{item.name}</span>
                        </div>
                      </td>
                      {sidebarGroupRoles.map(role => {
                        const allowed  = item.allowedRoles.includes(role);
                        const hidden   = (sidebarCfg[role] || {})[item.key] === false;
                        const visible  = allowed && !hidden;
                        return (
                          <td key={role} className="px-3 py-2.5 text-center">
                            {allowed ? (
                              <button onClick={() => handleSidebarToggle(role, item.key)}
                                className={`w-7 h-7 rounded-lg font-black transition-all inline-flex items-center justify-center ${visible ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                              >
                                {visible ? <Check size={12} strokeWidth={3} /> : <X size={11} strokeWidth={2.5} />}
                              </button>
                            ) : <span className="text-slate-200">·</span>}
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

      {/* ════════════════════ TAB 4: ACCESS SIMULATOR ════════════════════ */}
      {activeTab === 'evaluator' && (
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0">
                <Zap size={20} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800">Permission Evaluation Simulator</h2>
                <p className="text-xs text-slate-400 mt-0.5">Real-time access rule testing for any role + module + action combination.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Role</label>
                <select value={evalRole} onChange={e => setEvalRole(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
                >
                  {ROLE_GROUPS.map(g => (
                    <optgroup key={g.name} label={g.name}>
                      {g.roles.map(r => <option key={r} value={r}>{fmt(r)}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Module</label>
                <select value={evalModule} onChange={e => setEvalModule(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
                >
                  {Object.entries(MODULE_GROUPS).map(([gName, mNames]) => (
                    <optgroup key={gName} label={gName}>
                      {mNames.map(mn => { const mod = modules.find(m => m.name === mn); return mod ? <option key={mn} value={mn}>{mod.display || mn}</option> : null; })}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Action</label>
                <select value={evalAction} onChange={e => setEvalAction(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
                >
                  {(evalModActs.length > 0 ? evalModActs : ACTION_ORDER).map(a => (
                    <option key={a} value={a}>{ACTION_META[a]?.label || a}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Result card */}
            <div className={`mt-5 p-5 rounded-2xl border-2 transition-all ${evalResult.granted ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${evalResult.granted ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {evalResult.granted ? <CheckCircle2 size={24} className="text-emerald-600" /> : <AlertCircle size={24} className="text-red-500" />}
                </div>
                <div>
                  <h3 className={`font-black text-sm tracking-tight ${evalResult.granted ? 'text-emerald-900' : 'text-red-900'}`}>
                    {evalResult.granted ? '✓ ACCESS GRANTED' : '✗ ACCESS DENIED'}
                  </h3>
                  <p className={`text-xs mt-1 leading-relaxed ${evalResult.granted ? 'text-emerald-700' : 'text-red-700'}`}>{evalResult.reason}</p>
                  {evalRole !== 'admin' && evalModule && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-slate-400">Path:</span>
                      <span className="text-xs font-bold" style={{ color: ROLE_COLORS[evalRole] || '#64748b' }}>{fmt(evalRole)}</span>
                      <ArrowRight size={11} className="text-slate-300" />
                      <span className="text-xs font-mono text-slate-500">{evalModule}</span>
                      <ArrowRight size={11} className="text-slate-300" />
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${ACTION_META[evalAction]?.headerClass || 'bg-slate-100 text-slate-500'}`}>{ACTION_META[evalAction]?.label || evalAction}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Full module scan */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Full Module Access Scan — {fmt(evalRole)}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
              {modules.map(m => {
                const rp = roleMatrix[evalRole] || {};
                const granted = evalRole === 'admin' ? m.actions : m.actions.filter(a => rp[m.name]?.[a]);
                return (
                  <div key={m.name} className={`p-2.5 rounded-xl border ${granted.length > 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/30 border-red-100'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-700 truncate">{m.display || m.name}</span>
                      <span className={`text-[9px] font-black ${granted.length > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{granted.length}/{m.actions.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {m.actions.map(a => {
                        const g = evalRole === 'admin' || !!rp[m.name]?.[a];
                        const am = ACTION_META[a] || {};
                        return <span key={a} className={`text-[8px] font-black px-1.5 py-0.5 rounded ${g ? am.headerClass || 'bg-slate-100 text-slate-500' : 'bg-slate-100 text-slate-300 line-through'}`}>{am.label || a}</span>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 5: SYSTEM POLICIES ════════════════════ */}
      {activeTab === 'policies' && (
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0">
                <Sliders size={20} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800">System Governance & Policy Controls</h2>
                <p className="text-xs text-slate-400 mt-0.5">Operational security restrictions and global system behaviour settings.</p>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              {/* Policy: Past report lock */}
              <div className={`p-4 rounded-2xl border-2 transition-all ${restrictPast ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-slate-50/30'}`}>
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Lock size={14} className={restrictPast ? 'text-amber-600' : 'text-slate-400'} />
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Past Daily Report Lock</h3>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${restrictPast ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-500'}`}>
                        {restrictPast ? '🔒 Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-lg">
                      When <strong>enabled</strong>, non-admin users are blocked from modifying daily operational report entries for past dates. Admins retain full edit access at all times. Prevents retroactive data manipulation.
                    </p>
                  </div>
                  <button type="button"
                    onClick={async () => {
                      try {
                        setUpdatingSettings(true);
                        const next = !restrictPast;
                        const res = await updateReportSettings({ restrict_past_daily_reports: next });
                        if (res.data?.success) { setRestrictPast(next); toast.success(next ? 'Past report lock enabled.' : 'Past report lock disabled.'); }
                      } catch { toast.error('Failed to update policy.'); }
                      finally { setUpdatingSettings(false); }
                    }}
                    disabled={loadingSettings || updatingSettings}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wide transition-all flex-shrink-0 shadow-sm disabled:opacity-50 ${restrictPast ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                  >
                    {updatingSettings ? <RefreshCw size={14} className="animate-spin" /> : restrictPast ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    {restrictPast ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Policy: Permission cache */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/30">
                <div className="flex items-start gap-3">
                  <Server size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">Permission Cache TTL</h3>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 uppercase">System Default</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Effective user permissions are cached server-side for <strong className="text-slate-700">5 minutes</strong> to reduce DB load. Role matrix changes apply after cache expiry; individual user override changes clear instantly from cache.
                    </p>
                  </div>
                </div>
              </div>

              {/* Policy: Admin bypass */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/30">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">Admin Role Bypass</h3>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 uppercase">Always Active</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      The <strong className="text-slate-700">admin</strong> role unconditionally bypasses all permission checks on all modules and actions. This is a hardcoded security primitive and cannot be modified via the matrix or user overrides.
                    </p>
                  </div>
                </div>
              </div>

              {/* Policy: Audit logging */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/30">
                <div className="flex items-start gap-3">
                  <History size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">Permission Change Audit Logging</h3>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">Always On</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Every role permission update, user override grant/deny/revert, and permissions reset is automatically written to the audit log with the acting user's identity, timestamp, and changed values. This cannot be disabled.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 6: ROLE STUDIO & CREATOR ════════════════════ */}
      {activeTab === 'builder' && (
        <div className="max-w-5xl mx-auto space-y-5">
          {/* Banner Card */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-indigo-300 border border-white/10 shadow-inner flex-shrink-0">
                <UserPlus size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black tracking-tight text-white">Role Architect & Custom Module Studio</h2>
                  <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-400/30 uppercase tracking-wider">Module Creator</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Design a brand new organizational role, assign target module permissions, and deploy it across the access control matrix and User Management portal.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateRoleSubmit} className="space-y-5">
            {/* Role Details Card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Layers size={16} className="text-indigo-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">1. Role Identity & Metadata</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Role Display Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Triage & Emergency Intake Nurse"
                    value={newRoleTitle}
                    onChange={e => handleTitleChange(e.target.value)}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    System Role Key (Identifier) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. triage_intake_nurse"
                    value={newRoleKey}
                    onChange={e => setNewRoleKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    className="w-full text-xs font-mono font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-indigo-700 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department / Organizational Group</label>
                  <select
                    value={newRoleGroup}
                    onChange={e => setNewRoleGroup(e.target.value)}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                  >
                    {ROLE_GROUPS.map(g => (
                      <option key={g.name} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Badge Accent Color</label>
                  <div className="flex items-center gap-2 pt-1">
                    {['#4f46e5', '#059669', '#db2777', '#b45309', '#0284c7', '#7c3aed', '#dc2626', '#16a34a', '#2563eb'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewRoleColor(c)}
                        className={`w-7 h-7 rounded-lg transition-transform ${newRoleColor === c ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500' : 'hover:scale-110 opacity-70'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role Description & Operational Scope</label>
                  <textarea
                    rows={2}
                    placeholder="Brief summary of duties, access rules, and department responsibilities for this role..."
                    value={newRoleDesc}
                    onChange={e => setNewRoleDesc(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Module Permissions Assignment Card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-indigo-600" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">2. Module Capability & Permission Assignment</h3>
                </div>

                {/* Preset Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={applyPresetAllView}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    ⚡ View All
                  </button>
                  <button
                    type="button"
                    onClick={applyPresetClinical}
                    className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    🩺 Clinical Pack
                  </button>
                  <button
                    type="button"
                    onClick={applyPresetFullAdmin}
                    className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    🛡️ Full Admin
                  </button>
                  <button
                    type="button"
                    onClick={applyPresetClear}
                    className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    🧹 Clear All
                  </button>
                </div>
              </div>

              {/* Module Groups Assignment */}
              <div className="space-y-5 pt-2">
                {Object.entries(MODULE_GROUPS).map(([grpName, grpModules]) => {
                  const filteredMods = modules.filter(m => grpModules.includes(m.name));
                  if (filteredMods.length === 0) return null;

                  return (
                    <div key={grpName} className="space-y-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700">{grpName}</h4>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {filteredMods.map(m => {
                          const currentModPerms = newRolePerms[m.name] || {};
                          const allGranted = m.actions.every(act => !!currentModPerms[act]);

                          return (
                            <div key={m.name} className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-all shadow-2xs">
                              <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-extrabold text-slate-800">{m.display}</span>
                                  <span className="text-[10px] font-mono text-slate-400">({m.name})</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => toggleNewRoleModuleAll(m.name, m.actions)}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors ${allGranted ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                                >
                                  {allGranted ? 'Deselect Module' : 'Select All Actions'}
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {m.actions.map(act => {
                                  const isGranted = !!currentModPerms[act];
                                  const meta = ACTION_META[act] || { label: act, onClass: 'bg-indigo-500 text-white', offClass: 'bg-slate-100 text-slate-400' };

                                  return (
                                    <button
                                      key={act}
                                      type="button"
                                      onClick={() => toggleNewRolePerm(m.name, act)}
                                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 ${isGranted ? meta.onClass + ' shadow-2xs' : meta.offClass}`}
                                    >
                                      {isGranted ? <Check size={11} /> : <X size={11} />}
                                      {meta.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button Bar */}
            <div className="flex items-center justify-between gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <div className="text-xs text-slate-500">
                Target Role: <strong className="text-slate-800 font-bold">{newRoleTitle || 'Untitled Role'}</strong> <span className="font-mono text-indigo-600">({newRoleKey || 'role_key'})</span>
              </div>

              <button
                type="submit"
                disabled={creatingRole || !newRoleTitle.trim() || !newRoleKey.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md disabled:opacity-50 transition-all"
              >
                {creatingRole ? <RefreshCw size={16} className="animate-spin" /> : <UserPlus size={16} />}
                {creatingRole ? 'Deploying Role…' : 'Create & Deploy Role'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Copy Modal ── */}
      <Modal isOpen={isCopyOpen} onClose={() => setIsCopyOpen(false)} title="Copy Role Permissions" maxWidth="440px">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Copy all permission settings from a source role into <strong className="text-slate-800">{fmt(selectedRole)}</strong>. Existing permissions will be replaced.</p>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Source Role</label>
            <select value={copySource} onChange={e => setCopySource(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
            >
              <option value="">-- Select Source Role --</option>
              {ROLE_GROUPS.map(g => (
                <optgroup key={g.name} label={g.name}>
                  {g.roles.filter(r => r !== selectedRole).map(r => <option key={r} value={r}>{fmt(r)}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setIsCopyOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
            <button onClick={handleCopyFrom} disabled={!copySource} className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50">Copy Permissions</button>
          </div>
        </div>
      </Modal>

      {/* ── Reset Modal ── */}
      <Modal isOpen={isResetOpen} onClose={() => { setIsResetOpen(false); setAdminPw(''); }} title="Protocol Reset Authorization" maxWidth="460px">
        <form onSubmit={handleReset} className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="font-black text-red-900 text-xs mb-1.5">⚠️ CRITICAL RESET ACTION</div>
            <p className="text-xs text-red-700 leading-relaxed">
              This permanently overwrites all custom permissions for <strong>{fmt(selectedRole)}</strong> with system defaults. This action is audit-logged and irreversible.
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm Admin Password</label>
            <div className="relative">
              <input type={showAdminPw ? 'text' : 'password'} placeholder="Enter administrator password…" value={adminPw} onChange={e => setAdminPw(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-red-400 pr-10"
              />
              <button type="button" onClick={() => setShowAdminPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showAdminPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setIsResetOpen(false); setAdminPw(''); }} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
            <button type="submit" disabled={resetting || !adminPw} className="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50">
              {resetting ? 'Resetting…' : 'Reset to Defaults'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
