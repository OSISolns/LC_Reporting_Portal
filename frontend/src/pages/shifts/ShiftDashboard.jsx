import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { 
  getAllShifts, 
  markShiftReviewed, 
  reactivateShift,
  bulkReviewShifts,
  triggerAutoClose,
  deleteShift,
  exportShiftsExcel
} from '../../api/shifts';
import {
  Users, Clock, Filter, Calendar, Search, Flag, CheckCircle2,
  Eye, RefreshCcw, X, ChevronLeft, ChevronRight, Briefcase,
  PhoneCall, AlertTriangle, ShieldCheck, History, TrendingUp,
  FileText, Zap, MoreHorizontal, ChevronDown, SlidersHorizontal,
  ArrowUpDown, Download, Timer, Lock, Unlock, Play, LayoutDashboard,
  CheckSquare, Square, Trash2, Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../../components/ui/table';
import {
  Badge, Button, Input, Select, Label, Separator, Skeleton, Card,
  CardHeader, CardContent, CardTitle, CardDescription,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '../../components/ui/index.jsx';

// ── Wave Configurations ──────────────────────────────────────────────────────
function getWaveConfig(shift) {
  if (!shift) return null;
  if (!shift.wave && !shift.start_hour) return null;
  
  if (shift.wave === 'Wave 1' || shift.start_hour === '07:00') {
    return { schedule: "07:00 AM - 03:00 PM", duration: 8, startHourStr: "07:00" };
  } else if (shift.wave === 'Wave 2' || shift.start_hour === '08:00') {
    return { schedule: "08:00 AM - 04:00 PM", duration: 8, startHourStr: "08:00" };
  } else if (shift.wave === 'Wave 4' || shift.start_hour === '09:00') {
    return { schedule: "09:00 AM - 05:00 PM", duration: 8, startHourStr: "09:00" };
  } else if (shift.wave === 'Wave 3' || shift.start_hour === '15:00') {
    return { schedule: "03:00 PM - 09:00 PM", duration: 6, startHourStr: "15:00" };
  }
  return null;
}

function getWaveStartTime(shift) {
  if (!shift?.opened_at) return null;
  const openedDate = new Date(shift.opened_at);
  const cfg = getWaveConfig(shift);
  if (!cfg) return openedDate;
  const [hStr, mStr] = cfg.startHourStr.split(':');
  
  const startTime = new Date(openedDate);
  startTime.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
  return startTime;
}

// ── Constants ─────────────────────────────────────────────────────────────
const ROLE_META = {
  cashier:     { label: 'Billing / Cashier',  color: 'success', dot: 'bg-emerald-500' },
  helpdesk:    { label: 'Helpdesk Support',   color: 'blue',    dot: 'bg-blue-500'    },
  call_center: { label: 'Call Center',        color: 'default', dot: 'bg-[#1b669d]'   },
};

const STATUS_META = {
  open:   { label: 'Live',       variant: 'success',   pulse: true  },
  draft:  { label: 'In Progress', variant: 'warning',   pulse: false },
  closed: { label: 'Sealed',     variant: 'secondary', pulse: false },
};

const SUMMARY_STATS = (shifts) => [
  {
    label: 'Total Records',
    value: shifts.length,
    icon:  <FileText size={18} />,
    color: 'text-[#1b669d]',
    bg:    'bg-[#1b669d]/10',
  },
  {
    label: 'Live Sessions',
    value: shifts.filter(s => s.status === 'open').length,
    icon:  <Zap size={18} />,
    color: 'text-emerald-600',
    bg:    'bg-emerald-50',
  },
  {
    label: 'Flagged',
    value: shifts.filter(s => s.is_flagged).length,
    icon:  <Flag size={18} />,
    color: 'text-rose-600',
    bg:    'bg-rose-50',
  },
  {
    label: 'Pending Review',
    value: shifts.filter(s => s.status === 'closed' && !s.reviewed_at).length,
    icon:  <AlertTriangle size={18} />,
    color: 'text-amber-600',
    bg:    'bg-amber-50',
  },
];

// ── Skeleton row ──────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <TableRow className="hover:bg-transparent">
      {[180, 120, 140, 90, 110, 130, 48].map((w, i) => (
        <TableCell key={i}>
          <Skeleton className={`h-4 w-[${w}px]`} />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function ShiftDashboard() {
  const { user } = useAuth();
  const isSupervisor = ['admin', 'deputy_coo'].includes(user?.role);
  const isPrincipalCashier = user?.role === 'principal_cashier';

  const [shifts, setShifts] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 25 });
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingShift, setEditingShift] = useState(null);
  const [filters, setFilters] = useState({
    role: '', status: '', date_from: '', date_to: '', employee_name: '', flagged: ''
  });
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState(0);

  // Custom modal states to replace blocking window.prompt / window.confirm
  const [bulkReviewOpen, setBulkReviewOpen] = useState(false);
  const [bulkReviewPassword, setBulkReviewPassword] = useState('');
  
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [reactivateId, setReactivateId] = useState(null);
  const [reactivatePassword, setReactivatePassword] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Count active filters for badge
  useEffect(() => {
    setActiveFilters(Object.values(filters).filter(Boolean).length);
  }, [filters]);

  const fetchShifts = useCallback((page = 1) => {
    setLoading(true);
    const params = { ...filters, page, limit: 25 };
    Object.keys(params).forEach(k => !params[k] && delete params[k]);
    getAllShifts(params)
      .then(res => {
        setShifts(res.data.data);
        setMeta(res.data.meta);
      })
      .catch(() => toast.error('Failed to synchronise shift logs'))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchShifts(); }, []);

  const handleFilter = (e) => {
    e?.preventDefault();
    fetchShifts(1);
  };

  const handleExportLogs = async () => {
    setExporting(true);
    const toastId = toast.loading('Generating Shift Logs Excel Extract...');
    try {
      const params = { ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      
      const res = await exportShiftsExcel(params);
      
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      let filename = 'Shift_Logs';
      if (filters.date_from || filters.date_to) {
        filename += `_Extract_${filters.date_from || 'Start'}_to_${filters.date_to || 'End'}`;
      } else {
        filename += `_${new Date().toISOString().split('T')[0]}`;
      }
      
      link.setAttribute('download', `${filename}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Shift logs successfully extracted!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to extract shift logs. Please try again.', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const handleReview = async (id) => {
    setReviewing(id);
    const tid = toast.loading('Recording official review…');
    try {
      await markShiftReviewed(id);
      setShifts(prev => prev.map(s =>
        s.id === id ? { ...s, reviewed_at: new Date().toISOString() } : s
      ));
      toast.success('Shift verified & signed off', { id: tid });
    } catch {
      toast.error('Verification failed', { id: tid });
    } finally {
      setReviewing(null);
    }
  };

  const handleReactivateSubmit = async (e) => {
    e?.preventDefault();
    if (!reactivateId) return;
    if (!reactivatePassword) {
      toast.error('Password is required');
      return;
    }
    
    const id = reactivateId;
    const password = reactivatePassword;
    
    setReactivateOpen(false);
    setReactivateId(null);
    setReactivatePassword('');

    const tid = toast.loading('Reactivating shift session…');
    try {
      await reactivateShift(id, password);
      setShifts(prev => prev.map(s =>
        s.id === id ? { ...s, status: 'open', closed_at: null, reviewed_at: null } : s
      ));
      toast.success('Shift reactivated successfully', { id: tid });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reactivation failed', { id: tid });
    }
  };

  const handleBulkReviewSubmit = async (e) => {
    e?.preventDefault();
    if (selectedIds.length === 0) return;
    if (!bulkReviewPassword) {
      toast.error('Password is required');
      return;
    }

    const password = bulkReviewPassword;
    setBulkReviewOpen(false);
    setBulkReviewPassword('');

    const tid = toast.loading(`Signing off ${selectedIds.length} shifts…`);
    try {
      await bulkReviewShifts(selectedIds, password);
      setShifts(prev => prev.map(s => 
        selectedIds.includes(s.id) ? { ...s, reviewed_at: new Date().toISOString(), reviewed_by_name: user.fullName } : s
      ));
      setSelectedIds([]);
      toast.success('Bulk verification complete', { id: tid });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk verification failed', { id: tid });
    }
  };

  const handleTriggerAutoClose = async () => {
    const tid = toast.loading('Running global policy audit…');
    try {
      const res = await triggerAutoClose();
      toast.success(res.data.message, { id: tid });
      fetchShifts(meta.page);
    } catch {
      toast.error('Policy audit failed', { id: tid });
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === shifts.length && shifts.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(shifts.map(s => s.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleUpdateShift = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      handover_notes: formData.get('handover_notes'),
      is_flagged: formData.get('is_flagged') === 'on'
    };

    const tid = toast.loading('Updating shift records…');
    try {
      await updateShiftByAdmin(editingShift.id, payload);
      setShifts(prev => prev.map(s => 
        s.id === editingShift.id ? { ...s, ...payload } : s
      ));
      setEditingShift(null);
      toast.success('Shift record updated', { id: tid });
    } catch {
      toast.error('Failed to update record', { id: tid });
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteId) return;
    
    const id = deleteId;
    setDeleteOpen(false);
    setDeleteId(null);
    
    const tid = toast.loading('Purging record from database…');
    try {
      await deleteShift(id);
      setShifts(prev => prev.filter(s => s.id !== id));
      toast.success('Record purged successfully', { id: tid });
    } catch {
      toast.error('Purge failed', { id: tid });
    }
  };

  const clearFilters = () => {
    const empty = { role: '', status: '', date_from: '', date_to: '', employee_name: '', flagged: '' };
    setFilters(empty);
    setTimeout(() => fetchShifts(1), 50);
  };

  const totalPages = Math.ceil(meta.total / meta.limit);

  return (
    <div className="min-h-screen bg-slate-50/50 px-4 py-8 space-y-8">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1b669d] to-[#0f4c75] flex items-center justify-center text-white shadow-xl shadow-[#1b669d]/25 shrink-0">
            <History size={26} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              Shift Log
            </h1>
            <p className="text-slate-400 text-sm font-semibold mt-1">
              Operational audit &amp; compliance dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSupervisor && (
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl mr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTriggerAutoClose}
                className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-[#1b669d] hover:bg-white"
              >
                <Zap size={13} className="mr-1.5 text-amber-500" />
                Audit Policy
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(p => !p)}
            className={showFilters ? 'border-[#1b669d] text-[#1b669d] bg-[#1b669d]/5' : ''}
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeFilters > 0 && (
              <span className="ml-1 w-4 h-4 rounded-full bg-[#1b669d] text-white text-[9px] flex items-center justify-center font-black">
                {activeFilters}
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportLogs}
            disabled={exporting}
            className="hover:border-[#1b669d] hover:text-[#1b669d] transition-all"
          >
            {exporting ? (
              <RefreshCcw size={15} className="animate-spin mr-1.5" />
            ) : (
              <Download size={15} className="mr-1.5" />
            )}
            Extract Logs
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchShifts(meta.page)}
            title="Refresh"
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>

          <Separator orientation="vertical" className="h-8 hidden lg:block" />

          <div className="hidden lg:flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">
              Total Records
            </span>
            <span className="text-2xl font-black text-slate-900 leading-none tracking-tight">
              {meta.total.toLocaleString()}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Summary Stats ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {SUMMARY_STATS(shifts).map((stat, i) => (
          <Card key={i} className="p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 leading-none">{stat.value}</p>
              <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {stat.label}
              </p>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* ── Filter Panel ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            key="filters"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Filter size={15} className="text-slate-400" />
                  <span className="text-sm font-black text-slate-700 uppercase tracking-widest">
                    Filter Criteria
                  </span>
                </div>
                {activeFilters > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                    <X size={13} /> Clear all
                  </Button>
                )}
              </div>

              <form onSubmit={handleFilter} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
                <div className="xl:col-span-2">
                  <Label>Search Personnel</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                    <Input
                      type="text"
                      placeholder="Full name…"
                      value={filters.employee_name}
                      onChange={e => setFilters(p => ({ ...p, employee_name: e.target.value }))}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <Label>Shift Role</Label>
                  <Select
                    value={filters.role}
                    onChange={e => setFilters(p => ({ ...p, role: e.target.value }))}
                  >
                    <option value="">All Roles</option>
                    <option value="cashier">Cashier / Billing</option>
                    <option value="helpdesk">Helpdesk</option>
                    <option value="call_center">Call Center</option>
                  </Select>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select
                    value={filters.status}
                    onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                  >
                    <option value="">All Statuses</option>
                    <option value="open">Live</option>
                    <option value="draft">In Progress</option>
                    <option value="closed">Sealed</option>
                  </Select>
                </div>

                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={filters.date_from}
                    onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={filters.date_to}
                    onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))}
                  />
                </div>

                <div className="flex gap-2 xl:col-span-full mt-1">
                  <Button type="submit" className="flex-1 lg:flex-none lg:px-10">
                    <Search size={14} /> Apply Filters
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExportLogs}
                    disabled={exporting}
                    className="flex-1 lg:flex-none lg:px-10 hover:border-[#1b669d] hover:text-[#1b669d] transition-all"
                  >
                    {exporting ? (
                      <RefreshCcw size={14} className="animate-spin mr-1.5" />
                    ) : (
                      <Download size={14} className="mr-1.5" />
                    )}
                    Extract Logs
                  </Button>
                  {activeFilters > 0 && (
                    <Button type="button" variant="secondary" onClick={clearFilters}>
                      <X size={14} /> Reset
                    </Button>
                  )}
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Data Table ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
      >
        <Card className="overflow-hidden">

          {/* Table toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b-2 border-slate-100 h-16 transition-all">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-slate-700">Session Records</span>
              {!loading && (
                <Badge variant="secondary">
                  {shifts.length} shown
                </Badge>
              )}
            </div>

            <AnimatePresence>
              {selectedIds.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-xs font-black text-[#1b669d] mr-2">
                    {selectedIds.length} Selected
                  </span>
                  <Button
                    size="sm"
                    onClick={() => { setBulkReviewPassword(''); setBulkReviewOpen(true); }}
                    className="h-8 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700"
                  >
                    <ShieldCheck size={12} className="mr-1.5" />
                    Bulk Sign Off
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds([])}
                    className="h-8 text-[10px] font-black uppercase tracking-widest text-slate-400"
                  >
                    Cancel
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b-2 border-slate-100">
                {!isPrincipalCashier && (
                  <TableHead className="w-[48px] px-6 py-4">
                    <div 
                      onClick={toggleSelectAll}
                      className="w-5 h-5 rounded-md border-2 border-slate-200 flex items-center justify-center cursor-pointer hover:border-[#1b669d] transition-colors"
                    >
                      {selectedIds.length === shifts.length && shifts.length > 0 ? (
                        <CheckSquare size={14} className="text-[#1b669d]" />
                      ) : selectedIds.length > 0 ? (
                        <div className="w-2 h-0.5 bg-[#1b669d]" />
                      ) : (
                        <Square size={14} className="text-slate-200" />
                      )}
                    </div>
                  </TableHead>
                )}
                <TableHead className="px-6 py-4 text-[0.65rem] font-black text-slate-400 uppercase tracking-[0.15em] w-[220px]">
                  <div className="flex items-center gap-2">
                    <Users size={13} /> Personnel
                  </div>
                </TableHead>
                <TableHead className="px-6 py-4 text-[0.65rem] font-black text-slate-400 uppercase tracking-[0.15em]">
                  <div className="flex items-center gap-2">
                    <Briefcase size={13} /> Role
                  </div>
                </TableHead>
                <TableHead className="px-6 py-4 text-[0.65rem] font-black text-slate-400 uppercase tracking-[0.15em]">
                  <div className="flex items-center gap-2">
                    <Clock size={13} /> Session Timeline
                  </div>
                </TableHead>
                <TableHead className="px-6 py-4 text-[0.65rem] font-black text-slate-400 uppercase tracking-[0.15em]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={13} /> Status
                  </div>
                </TableHead>
                <TableHead className="px-6 py-4 text-[0.65rem] font-black text-slate-400 uppercase tracking-[0.15em]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={13} /> Flags
                  </div>
                </TableHead>
                <TableHead className="px-6 py-4 text-[0.65rem] font-black text-slate-400 uppercase tracking-[0.15em]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} /> Review
                  </div>
                </TableHead>
                <TableHead className="px-6 py-4 w-[64px]" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : shifts.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7}>
                    <div className="py-24 flex flex-col items-center justify-center gap-4 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
                        <History size={28} />
                      </div>
                      <div>
                        <p className="text-base font-black text-slate-700">No records found</p>
                        <p className="text-sm text-slate-400 font-medium mt-1">
                          Try adjusting your filters or date range
                        </p>
                      </div>
                      {activeFilters > 0 && (
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          <X size={13} /> Clear filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map((s, idx) => {
                  const roleMeta   = ROLE_META[s.shift_role]   || {};
                  const statusMeta = STATUS_META[s.status]     || {};
                  const isLive     = s.status === 'open';
                  const isSealed   = s.status === 'closed';

                  return (
                    <motion.tr
                      key={s.id}
                      component={TableRow}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.025 }}
                      className={`group border-b border-slate-100 transition-colors ${
                        s.is_flagged
                          ? 'bg-rose-50/30 hover:bg-rose-50/60'
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Selection */}
                      {!isPrincipalCashier && (
                        <td className="px-6 py-4">
                          <div 
                            onClick={(e) => { e.stopPropagation(); toggleSelect(s.id); }}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
                              selectedIds.includes(s.id) 
                                ? 'border-[#1b669d] bg-[#1b669d]/5' 
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {selectedIds.includes(s.id) && <CheckSquare size={14} className="text-[#1b669d]" />}
                          </div>
                        </td>
                      )}

                      {/* Personnel */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1b669d]/10 to-[#1b669d]/20 flex items-center justify-center text-[#1b669d] text-sm font-black shrink-0">
                            {s.user_name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-sm group-hover:text-[#1b669d] transition-colors leading-none">
                              {s.user_name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                                #{String(s.id).padStart(5, '0')}
                              </p>
                              {s.wave && (
                                <>
                                  <span className="text-slate-300 text-[10px] font-black">•</span>
                                  <span className="text-[9px] font-black text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                    {s.wave}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <Badge variant={roleMeta.color}>
                          <span className={`w-1.5 h-1.5 rounded-full ${roleMeta.dot}`} />
                          {roleMeta.label ?? s.shift_role}
                        </Badge>
                      </td>

                      {/* Timeline */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span>
                              {getWaveStartTime(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              <span className="text-slate-300 ml-1.5 text-[10px]">
                                {getWaveStartTime(s).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </span>
                          </div>
                          {s.closed_at ? (
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                              <span>
                                {new Date(s.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                <span className="text-slate-300 ml-1.5 text-[10px]">
                                  {new Date(s.closed_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                              <RefreshCcw size={9} className="animate-spin" />
                              Live
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {statusMeta.pulse && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                          )}
                          <Badge variant={statusMeta.variant}>
                            {statusMeta.label}
                          </Badge>
                        </div>
                      </td>

                      {/* Flags */}
                      <td className="px-6 py-4">
                        {s.is_flagged ? (() => {
                          const isAutoClose = s.flag_reasons?.some(r => r.includes('auto-closed') || r.includes('policy limit'));
                          return (
                            <div className="flex flex-col gap-1.5">
                              {isAutoClose && (
                                <Badge variant="destructive" className="bg-slate-900 border-slate-700 text-rose-300 text-[0.6rem]">
                                  <Timer size={9} /> System Auto-Closed
                                </Badge>
                              )}
                              <div className="relative group/tip">
                                <Badge variant="destructive" className="cursor-help">
                                  <Flag size={10} />
                                  {s.flag_reasons?.length > 0
                                    ? `${s.flag_reasons.length} Alert${s.flag_reasons.length > 1 ? 's' : ''}`
                                    : 'Flagged'}
                                </Badge>

                                {/* Tooltip */}
                                {s.flag_reasons?.length > 0 && (
                                  <div className="absolute z-50 bottom-full left-0 mb-3 w-72 p-4 rounded-2xl bg-slate-900 border border-rose-500/20 shadow-2xl opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all duration-200 pointer-events-none">
                                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                      <AlertTriangle size={11} /> Violations
                                    </p>
                                    <ul className="space-y-2">
                                      {s.flag_reasons.map((r, i) => (
                                        <li key={i} className="text-xs text-slate-300 font-medium pl-3 border-l-2 border-rose-500/40 leading-relaxed">
                                          {r}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })() : (
                          <span className="text-slate-200 text-lg select-none">—</span>
                        )}
                      </td>

                      {/* Review */}
                      <td className="px-6 py-4">
                        {s.reviewed_at ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                              <ShieldCheck size={15} />
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-emerald-700 leading-none">Verified</p>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                by {s.reviewed_by_name?.split(' ')[0]}
                              </p>
                            </div>
                          </div>
                        ) : isSealed ? (
                          isPrincipalCashier ? (
                            <span className="text-slate-400 font-semibold text-xs">Pending Sign-off</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReview(s.id)}
                              disabled={reviewing === s.id}
                              className="text-[0.65rem] tracking-wider"
                            >
                              {reviewing === s.id
                                ? <><RefreshCcw size={11} className="animate-spin" /> Verifying…</>
                                : <><CheckCircle2 size={11} /> Sign Off</>
                              }
                            </Button>
                          )
                        ) : (
                          <span className="text-slate-200 text-lg select-none">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isSupervisor && (
                            <>
                              {isSealed ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Reactivate Shift"
                                  onClick={() => { setReactivateId(s.id); setReactivatePassword(''); setReactivateOpen(true); }}
                                  className="w-9 h-9 rounded-xl text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                >
                                  <RefreshCcw size={15} />
                                </Button>
                              ) : isLive && (
                                <Link
                                  to={`/shifts/${s.id}`}
                                  title="Force Close Shift"
                                  className="inline-flex w-9 h-9 items-center justify-center rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-transparent hover:border-rose-100 transition-all"
                                >
                                  <Lock size={15} />
                                </Link>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Edit Shift Record"
                                onClick={() => setEditingShift(s)}
                                className="w-9 h-9 rounded-xl text-slate-400 hover:text-[#1b669d] hover:bg-slate-50"
                              >
                                <Edit3 size={15} />
                              </Button>

                              {user.role === 'admin' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Permanently Delete"
                                  onClick={() => { setDeleteId(s.id); setDeleteOpen(true); }}
                                  className="w-9 h-9 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 size={15} />
                                </Button>
                              )}
                            </>
                          )}
                          
                          <Link
                            to={`/shifts/${s.id}`}
                            title="View Details"
                            className="inline-flex w-9 h-9 items-center justify-center rounded-xl border-2 border-slate-100 text-slate-400 bg-white hover:bg-[#1b669d] hover:border-[#1b669d] hover:text-white hover:shadow-lg hover:shadow-[#1b669d]/20 transition-all"
                          >
                            <Eye size={15} />
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* ── Pagination ─────────────────────────────────────── */}
          {meta.total > meta.limit && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t-2 border-slate-100 bg-slate-50/50">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Page {meta.page} of {totalPages} &nbsp;·&nbsp; {meta.total.toLocaleString()} records
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fetchShifts(meta.page - 1)}
                  disabled={meta.page === 1}
                >
                  <ChevronLeft size={16} />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - meta.page) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '…' ? (
                        <span key={`e${i}`} className="px-2 text-slate-300 font-bold">…</span>
                      ) : (
                        <Button
                          key={p}
                          size="sm"
                          variant={meta.page === p ? 'default' : 'ghost'}
                          onClick={() => fetchShifts(p)}
                          className="w-9 h-9 p-0 text-xs font-black"
                        >
                          {p}
                        </Button>
                      )
                    )
                  }
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fetchShifts(meta.page + 1)}
                  disabled={meta.page === totalPages}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* ── Edit Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {editingShift && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Edit Shift Record</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Session #{editingShift.id}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setEditingShift(null)}>
                  <X size={20} />
                </Button>
              </div>

              <form onSubmit={handleUpdateShift} className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Handover Notes</Label>
                  <textarea
                    name="handover_notes"
                    defaultValue={editingShift.handover_notes}
                    rows={4}
                    className="w-full rounded-2xl border-2 border-slate-100 p-4 text-sm font-semibold text-slate-700 focus:border-[#1b669d] focus:ring-0 outline-none transition-all"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                  <input
                    type="checkbox"
                    name="is_flagged"
                    defaultChecked={!!editingShift.is_flagged}
                    id="flag-check"
                    className="w-5 h-5 rounded-md border-rose-200 text-rose-600 focus:ring-rose-500"
                  />
                  <label htmlFor="flag-check" className="text-sm font-black text-rose-700 cursor-pointer">
                    Flag for Review / Policy Violation
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1 rounded-2xl py-6" onClick={() => setEditingShift(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 rounded-2xl py-6 bg-[#1b669d] hover:bg-[#124d77]">
                    Save Changes
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>, document.body
        )}
      </AnimatePresence>

      {/* ── Bulk Review Modal ────────────────────────────────────────── */}
      <Dialog open={bulkReviewOpen} onOpenChange={setBulkReviewOpen}>
        <DialogContent className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-100">
          <DialogHeader className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-black text-slate-900">Bulk Sign Off</DialogTitle>
                <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Sign off {selectedIds.length} shift{selectedIds.length !== 1 ? 's' : ''}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleBulkReviewSubmit} className="p-8 space-y-6">
            <p className="text-sm text-slate-600 font-medium leading-relaxed text-left">
              You are about to sign off and verify <strong>{selectedIds.length}</strong> shift sessions. This will permanently mark these records as verified.
            </p>
            
            <div className="space-y-2 text-left">
              <Label>Authorize Action</Label>
              <Input
                type="password"
                placeholder="Enter your password to authorize..."
                value={bulkReviewPassword}
                onChange={(e) => setBulkReviewPassword(e.target.value)}
                className="w-full"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 rounded-2xl py-6" 
                onClick={() => setBulkReviewOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 rounded-2xl py-6 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Verify &amp; Sign Off
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Reactivation Modal ───────────────────────────────────────── */}
      <Dialog open={reactivateOpen} onOpenChange={setReactivateOpen}>
        <DialogContent className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-100">
          <DialogHeader className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <RefreshCcw size={20} />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-black text-slate-900">Reactivate Shift Session</DialogTitle>
                <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Shift ID #{reactivateId ? String(reactivateId).padStart(5, '0') : ''}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleReactivateSubmit} className="p-8 space-y-6">
            <p className="text-sm text-slate-600 font-medium leading-relaxed text-left">
              Are you sure you want to reactivate this shift? It will be moved back to <strong>"Live"</strong> status and the agent will be notified to complete their closing report.
            </p>
            
            <div className="space-y-2 text-left">
              <Label>Authorize Action</Label>
              <Input
                type="password"
                placeholder="Enter your password to authorize..."
                value={reactivatePassword}
                onChange={(e) => setReactivatePassword(e.target.value)}
                className="w-full"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 rounded-2xl py-6" 
                onClick={() => setReactivateOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 rounded-2xl py-6 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Reactivate Session
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Modal ────────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-100">
          <DialogHeader className="px-8 py-6 border-b border-slate-100 bg-rose-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Trash2 size={20} />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-black text-rose-700">Confirm Shift Deletion</DialogTitle>
                <DialogDescription className="text-xs font-bold text-rose-400 uppercase tracking-widest mt-0.5">
                  Shift ID #{deleteId ? String(deleteId).padStart(5, '0') : ''}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-700 font-bold space-y-1 text-left">
              <p className="uppercase tracking-widest text-[10px] font-black">CRITICAL ACTION:</p>
              <p className="normal-case">This will permanently delete this shift record and all its associated closing data. This action cannot be undone.</p>
            </div>
            
            <p className="text-sm text-slate-600 font-medium leading-relaxed text-left">
              Are you absolutely sure you want to purge this record from the database?
            </p>

            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 rounded-2xl py-6" 
                onClick={() => setDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                className="flex-1 rounded-2xl py-6 bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleDeleteSubmit}
              >
                Permanently Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
