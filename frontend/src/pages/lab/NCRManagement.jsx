import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertOctagon, TrendingUp, Clock, AlertTriangle, ListChecks,
  Search, FilePlus2, RefreshCw, Pencil, Trash2, X, CheckCircle2,
  Shield, CheckCircle, Save, ArrowRight, ArrowLeft, UserCheck,
  ShieldCheck, FileText, ChevronRight, Activity, Filter, Eye
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function NCRManagement() {
  const { user } = useAuth();

  // ── STATE ──────────────────────────────────────────────────────────────────
  const [ncrList, setNcrList] = useState([]);
  const [ncrKpi, setNcrKpi] = useState({
    totalThisMonth: 0,
    closedThisMonth: 0,
    pctCompleted: 0,
    openCount: 0,
    inProgressCount: 0,
    overdueCount: 0,
    totalAllTime: 0
  });
  const [ncrLoading, setNcrLoading] = useState(false);
  const [ncrView, setNcrView] = useState('list'); // 'list' | 'wizard' | 'detail'
  const [ncrSelected, setNcrSelected] = useState(null);
  const [ncrStatusFilter, setNcrStatusFilter] = useState('all');
  const [ncrQueueFilter, setNcrQueueFilter] = useState('all'); // 'all' | 'qm_pending' | 'lm_pending'
  const [ncrSearch, setNcrSearch] = useState('');
  const [ncrSubmitting, setNcrSubmitting] = useState(false);

  // Form Stepper State (1: Incident, 2: RCA, 3: CAPA, 4: Sign-off)
  const [formStep, setFormStep] = useState(1);

  // Form blank template
  const NCR_BLANK = {
    occurred_at: new Date().toISOString().slice(0, 16),
    recorded_by: user?.full_name || '',
    unit: 'Hematology',
    nc_category: 'Pre-analytical',
    description: '',
    rca_method: ['5 Whys'],
    rca_results: '',
    immediate_action: '',
    significance: 'minor',
    extent: '',
    assigned_to_name: '',
    assigned_to_position: 'Head Manager',
    corrective_actions: '',
    target_completion: '',
    monitoring_notes: '',
    staff_name: user?.full_name || '',
    reviewed_by_qm: '',
    verified_by_lab_manager: '',
    status: 'open',
  };
  const [ncrForm, setNcrForm] = useState({ ...NCR_BLANK });

  // Update default recorded_by when user loads
  useEffect(() => {
    if (user?.full_name && !ncrForm.recorded_by) {
      setNcrForm(prev => ({
        ...prev,
        recorded_by: user.full_name,
        staff_name: user.full_name
      }));
    }
  }, [user]);

  // Fetch NCR records & KPIs
  const fetchNCRs = async () => {
    setNcrLoading(true);
    try {
      const res = await api.get('/lab/ncr');
      if (res.data?.success) {
        setNcrList(res.data.data || []);
        setNcrKpi(res.data.kpi || {});
      }
    } catch (err) {
      console.warn('NCR fetch failed:', err);
      toast.error('Failed to load NCR records.');
    } finally {
      setNcrLoading(false);
    }
  };

  useEffect(() => {
    fetchNCRs();
  }, []);

  // Compute Manager Work Queues
  const pendingQmReviews = useMemo(() => {
    return ncrList.filter(n => !n.reviewed_by_qm && n.status !== 'closed');
  }, [ncrList]);

  const pendingLmVerifications = useMemo(() => {
    return ncrList.filter(n => n.reviewed_by_qm && !n.verified_by_lab_manager && n.status !== 'closed');
  }, [ncrList]);

  // ── HANDLERS ───────────────────────────────────────────────────────────────
  const handleNCRFieldChange = (field, value) => {
    setNcrForm(prev => ({ ...prev, [field]: value }));
  };

  const handleNCRRcaToggle = (method) => {
    setNcrForm(prev => {
      const current = Array.isArray(prev.rca_method) ? prev.rca_method : [];
      return {
        ...prev,
        rca_method: current.includes(method)
          ? current.filter(m => m !== method)
          : [...current, method]
      };
    });
  };

  const handleNCRSubmit = async (e) => {
    if (e) e.preventDefault();
    setNcrSubmitting(true);
    try {
      const payload = {
        ...ncrForm,
        rca_method: Array.isArray(ncrForm.rca_method) ? ncrForm.rca_method.join(', ') : ncrForm.rca_method,
      };
      if (ncrSelected?.id) {
        await api.put(`/lab/ncr/${ncrSelected.id}`, payload);
        toast.success('NCR updated successfully.');
      } else {
        const res = await api.post('/lab/ncr', payload);
        toast.success(`${res.data.ncr_number || 'NCR'} registered successfully.`);
      }
      await fetchNCRs();
      setNcrView('list');
      setNcrSelected(null);
      setFormStep(1);
      setNcrForm({ ...NCR_BLANK, recorded_by: user?.full_name || '', staff_name: user?.full_name || '' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to save NCR.');
    } finally {
      setNcrSubmitting(false);
    }
  };

  const handleNCREdit = (ncr) => {
    setNcrSelected(ncr);
    setNcrForm({
      occurred_at: ncr.occurred_at || new Date().toISOString().slice(0, 16),
      recorded_by: ncr.recorded_by || '',
      unit: ncr.unit || 'Hematology',
      nc_category: ncr.nc_category || 'Pre-analytical',
      description: ncr.description || '',
      rca_method: ncr.rca_method ? ncr.rca_method.split(', ').filter(Boolean) : ['5 Whys'],
      rca_results: ncr.rca_results || '',
      immediate_action: ncr.immediate_action || '',
      significance: ncr.significance || 'minor',
      extent: ncr.extent || '',
      assigned_to_name: ncr.assigned_to_name || '',
      assigned_to_position: ncr.assigned_to_position || 'Head Manager',
      corrective_actions: ncr.corrective_actions || '',
      target_completion: ncr.target_completion || '',
      monitoring_notes: ncr.monitoring_notes || '',
      staff_name: ncr.staff_name || '',
      reviewed_by_qm: ncr.reviewed_by_qm || '',
      verified_by_lab_manager: ncr.verified_by_lab_manager || '',
      status: ncr.status || 'open',
    });
    setFormStep(1);
    setNcrView('wizard');
  };

  const handleNCRViewDetail = (ncr) => {
    setNcrSelected(ncr);
    setNcrView('detail');
  };

  const handleNCRDelete = async (id, ncrNumber) => {
    if (!window.confirm(`Permanently delete NCR ${ncrNumber}? This cannot be undone.`)) return;
    try {
      await api.delete(`/lab/ncr/${id}`);
      toast.success(`NCR ${ncrNumber} deleted.`);
      fetchNCRs();
    } catch (err) {
      toast.error('Failed to delete NCR.');
    }
  };

  // Manager Quick Approval Handlers
  const handleQuickQMReview = async (ncr) => {
    const qmStamp = `${user?.full_name || 'Quality Manager'} (${new Date().toLocaleDateString('en-GB')})`;
    try {
      await api.put(`/lab/ncr/${ncr.id}`, {
        status: ncr.status === 'open' ? 'in_progress' : ncr.status,
        reviewed_by_qm: qmStamp
      });
      toast.success(`NCR ${ncr.ncr_number} marked as Reviewed by Quality Manager.`);
      fetchNCRs();
      if (ncrSelected?.id === ncr.id) {
        setNcrSelected(prev => ({ ...prev, reviewed_by_qm: qmStamp, status: ncr.status === 'open' ? 'in_progress' : ncr.status }));
      }
    } catch (err) {
      toast.error('Failed to update QM review.');
    }
  };

  const handleQuickLabManagerVerify = async (ncr) => {
    const lmStamp = `${user?.full_name || 'Lab Manager'} (${new Date().toLocaleDateString('en-GB')})`;
    try {
      await api.put(`/lab/ncr/${ncr.id}`, {
        status: 'closed',
        verified_by_lab_manager: lmStamp
      });
      toast.success(`NCR ${ncr.ncr_number} verified & CLOSED by Lab Manager.`);
      fetchNCRs();
      if (ncrSelected?.id === ncr.id) {
        setNcrSelected(prev => ({ ...prev, verified_by_lab_manager: lmStamp, status: 'closed' }));
      }
    } catch (err) {
      toast.error('Failed to verify and close NCR.');
    }
  };

  // Filtered List
  const filteredNCRs = useMemo(() => {
    return ncrList.filter(ncr => {
      const matchesStatus = ncrStatusFilter === 'all' || ncr.status === ncrStatusFilter;
      let matchesQueue = true;
      if (ncrQueueFilter === 'qm_pending') matchesQueue = !ncr.reviewed_by_qm && ncr.status !== 'closed';
      if (ncrQueueFilter === 'lm_pending') matchesQueue = ncr.reviewed_by_qm && !ncr.verified_by_lab_manager && ncr.status !== 'closed';

      const q = ncrSearch.toLowerCase();
      const matchesSearch = !q.trim() ||
        ncr.ncr_number?.toLowerCase().includes(q) ||
        ncr.recorded_by?.toLowerCase().includes(q) ||
        ncr.unit?.toLowerCase().includes(q) ||
        ncr.description?.toLowerCase().includes(q);
      return matchesStatus && matchesQueue && matchesSearch;
    });
  }, [ncrList, ncrStatusFilter, ncrQueueFilter, ncrSearch]);

  // Helper for 4-Step Progress Calculation
  const getNcrProgressStep = (ncr) => {
    if (ncr.status === 'closed' || ncr.verified_by_lab_manager) return 4; // Verified & Closed
    if (ncr.reviewed_by_qm) return 3; // QM Reviewed
    if (ncr.rca_results || ncr.corrective_actions) return 2; // RCA/CAPA Defined
    return 1; // Reported / Logged
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-800 antialiased bg-slate-50/50 min-h-screen">
      
      {/* ── MINIMALIST BLUE HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-6 rounded-3xl text-white shadow-xl shadow-blue-900/10">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <AlertOctagon className="text-amber-300" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Non-Conformance Management (NCR)
                <span className="text-[10px] font-semibold bg-blue-500/30 text-blue-100 border border-blue-400/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  ISO 15189:2022
                </span>
              </h1>
              <p className="text-xs text-blue-100/80 font-normal">
                Digital Quality Audit Tracker & Root Cause Analysis Suite (Form Ref: FM-12-VERS-004)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {ncrView === 'list' ? (
            <button
              onClick={() => {
                setNcrForm({ ...NCR_BLANK, recorded_by: user?.full_name || '', staff_name: user?.full_name || '' });
                setNcrSelected(null);
                setFormStep(1);
                setNcrView('wizard');
              }}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-white hover:bg-blue-50 text-blue-900 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-black/10 active:scale-95"
            >
              <FilePlus2 size={16} className="text-blue-700" /> New NCR Report
            </button>
          ) : (
            <button
              onClick={() => { setNcrView('list'); setNcrSelected(null); }}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20 backdrop-blur-md"
            >
              <ListChecks size={16} /> View Register
            </button>
          )}
          <button
            onClick={fetchNCRs}
            className="p-2.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer border border-white/20 backdrop-blur-md"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={ncrLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── KPI DASHBOARD CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'NCRs Registered',
            value: ncrKpi.totalThisMonth ?? 0,
            sub: `${ncrKpi.totalAllTime ?? 0} total cases recorded`,
            icon: <AlertOctagon size={18} className="text-blue-600" />,
            accent: 'bg-blue-50/80 border-blue-200/80 text-blue-900',
          },
          {
            label: 'Resolution Rate %',
            value: `${ncrKpi.pctCompleted ?? 0}%`,
            sub: `${ncrKpi.closedThisMonth ?? 0} closed successfully`,
            icon: <TrendingUp size={18} className="text-emerald-600" />,
            accent: 'bg-emerald-50/80 border-emerald-200/80 text-emerald-900',
          },
          {
            label: 'Active Open Cases',
            value: ncrKpi.openCount ?? 0,
            sub: `${ncrKpi.inProgressCount ?? 0} in active investigation`,
            icon: <Clock size={18} className="text-amber-600" />,
            accent: 'bg-amber-50/80 border-amber-200/80 text-amber-900',
          },
          {
            label: 'Overdue (>30 Days)',
            value: ncrKpi.overdueCount ?? 0,
            sub: 'Requires immediate CAPA review',
            icon: <AlertTriangle size={18} className="text-rose-600" />,
            accent: 'bg-rose-50/80 border-rose-200/80 text-rose-900',
          },
        ].map((k, i) => (
          <div key={i} className={`rounded-2xl border p-4.5 space-y-2 shadow-sm transition-all hover:shadow-md ${k.accent}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">{k.label}</span>
              <div className="p-2 bg-white rounded-xl shadow-xs">{k.icon}</div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{k.value}</p>
            <p className="text-[11px] opacity-75 font-medium">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── LAB MANAGER & QUALITY MANAGER PROGRESS WORKFLOW TRACKER ── */}
      <div className="bg-white rounded-3xl border border-blue-100 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="text-blue-600" size={18} />
              Quality & Management Progress Tracker
            </h2>
            <p className="text-xs text-slate-500">
              ISO Audit Workflow for Quality Managers (QM) and Laboratory Management
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setNcrQueueFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                ncrQueueFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Records ({ncrList.length})
            </button>
            <button
              onClick={() => setNcrQueueFilter('qm_pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                ncrQueueFilter === 'qm_pending' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
              }`}
            >
              <Shield size={13} />
              Pending QM Audit ({pendingQmReviews.length})
            </button>
            <button
              onClick={() => setNcrQueueFilter('lm_pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                ncrQueueFilter === 'lm_pending' ? 'bg-blue-900 text-white shadow-xs' : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60'
              }`}
            >
              <UserCheck size={13} />
              Pending Lab Manager Sign-off ({pendingLmVerifications.length})
            </button>
          </div>
        </div>

        {/* Workflow Lifecycle Pipeline Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
          {[
            {
              step: 1,
              title: '1. Logged / Reported',
              desc: 'Initial NC recorded by staff',
              count: ncrList.filter(n => getNcrProgressStep(n) === 1).length,
              color: 'border-slate-300 bg-slate-50 text-slate-700',
              badge: 'bg-slate-200 text-slate-700'
            },
            {
              step: 2,
              title: '2. RCA & CAPA Defined',
              desc: 'Root Cause & Plan documented',
              count: ncrList.filter(n => getNcrProgressStep(n) === 2).length,
              color: 'border-blue-300 bg-blue-50/60 text-blue-900',
              badge: 'bg-blue-200 text-blue-900'
            },
            {
              step: 3,
              title: '3. QM Reviewed',
              desc: 'Audited by Quality Manager',
              count: ncrList.filter(n => getNcrProgressStep(n) === 3).length,
              color: 'border-amber-300 bg-amber-50/60 text-amber-900',
              badge: 'bg-amber-200 text-amber-900'
            },
            {
              step: 4,
              title: '4. Verified & Closed',
              desc: 'Approved by Lab Manager',
              count: ncrList.filter(n => getNcrProgressStep(n) === 4).length,
              color: 'border-emerald-300 bg-emerald-50/60 text-emerald-900',
              badge: 'bg-emerald-200 text-emerald-900'
            },
          ].map((pipeline, idx) => (
            <div key={idx} className={`p-3.5 rounded-2xl border ${pipeline.color} space-y-1 relative overflow-hidden`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">{pipeline.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pipeline.badge}`}>
                  {pipeline.count}
                </span>
              </div>
              <p className="text-[11px] opacity-75">{pipeline.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── NCR REGISTER LIST VIEW ── */}
      {ncrView === 'list' && (
        <div className="bg-white border border-blue-100 rounded-3xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ListChecks size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Non-Conformance Audit Register</h2>
              <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 font-bold border border-blue-200/60">
                {filteredNCRs.length} records
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Status Filter Chips */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {['all','open','in_progress','closed'].map(s => (
                  <button
                    key={s}
                    onClick={() => setNcrStatusFilter(s)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-all ${
                      ncrStatusFilter === s ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {s.replace('_',' ')}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={ncrSearch}
                  onChange={e => setNcrSearch(e.target.value)}
                  placeholder="Search NCR, reporter, unit..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all w-48 sm:w-64"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-blue-50/50 text-blue-900 font-semibold uppercase text-[10px] tracking-wider border-b border-blue-100">
                <tr>
                  <th className="py-3 px-4">NCR Number</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Significance</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4">Workflow Progress</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ncrLoading ? (
                  <tr><td colSpan="9" className="py-12 text-center text-slate-400 text-xs">Loading NCR register…</td></tr>
                ) : filteredNCRs.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-14 text-center">
                      <AlertOctagon size={32} className="mx-auto text-blue-200 mb-2" />
                      <p className="text-slate-500 font-medium text-xs">No NCR records match your search filters.</p>
                      <button
                        onClick={() => { setNcrStatusFilter('all'); setNcrQueueFilter('all'); setNcrSearch(''); }}
                        className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </td>
                  </tr>
                ) : filteredNCRs.map(ncr => {
                  const step = getNcrProgressStep(ncr);
                  const statusCfg = {
                    open:        { label: 'Open',        cls: 'bg-amber-100 text-amber-800 border-amber-200' },
                    in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
                    closed:      { label: 'Closed',      cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                  }[ncr.status] || { label: ncr.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };

                  return (
                    <tr key={ncr.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">
                        <button
                          onClick={() => handleNCRViewDetail(ncr)}
                          className="hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {ncr.ncr_number}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {ncr.occurred_at ? new Date(ncr.occurred_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{ncr.unit}</td>
                      <td className="py-3 px-4 text-slate-500">{ncr.nc_category || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                          ncr.significance === 'major' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {ncr.significance === 'major' ? <AlertTriangle size={10} /> : <Shield size={10} />}
                          {ncr.significance}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium">{ncr.recorded_by}</td>

                      {/* Visual Progress Stepper Badge */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {[1,2,3,4].map(s => (
                            <div
                              key={s}
                              className={`h-2 rounded-full transition-all ${
                                s <= step
                                  ? s === 4 ? 'w-6 bg-emerald-500' : s === 3 ? 'w-6 bg-amber-500' : 'w-6 bg-blue-600'
                                  : 'w-2 bg-slate-200'
                              }`}
                              title={`Step ${s}: ${s === 1 ? 'Reported' : s === 2 ? 'RCA' : s === 3 ? 'QM Review' : 'Lab Manager Verified'}`}
                            />
                          ))}
                          <span className="text-[10px] font-semibold text-slate-400 ml-1">
                            {step === 4 ? 'Closed' : step === 3 ? 'QM Audited' : step === 2 ? 'RCA Set' : 'Log'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Manager Quick Action Buttons */}
                          {!ncr.reviewed_by_qm && ncr.status !== 'closed' && (
                            <button
                              onClick={() => handleQuickQMReview(ncr)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[10px] rounded-lg border border-amber-300 transition-all cursor-pointer flex items-center gap-1"
                              title="Quality Manager Quick Review Stamp"
                            >
                              <Shield size={11} /> QM Stamp
                            </button>
                          )}
                          {ncr.reviewed_by_qm && !ncr.verified_by_lab_manager && ncr.status !== 'closed' && (
                            <button
                              onClick={() => handleQuickLabManagerVerify(ncr)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg border border-emerald-300 transition-all cursor-pointer flex items-center gap-1"
                              title="Lab Manager Quick Verify & Close"
                            >
                              <UserCheck size={11} /> Verify & Close
                            </button>
                          )}

                          <button
                            onClick={() => handleNCRViewDetail(ncr)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                            title="View Full NCR Summary"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleNCREdit(ncr)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                            title="Edit NCR Form"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleNCRDelete(ncr.id, ncr.ncr_number)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Delete NCR"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODERN MULTI-STEP WIZARD FORM (REPLACING RIGID PAPER GRID) ── */}
      {ncrView === 'wizard' && (
        <div className="bg-white border border-blue-100 rounded-3xl shadow-xl overflow-hidden max-w-4xl mx-auto space-y-0">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200 bg-blue-600/50 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                Form Ref: FM-12-VERS-004 | ISO 15189:2022
              </span>
              <h2 className="text-lg font-bold mt-1 text-white">
                {ncrSelected?.id ? `Edit NCR Report — ${ncrSelected.ncr_number}` : 'New Non-Conformance Incident Report'}
              </h2>
            </div>
            <button
              onClick={() => { setNcrView('list'); setNcrSelected(null); }}
              className="p-2 text-blue-100 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Stepper Navigation Bar */}
          <div className="bg-blue-50/70 border-b border-blue-100 px-6 py-4">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {[
                { step: 1, label: '1. Incident Identification' },
                { step: 2, label: '2. Root Cause (RCA)' },
                { step: 3, label: '3. CAPA Plan' },
                { step: 4, label: '4. Sign-off & Status' },
              ].map((s, idx) => (
                <button
                  key={s.step}
                  onClick={() => setFormStep(s.step)}
                  className={`flex items-center gap-2 text-xs font-bold cursor-pointer transition-all ${
                    formStep === s.step
                      ? 'text-blue-700 scale-105'
                      : formStep > s.step
                      ? 'text-emerald-700'
                      : 'text-slate-400'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                    formStep === s.step
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : formStep > s.step
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {formStep > s.step ? <CheckCircle size={14} /> : s.step}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Content Body */}
          <form onSubmit={handleNCRSubmit} className="p-6 sm:p-8 space-y-6 text-xs">
            
            {/* STEP 1: Incident Identification */}
            {formStep === 1 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="text-blue-600" size={16} />
                    Step 1: Non-Conformance Incident Identification
                  </h3>
                  <p className="text-xs text-slate-500">Record when, where, and who identified the quality non-conformance.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      NCR Reference Number
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={ncrSelected?.ncr_number || 'Auto-assigned on save'}
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono font-bold cursor-not-allowed text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Date & Time of Occurrence <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={ncrForm.occurred_at}
                      onChange={e => handleNCRFieldChange('occurred_at', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-medium text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Staff Member Recording <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Eric Ndayishimiye"
                      value={ncrForm.recorded_by}
                      onChange={e => handleNCRFieldChange('recorded_by', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 font-medium text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Laboratory Unit / Section <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={ncrForm.unit}
                      onChange={e => handleNCRFieldChange('unit', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 font-medium text-xs"
                    >
                      {['Hematology','Biochemistry','Microbiology','Serology / Immunology','Molecular / PCR','Coagulation','Urinalysis','Blood Bank','Reception / Pre-Analytical','Quality Control','General Laboratory','Administration'].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Non-Conformance Category
                    </label>
                    <select
                      value={ncrForm.nc_category}
                      onChange={e => handleNCRFieldChange('nc_category', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 font-medium text-xs"
                    >
                      {['Pre-analytical','Analytical','Post-analytical','Administrative','Equipment / Instrumentation','Reagent / Consumable','Personnel','Facility / Environment'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Significance / Severity Level
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleNCRFieldChange('significance', 'minor')}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                        ncrForm.significance === 'minor'
                          ? 'border-blue-500 bg-blue-50/70 text-blue-900 font-bold ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold">Minor Non-Conformance</p>
                        <p className="text-[10px] text-slate-500 font-normal">Isolated error with minimal patient safety or workflow impact</p>
                      </div>
                      <Shield size={18} className={ncrForm.significance === 'minor' ? 'text-blue-600' : 'text-slate-400'} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNCRFieldChange('significance', 'major')}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                        ncrForm.significance === 'major'
                          ? 'border-rose-500 bg-rose-50/70 text-rose-950 font-bold ring-2 ring-rose-500/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-rose-700">Major Non-Conformance</p>
                        <p className="text-[10px] text-rose-600/80 font-normal">High-risk breakdown affecting test integrity or clinical diagnosis</p>
                      </div>
                      <AlertTriangle size={18} className={ncrForm.significance === 'major' ? 'text-rose-600' : 'text-slate-400'} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Detailed Description of Non-Conformance <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe exactly what happened, sample IDs affected, equipment involved, and observed discrepancy..."
                    value={ncrForm.description}
                    onChange={e => handleNCRFieldChange('description', e.target.value)}
                    className="w-full p-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-xs"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Root Cause Analysis */}
            {formStep === 2 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Search className="text-blue-600" size={16} />
                    Step 2: Root Cause Analysis (RCA) & Immediate Containment Action
                  </h3>
                  <p className="text-xs text-slate-500">Determine underlying failure modes and immediate corrective steps taken.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                    RCA Methodology Employed
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['5 Whys', 'Fishbone / Ishikawa Diagram', 'Brainstorming', 'Process Mapping', 'Audit Inspection'].map(m => {
                      const isSel = Array.isArray(ncrForm.rca_method) && ncrForm.rca_method.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleNCRRcaToggle(m)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                            isSel ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isSel ? '✓ ' : '+ '}{m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Root Cause Analysis Findings
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Document root cause findings from 5 Whys or Fishbone investigation..."
                    value={ncrForm.rca_results}
                    onChange={e => handleNCRFieldChange('rca_results', e.target.value)}
                    className="w-full p-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Immediate Containment / Corrective Action Taken
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Action taken immediately to contain non-conformance (e.g. sample re-run, reagent isolation)..."
                    value={ncrForm.immediate_action}
                    onChange={e => handleNCRFieldChange('immediate_action', e.target.value)}
                    className="w-full p-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-xs"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: CAPA & Assignment */}
            {formStep === 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="text-blue-600" size={16} />
                    Step 3: Corrective & Preventive Action Plan (CAPA)
                  </h3>
                  <p className="text-xs text-slate-500">Assign responsibility, target completion date, and ongoing monitoring plan.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Assigned Actionee Name
                    </label>
                    <input
                      type="text"
                      placeholder="Name of staff responsible for CAPA"
                      value={ncrForm.assigned_to_name}
                      onChange={e => handleNCRFieldChange('assigned_to_name', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 font-medium text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Target Completion Date
                    </label>
                    <input
                      type="date"
                      value={ncrForm.target_completion}
                      onChange={e => handleNCRFieldChange('target_completion', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 font-medium text-slate-900 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Corrective & Preventive Action (CAPA) Plan
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Specify long-term preventive measures (SOP revisions, re-training, instrument calibration)..."
                    value={ncrForm.corrective_actions}
                    onChange={e => handleNCRFieldChange('corrective_actions', e.target.value)}
                    className="w-full p-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Monitoring & Audit Verification Plan
                  </label>
                  <textarea
                    rows={3}
                    placeholder="How will effectiveness of CAPA be monitored during internal audits?"
                    value={ncrForm.monitoring_notes}
                    onChange={e => handleNCRFieldChange('monitoring_notes', e.target.value)}
                    className="w-full p-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 text-xs"
                  />
                </div>
              </div>
            )}

            {/* STEP 4: Manager Sign-off & Status */}
            {formStep === 4 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="text-blue-600" size={16} />
                    Step 4: Quality & Management Verification & Closure
                  </h3>
                  <p className="text-xs text-slate-500">Quality Manager audit approval and Laboratory Manager final verification.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Shield size={14} className="text-amber-600" /> Reviewed by Quality Manager (QM)
                      </label>
                      <button
                        type="button"
                        onClick={() => handleNCRFieldChange('reviewed_by_qm', `${user?.full_name || 'Quality Manager'} (${new Date().toLocaleDateString('en-GB')})`)}
                        className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-bold text-[10px] hover:bg-amber-700 cursor-pointer shadow-xs"
                      >
                        Stamp My Name
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Quality Manager sign-off stamp"
                      value={ncrForm.reviewed_by_qm}
                      onChange={e => handleNCRFieldChange('reviewed_by_qm', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-amber-950 font-bold text-xs"
                    />
                  </div>

                  <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck size={14} className="text-emerald-600" /> Verified by Laboratory Manager
                      </label>
                      <button
                        type="button"
                        onClick={() => handleNCRFieldChange('verified_by_lab_manager', `${user?.full_name || 'Lab Manager'} (${new Date().toLocaleDateString('en-GB')})`)}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[10px] hover:bg-emerald-700 cursor-pointer shadow-xs"
                      >
                        Stamp My Name
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Lab Manager verification stamp"
                      value={ncrForm.verified_by_lab_manager}
                      onChange={e => handleNCRFieldChange('verified_by_lab_manager', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl text-emerald-950 font-bold text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    NCR Record Status
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { status: 'open', label: 'Open (Logging)', color: 'bg-amber-50 border-amber-300 text-amber-900' },
                      { status: 'in_progress', label: 'In Progress (RCA/CAPA)', color: 'bg-blue-50 border-blue-300 text-blue-900' },
                      { status: 'closed', label: 'Closed (Verified)', color: 'bg-emerald-50 border-emerald-300 text-emerald-900' },
                    ].map(st => (
                      <button
                        key={st.status}
                        type="button"
                        onClick={() => handleNCRFieldChange('status', st.status)}
                        className={`p-3 rounded-2xl border text-center font-bold text-xs cursor-pointer transition-all ${
                          ncrForm.status === st.status
                            ? `${st.color} ring-2 ring-blue-500/20 scale-102 shadow-xs`
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              {formStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setFormStep(prev => prev - 1)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                {formStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setFormStep(prev => prev + 1)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    Next Step <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={ncrSubmitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-900/20 active:scale-95"
                  >
                    <Save size={16} /> {ncrSubmitting ? 'Saving...' : 'Save & Submit NCR Report'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── NCR DETAIL SUMMARY MODAL / DRAWER ── */}
      {ncrView === 'detail' && ncrSelected && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-blue-100 shadow-2xl max-w-3xl w-full overflow-hidden space-y-0 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-800 to-indigo-900 p-6 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200 bg-blue-600/40 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                  {ncrSelected.unit}
                </span>
                <h2 className="text-xl font-bold mt-1 text-white font-mono flex items-center gap-2">
                  {ncrSelected.ncr_number}
                  <span className={`text-xs px-3 py-0.5 rounded-full font-sans font-bold ${
                    ncrSelected.status === 'closed' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-amber-500/30 text-amber-200'
                  }`}>
                    {ncrSelected.status.toUpperCase()}
                  </span>
                </h2>
              </div>
              <button
                onClick={() => setNcrView('list')}
                className="p-2 text-blue-100 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto text-xs flex-1">
              
              {/* Stepper Status Bar */}
              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 space-y-2">
                <p className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">Audit Progress Lifecycle</p>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                  <div className="p-2 bg-blue-600 text-white rounded-xl">1. Logged</div>
                  <div className={`p-2 rounded-xl ${ncrSelected.rca_results ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2. RCA Set</div>
                  <div className={`p-2 rounded-xl ${ncrSelected.reviewed_by_qm ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>3. QM Reviewed</div>
                  <div className={`p-2 rounded-xl ${ncrSelected.verified_by_lab_manager ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>4. Closed</div>
                </div>
              </div>

              {/* Grid Summary */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Occurrence Date</span>
                  <p className="font-semibold text-slate-900">{ncrSelected.occurred_at ? new Date(ncrSelected.occurred_at).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Recorded By</span>
                  <p className="font-semibold text-slate-900">{ncrSelected.recorded_by || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Category</span>
                  <p className="font-semibold text-slate-900">{ncrSelected.nc_category || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Significance</span>
                  <p className={`font-semibold capitalize ${ncrSelected.significance === 'major' ? 'text-rose-600' : 'text-slate-800'}`}>
                    {ncrSelected.significance}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Incident Description</span>
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium">
                  {ncrSelected.description || 'No detailed description provided.'}
                </div>
              </div>

              {/* RCA Findings */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Root Cause Analysis (RCA)</span>
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium">
                  <p className="text-[11px] font-bold text-blue-700 mb-1">Method: {ncrSelected.rca_method || '5 Whys'}</p>
                  {ncrSelected.rca_results || 'RCA investigation pending.'}
                </div>
              </div>

              {/* Manager Approval Stamps */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block mb-1">Quality Manager Stamp</span>
                  <p className="font-bold text-amber-950">{ncrSelected.reviewed_by_qm || 'Pending QM Audit'}</p>
                </div>
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block mb-1">Lab Manager Stamp</span>
                  <p className="font-bold text-emerald-950">{ncrSelected.verified_by_lab_manager || 'Pending Manager Verification'}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!ncrSelected.reviewed_by_qm && ncrSelected.status !== 'closed' && (
                  <button
                    onClick={() => handleQuickQMReview(ncrSelected)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Shield size={14} /> Stamp QM Review
                  </button>
                )}
                {ncrSelected.reviewed_by_qm && !ncrSelected.verified_by_lab_manager && ncrSelected.status !== 'closed' && (
                  <button
                    onClick={() => handleQuickLabManagerVerify(ncrSelected)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <UserCheck size={14} /> Stamp Verify & Close NCR
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNCREdit(ncrSelected)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Edit Full Form
                </button>
                <button
                  onClick={() => setNcrView('list')}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
