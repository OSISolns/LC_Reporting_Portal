import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ClipboardList,
  ArrowLeftRight,
  Package,
  CheckSquare,
  Settings2,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Flag,
  Users,
  Activity,
  TrendingUp,
  Calendar,
  Search,
  Filter,
  Save,
  Send,
  Plus,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Zap,
  Shield,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  getOperationsSummary,
  getTodayTaskLog,
  getAllTaskLogs,
  saveTaskLog,
  updateTaskLog,
  deleteTaskLog,
} from '../../api/operations';
import ConsumablesLog from '../ConsumablesLog';
import ResultTransferList from '../results-transfer/ResultTransferList';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => (n === undefined || n === null ? '—' : Number(n).toLocaleString());

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

const MANAGEMENT_ROLES = ['admin', 'coo', 'deputy_coo'];

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const cfg = {
    open:      { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500',   label: 'Open' },
    draft:     { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500',  label: 'Draft' },
    closed:    { bg: 'bg-slate-50',  text: 'text-slate-600',  border: 'border-slate-200',  dot: 'bg-slate-400',  label: 'Closed' },
    reviewed:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500',  label: 'Reviewed' },
    submitted: { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500',  label: 'Submitted' },
    pending:   { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400', label: 'Pending' },
    approved:  { bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',dot: 'bg-emerald-500',label: 'Approved' },
    rejected:  { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500',    label: 'Rejected' },
  }[status?.toLowerCase()] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400', label: status };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color = 'blue', onClick }) {
  const colors = {
    blue:    { ring: 'ring-blue-100',    bg: 'bg-blue-50',    icon: 'text-blue-600',    val: 'text-blue-700' },
    green:   { ring: 'ring-green-100',   bg: 'bg-green-50',   icon: 'text-green-600',   val: 'text-green-700' },
    amber:   { ring: 'ring-amber-100',   bg: 'bg-amber-50',   icon: 'text-amber-600',   val: 'text-amber-700' },
    red:     { ring: 'ring-red-100',     bg: 'bg-red-50',     icon: 'text-red-600',     val: 'text-red-700' },
    slate:   { ring: 'ring-slate-100',   bg: 'bg-slate-50',   icon: 'text-slate-500',   val: 'text-slate-700' },
    purple:  { ring: 'ring-purple-100',  bg: 'bg-purple-50',  icon: 'text-purple-600',  val: 'text-purple-700' },
  };
  const c = colors[color] || colors.blue;

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
      onClick={onClick}
      className={`bg-white border border-slate-100 rounded-2xl p-5 ring-1 ${c.ring} ${onClick ? 'cursor-pointer' : ''} transition-all`}
    >
      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
        <span className={c.icon}>{icon}</span>
      </div>
      <div className={`text-2xl font-black ${c.val} mb-0.5`}>{value}</div>
      <div className="text-sm font-semibold text-slate-700">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — OVERVIEW DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function OverviewDashboard({ onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await getOperationsSummary();
      setSummary(res.data.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load operations summary';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const taskPct = summary?.taskLogs?.totalTasks > 0
    ? Math.round((summary.taskLogs.doneTasks / summary.taskLogs.totalTasks) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">Operations Overview</h2>
          <p className="text-sm text-slate-400 mt-0.5">{today}</p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : errorMsg ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
          <AlertTriangle size={32} className="text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-red-800">Could Not Load Operations Summary</h3>
          <p className="text-sm text-red-600 max-w-md mx-auto">{errorMsg}</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-sm"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard
              icon={<Activity size={20} />}
              label="Total Shifts Today"
              value={fmt(summary?.shifts?.total)}
              color="blue"
              onClick={() => onNavigate('shifts')}
            />
            <KpiCard
              icon={<Clock size={20} />}
              label="Open Shifts"
              value={fmt(summary?.shifts?.open)}
              color="amber"
              onClick={() => onNavigate('shifts')}
            />
            <KpiCard
              icon={<CheckCircle2 size={20} />}
              label="Closed Shifts"
              value={fmt(summary?.shifts?.closed)}
              color="green"
              onClick={() => onNavigate('shifts')}
            />
            <KpiCard
              icon={<Flag size={20} />}
              label="Flagged Shifts"
              value={fmt(summary?.shifts?.flagged)}
              color={summary?.shifts?.flagged > 0 ? 'red' : 'slate'}
              onClick={() => onNavigate('shifts')}
            />
            <KpiCard
              icon={<ArrowLeftRight size={20} />}
              label="Pending Transfers"
              value={fmt(summary?.pendingTransfers)}
              color={summary?.pendingTransfers > 0 ? 'amber' : 'slate'}
              onClick={() => onNavigate('transfers')}
            />
            <KpiCard
              icon={<CheckSquare size={20} />}
              label="Task Completion"
              value={`${taskPct}%`}
              sub={`${summary?.taskLogs?.doneTasks || 0} / ${summary?.taskLogs?.totalTasks || 0} tasks`}
              color={taskPct >= 80 ? 'green' : taskPct >= 40 ? 'amber' : 'red'}
              onClick={() => onNavigate('tasks')}
            />
          </div>

          {/* Pending Actions */}
          {(summary?.pendingCancellations > 0 || summary?.pendingRefunds > 0 || summary?.pendingTransfers > 0) && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-orange-500" />
                <span className="text-sm font-bold text-orange-700">Pending Actions Required</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {summary.pendingCancellations > 0 && (
                  <div className="bg-white border border-orange-200 rounded-xl px-4 py-2 text-sm">
                    <span className="font-black text-orange-700">{summary.pendingCancellations}</span>
                    <span className="text-slate-600 ml-1.5">Cancellation{summary.pendingCancellations !== 1 ? 's' : ''} pending</span>
                  </div>
                )}
                {summary.pendingRefunds > 0 && (
                  <div className="bg-white border border-orange-200 rounded-xl px-4 py-2 text-sm">
                    <span className="font-black text-orange-700">{summary.pendingRefunds}</span>
                    <span className="text-slate-600 ml-1.5">Refund{summary.pendingRefunds !== 1 ? 's' : ''} pending</span>
                  </div>
                )}
                {summary.pendingTransfers > 0 && (
                  <div className="bg-white border border-orange-200 rounded-xl px-4 py-2 text-sm">
                    <span className="font-black text-orange-700">{summary.pendingTransfers}</span>
                    <span className="text-slate-600 ml-1.5">Result transfer{summary.pendingTransfers !== 1 ? 's' : ''} pending</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { tab: 'shifts',    icon: <Activity size={22} className="text-blue-500" />,   title: 'Shift Review Board', desc: 'Monitor and review today\'s operational shifts across all roles.' },
              { tab: 'transfers', icon: <ArrowLeftRight size={22} className="text-purple-500" />, title: 'Result Transfers', desc: 'Manage and review lab result transfer requisitions.' },
              { tab: 'tasks',     icon: <CheckSquare size={22} className="text-green-500" />, title: 'Facility Task Log', desc: 'Log and track daily facility inspection and operational tasks.' },
              { tab: 'consumables', icon: <Package size={22} className="text-amber-500" />, title: 'Consumables Log', desc: 'Track department consumables usage and stock distribution.' },
            ].map(({ tab, icon, title, desc }) => (
              <motion.button
                key={tab}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate(tab)}
                className="text-left bg-white border border-slate-100 rounded-2xl p-5 hover:border-slate-300 transition-all shadow-sm group"
              >
                <div className="mb-3">{icon}</div>
                <h3 className="font-black text-slate-800 text-sm mb-1">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{desc}</p>
                <div className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:gap-2 transition-all">
                  Open <ArrowRight size={12} />
                </div>
              </motion.button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — SHIFT REVIEW BOARD
// ═══════════════════════════════════════════════════════════════════════════════
const SHIFT_ROLE_LABELS = {
  cashier:      'Cashier',
  helpdesk:     'Helpdesk',
  call_center:  'Call Center',
  nurse:        'Nurse',
  vip_lounge:   'VIP Lounge',
};

function ShiftReviewBoard() {
  const { hasPermission } = useAuth();
  const canReview = hasPermission('shifts', 'review');

  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', role: '', employee_name: '' });
  const [reviewingId, setReviewingId] = useState(null);

  // Default to today
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState(todayStr);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = { date_from: dateFilter, date_to: dateFilter, limit: 200 };
      if (filters.status)  params.status = filters.status;
      if (filters.role)    params.role   = filters.role;
      if (filters.employee_name) params.employee_name = filters.employee_name;
      const res = await api.get('/shifts', { params });
      setShifts(res.data.data?.shifts || res.data.data || []);
    } catch {
      toast.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, filters]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (id) => {
    try {
      setReviewingId(id);
      await api.patch(`/shifts/${id}/review`);
      toast.success('Shift marked as reviewed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to review shift');
    } finally {
      setReviewingId(null);
    }
  };

  // Stats
  const stats = {
    total:    shifts.length,
    open:     shifts.filter(s => s.status === 'open').length,
    closed:   shifts.filter(s => s.status === 'closed').length,
    reviewed: shifts.filter(s => s.status === 'reviewed').length,
    flagged:  shifts.filter(s => s.flagged == 1).length,
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
          <Calendar size={15} className="text-slate-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="text-sm font-medium text-slate-700 outline-none bg-transparent"
          />
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff..."
            value={filters.employee_name}
            onChange={e => setFilters(f => ({ ...f, employee_name: e.target.value }))}
            className="pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:border-blue-400 w-48"
          />
        </div>
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="draft">Draft</option>
          <option value="closed">Closed</option>
          <option value="reviewed">Reviewed</option>
        </select>
        <select
          value={filters.role}
          onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}
          className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none"
        >
          <option value="">All Roles</option>
          {Object.entries(SHIFT_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total', val: stats.total,    color: 'blue' },
          { label: 'Open',  val: stats.open,     color: 'amber' },
          { label: 'Closed',val: stats.closed,   color: 'slate' },
          { label: 'Reviewed', val: stats.reviewed, color: 'green' },
          { label: 'Flagged',  val: stats.flagged,  color: stats.flagged > 0 ? 'red' : 'slate' },
        ].map(({ label, val, color }) => {
          const colorMap = {
            blue: 'bg-blue-50 text-blue-700 border-blue-100',
            amber: 'bg-amber-50 text-amber-700 border-amber-100',
            slate: 'bg-slate-50 text-slate-600 border-slate-100',
            green: 'bg-green-50 text-green-700 border-green-100',
            red: 'bg-red-50 text-red-700 border-red-100',
          }[color];
          return (
            <div key={label} className={`rounded-2xl border p-3 text-center ${colorMap}`}>
              <div className="text-xl font-black">{val}</div>
              <div className="text-xs font-semibold mt-0.5 opacity-70">{label}</div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-blue-500" size={28} />
          </div>
        ) : shifts.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Activity size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-sm">No shifts found for this date/filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Employee</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Wave</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Opened</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Closed</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Status</th>
                  {canReview && <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Action</th>}
                </tr>
              </thead>
              <tbody>
                {shifts.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${s.flagged == 1 ? 'bg-red-50/30' : ''}`}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        {s.flagged == 1 && <Flag size={12} className="text-red-500 shrink-0" />}
                        {s.employee_name || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{SHIFT_ROLE_LABELS[s.shift_role] || s.shift_role}</td>
                    <td className="px-4 py-3 text-slate-500">{s.wave || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtTime(s.opened_at)}</td>
                    <td className="px-4 py-3 text-slate-500">{s.closed_at ? fmtTime(s.closed_at) : '—'}</td>
                    <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                    {canReview && (
                      <td className="px-4 py-3 text-right">
                        {s.status === 'closed' && (
                          <button
                            onClick={() => handleReview(s.id)}
                            disabled={reviewingId === s.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            {reviewingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                            Mark Reviewed
                          </button>
                        )}
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 5 — FACILITY TASK LOG
// ═══════════════════════════════════════════════════════════════════════════════
const TASK_CATEGORIES = ['Inspection', 'Cleaning', 'Maintenance', 'Safety', 'Administration', 'Inventory'];

const CATEGORY_COLORS = {
  Inspection:     { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  Cleaning:       { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200' },
  Maintenance:    { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  Safety:         { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
  Administration: { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
  Inventory:      { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200' },
};

function CategoryPill({ category }) {
  const c = CATEGORY_COLORS[category] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
  return (
    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
      {category}
    </span>
  );
}

function FacilityTaskLog() {
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission('operations', 'create');
  const canDelete = hasPermission('operations', 'delete');
  const isManagement = MANAGEMENT_ROLES.includes(user?.role);

  const [view, setView] = useState('today'); // 'today' | 'history'
  const [todayLog, setTodayLog] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedNotes, setExpandedNotes] = useState({});

  const loadToday = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getTodayTaskLog();
      setTodayLog(res.data.data);
    } catch {
      toast.error('Failed to load today\'s task log');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAllTaskLogs({ date_from: dateFrom || undefined, date_to: dateTo || undefined });
      setHistoryLogs(res.data.data);
    } catch {
      toast.error('Failed to load task log history');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (view === 'today') loadToday();
    else loadHistory();
  }, [view, loadToday, loadHistory]);

  const toggleTask = (taskId) => {
    setTodayLog(prev => ({
      ...prev,
      tasks_json: prev.tasks_json.map(t =>
        t.id === taskId ? { ...t, done: !t.done } : t
      ),
    }));
  };

  const setTaskNote = (taskId, notes) => {
    setTodayLog(prev => ({
      ...prev,
      tasks_json: prev.tasks_json.map(t =>
        t.id === taskId ? { ...t, notes } : t
      ),
    }));
  };

  const handleSave = async (status = 'draft') => {
    if (!canCreate) return;
    try {
      setSaving(true);
      const payload = {
        tasks_json: todayLog.tasks_json,
        general_notes: todayLog.general_notes || '',
        status,
      };
      let res;
      if (todayLog.id) {
        res = await updateTaskLog(todayLog.id, payload);
      } else {
        res = await saveTaskLog(payload);
      }
      setTodayLog(res.data.data);
      toast.success(status === 'submitted' ? 'Task log submitted!' : 'Draft saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save task log');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task log? This action cannot be undone.')) return;
    try {
      await deleteTaskLog(id);
      toast.success('Log deleted');
      loadHistory();
    } catch {
      toast.error('Failed to delete log');
    }
  };

  const doneCount  = todayLog?.tasks_json?.filter(t => t.done).length || 0;
  const totalCount = todayLog?.tasks_json?.length || 0;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Group by category
  const tasksByCategory = {};
  (todayLog?.tasks_json || []).forEach(t => {
    if (!tasksByCategory[t.category]) tasksByCategory[t.category] = [];
    tasksByCategory[t.category].push(t);
  });

  const today = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setView('today')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            view === 'today' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Today's Log
        </button>
        <button
          onClick={() => setView('history')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            view === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          History
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      ) : view === 'today' && todayLog ? (
        <>
          {/* Header */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-base">Facility Operations Checklist</h3>
                <p className="text-sm text-slate-400 mt-0.5">{today}</p>
              </div>
              <StatusPill status={todayLog.status || 'draft'} />
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">{doneCount} of {totalCount} tasks completed</span>
                <span className={`text-xs font-black ${pct >= 80 ? 'text-green-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                />
              </div>
            </div>
          </div>

          {/* Task cards by category */}
          {TASK_CATEGORIES.filter(cat => tasksByCategory[cat]?.length > 0).map(category => {
            const catTasks = tasksByCategory[category];
            const catDone = catTasks.filter(t => t.done).length;
            const catColor = CATEGORY_COLORS[category];

            return (
              <div key={category} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className={`px-5 py-3 border-b ${catColor.border} ${catColor.bg} flex items-center justify-between`}>
                  <CategoryPill category={category} />
                  <span className={`text-xs font-black ${catColor.text}`}>{catDone}/{catTasks.length}</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {catTasks.map(task => (
                    <div key={task.id} className={`px-5 py-4 transition-colors ${task.done ? 'bg-green-50/30' : ''}`}>
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => canCreate && todayLog.status !== 'submitted' && toggleTask(task.id)}
                          disabled={!canCreate || todayLog.status === 'submitted'}
                          className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 transition-all ${
                            task.done
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-slate-300 hover:border-green-400'
                          } ${(!canCreate || todayLog.status === 'submitted') ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          {task.done && <CheckCircle2 size={12} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-semibold ${task.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                            {task.label}
                          </span>
                          {canCreate && todayLog.status !== 'submitted' && (
                            <input
                              type="text"
                              placeholder="Add a note (optional)..."
                              value={task.notes || ''}
                              onChange={e => setTaskNote(task.id, e.target.value)}
                              className="mt-2 w-full text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 outline-none focus:border-blue-300 placeholder-slate-300"
                            />
                          )}
                          {todayLog.status === 'submitted' && task.notes && (
                            <p className="text-xs text-slate-400 mt-1 italic">{task.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* General notes */}
          {canCreate && todayLog.status !== 'submitted' && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <label className="block text-sm font-bold text-slate-700 mb-2">General Notes / Observations</label>
              <textarea
                value={todayLog.general_notes || ''}
                onChange={e => setTodayLog(prev => ({ ...prev, general_notes: e.target.value }))}
                rows={4}
                placeholder="Describe any observations, issues encountered, or follow-up actions needed..."
                className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-blue-300 resize-none"
              />
            </div>
          )}
          {todayLog.status === 'submitted' && todayLog.general_notes && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-700 mb-2">General Notes</h4>
              <p className="text-sm text-slate-500 leading-relaxed">{todayLog.general_notes}</p>
            </div>
          )}

          {/* Action buttons */}
          {canCreate && todayLog.status !== 'submitted' && (
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Save Draft
              </button>
              <button
                onClick={() => handleSave('submitted')}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Submit Log
              </button>
            </div>
          )}
          {todayLog.status === 'submitted' && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-700">Today's log has been submitted</p>
                <p className="text-xs text-green-600 mt-0.5">This log is now finalized and visible to management.</p>
              </div>
            </div>
          )}
        </>
      ) : view === 'history' ? (
        <>
          {/* History filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
              <Calendar size={14} className="text-slate-400" />
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-sm outline-none bg-transparent text-slate-700" />
              <span className="text-slate-300">→</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-sm outline-none bg-transparent text-slate-700" />
            </div>
            <button
              onClick={loadHistory}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {historyLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-white border border-slate-100 rounded-2xl">
              <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-sm">No task logs found for the selected period</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyLogs.map(log => {
                const tasks = log.tasks_json || [];
                const done = tasks.filter(t => t.done).length;
                const total = tasks.length;
                const logPct = total > 0 ? Math.round((done / total) * 100) : 0;
                const isExpanded = expandedHistory === log.id;

                return (
                  <div key={log.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <button
                      onClick={() => setExpandedHistory(isExpanded ? null : log.id)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{fmtDate(log.log_date)}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{log.author_name || log.created_by_name || 'Operations Staff'}</div>
                        </div>
                        <div className="hidden sm:flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${logPct >= 80 ? 'bg-green-500' : logPct >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${logPct}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-500">{done}/{total}</span>
                        </div>
                        <StatusPill status={log.status} />
                      </div>
                      <div className="flex items-center gap-2">
                        {canDelete && (
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(log.id); }}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-slate-50 px-5 py-4 space-y-3">
                            {TASK_CATEGORIES.map(cat => {
                              const catTasks = tasks.filter(t => t.category === cat);
                              if (catTasks.length === 0) return null;
                              return (
                                <div key={cat}>
                                  <CategoryPill category={cat} />
                                  <div className="mt-2 space-y-1.5">
                                    {catTasks.map(t => (
                                      <div key={t.id} className="flex items-start gap-2 text-xs">
                                        <span className={`mt-0.5 w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${t.done ? 'bg-green-500 text-white' : 'border border-slate-300'}`}>
                                          {t.done && <CheckCircle2 size={9} />}
                                        </span>
                                        <span className={`${t.done ? 'line-through text-slate-400' : 'text-slate-600'}`}>{t.label}</span>
                                        {t.notes && <span className="text-slate-400 italic">— {t.notes}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                            {log.general_notes && (
                              <div className="pt-2 border-t border-slate-50">
                                <p className="text-xs font-bold text-slate-500 mb-1">General Notes</p>
                                <p className="text-xs text-slate-500 leading-relaxed">{log.general_notes}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN — OPERATIONS HUB
// ═══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'dashboard',   label: 'Overview',         icon: LayoutDashboard,  managementOnly: true  },
  { id: 'shifts',      label: 'Shift Review',      icon: Activity,         managementOnly: false },
  { id: 'transfers',   label: 'Result Transfers',  icon: ArrowLeftRight,   managementOnly: false },
  { id: 'consumables', label: 'Consumables Log',   icon: Package,          managementOnly: false },
  { id: 'tasks',       label: 'Facility Tasks',    icon: CheckSquare,      managementOnly: false },
];

export default function OperationsHub() {
  const { user } = useAuth();
  const isManagement = MANAGEMENT_ROLES.includes(user?.role);

  // Management sees dashboard first, ops staff sees shift review first
  const [activeTab, setActiveTab] = useState(isManagement ? 'dashboard' : 'shifts');

  const visibleTabs = TABS.filter(t => !t.managementOnly || isManagement);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
            <Settings2 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">
              <span className="text-blue-600">CORE</span> Operations Hub
            </h1>
            <p className="text-xs text-slate-400">Facility logistics, shift oversight, and daily operational control</p>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex items-center gap-0.5 border-b border-slate-200 mb-7 overflow-x-auto pb-px">
        {visibleTabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-all whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content with animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'dashboard'   && <OverviewDashboard onNavigate={setActiveTab} />}
          {activeTab === 'shifts'      && <ShiftReviewBoard />}
          {activeTab === 'transfers'   && <ResultTransferList />}
          {activeTab === 'consumables' && <ConsumablesLog />}
          {activeTab === 'tasks'       && <FacilityTaskLog />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
