import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertOctagon, TrendingUp, Clock, AlertTriangle, ListChecks,
  Search, FilePlus2, RefreshCw, Pencil, Trash2, X, CheckCircle2,
  Shield, CheckCircle, Save, ArrowRight, ArrowLeft, UserCheck,
  ShieldCheck, FileText, Download, CheckSquare, Stamp, Eye
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function NCRManagement() {
  const { user } = useAuth();
  const pdfTemplateRef = useRef(null);

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
  const [ncrQueueFilter, setNcrQueueFilter] = useState('all'); // 'all' | 'lm_pending' | 'qm_pending'
  const [ncrSearch, setNcrSearch] = useState('');
  const [ncrSubmitting, setNcrSubmitting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

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
    assigned_to_position: 'Department Supervisor',
    corrective_actions: '',
    target_completion: '',
    monitoring_notes: '',
    staff_name: user?.full_name || '',
    reviewed_by_lab_manager: '',
    approved_by_qm: '',
    status: 'open',
  };
  const [ncrForm, setNcrForm] = useState({ ...NCR_BLANK });

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

  // Manager Work Queues according to business roles:
  // Lab Manager REVIEWS -> Quality Manager APPROVES
  const pendingLmReviews = useMemo(() => {
    return ncrList.filter(n => !n.reviewed_by_lab_manager && !n.verified_by_lab_manager && n.status !== 'closed');
  }, [ncrList]);

  const pendingQmApprovals = useMemo(() => {
    const lmReviewed = (n) => Boolean(n.reviewed_by_lab_manager || n.verified_by_lab_manager);
    const qmApproved = (n) => Boolean(n.approved_by_qm || n.reviewed_by_qm);
    return ncrList.filter(n => lmReviewed(n) && !qmApproved(n) && n.status !== 'closed');
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
        toast.success(`${res.data.ncr_number || 'NCR'} created successfully.`);
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
    const lmVal = ncr.reviewed_by_lab_manager || ncr.verified_by_lab_manager || '';
    const qmVal = ncr.approved_by_qm || ncr.reviewed_by_qm || '';
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
      assigned_to_position: ncr.assigned_to_position || 'Department Supervisor',
      corrective_actions: ncr.corrective_actions || '',
      target_completion: ncr.target_completion || '',
      monitoring_notes: ncr.monitoring_notes || '',
      staff_name: ncr.staff_name || '',
      reviewed_by_lab_manager: lmVal,
      approved_by_qm: qmVal,
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
    if (!window.confirm(`Permanently delete NCR ${ncrNumber}? This action cannot be undone.`)) return;
    try {
      await api.delete(`/lab/ncr/${id}`);
      toast.success(`NCR ${ncrNumber} deleted.`);
      fetchNCRs();
    } catch (err) {
      toast.error('Failed to delete NCR.');
    }
  };

  // Manager Actions:
  // 1. Lab Manager REVIEWS
  const handleLabManagerReviewStamp = async (ncr) => {
    const lmStamp = `${user?.full_name || 'Lab Manager'} (${new Date().toLocaleDateString('en-GB')})`;
    try {
      await api.put(`/lab/ncr/${ncr.id}`, {
        status: ncr.status === 'open' ? 'in_progress' : ncr.status,
        reviewed_by_lab_manager: lmStamp,
        verified_by_lab_manager: lmStamp
      });
      toast.success(`NCR ${ncr.ncr_number} marked as REVIEWED by Laboratory Manager.`);
      fetchNCRs();
      if (ncrSelected?.id === ncr.id) {
        setNcrSelected(prev => ({
          ...prev,
          reviewed_by_lab_manager: lmStamp,
          verified_by_lab_manager: lmStamp,
          status: ncr.status === 'open' ? 'in_progress' : ncr.status
        }));
      }
    } catch (err) {
      toast.error('Failed to update Lab Manager Review.');
    }
  };

  // 2. Quality Manager APPROVES (Final Closure)
  const handleQMApprovalStamp = async (ncr) => {
    const qmStamp = `${user?.full_name || 'Quality Manager'} (${new Date().toLocaleDateString('en-GB')})`;
    try {
      await api.put(`/lab/ncr/${ncr.id}`, {
        status: 'closed',
        approved_by_qm: qmStamp,
        reviewed_by_qm: qmStamp
      });
      toast.success(`NCR ${ncr.ncr_number} APPROVED & CLOSED by Quality Manager.`);
      fetchNCRs();
      if (ncrSelected?.id === ncr.id) {
        setNcrSelected(prev => ({
          ...prev,
          approved_by_qm: qmStamp,
          reviewed_by_qm: qmStamp,
          status: 'closed'
        }));
      }
    } catch (err) {
      toast.error('Failed to approve and close NCR.');
    }
  };

  // PDF Exporter Function
  const handleExportPDF = async (ncr) => {
    setExportingPdf(true);
    toast.loading('Generating executive NCR PDF report...', { id: 'ncr-pdf-toast' });
    try {
      const element = document.getElementById('ncr-pdf-document-template');
      if (!element) throw new Error('PDF Template not loaded');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`NCR_${ncr.ncr_number || 'Report'}_ISO15189.pdf`);

      toast.success('NCR PDF exported successfully.', { id: 'ncr-pdf-toast' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PDF report.', { id: 'ncr-pdf-toast' });
    } finally {
      setExportingPdf(false);
    }
  };

  // Filtered Register List
  const filteredNCRs = useMemo(() => {
    return ncrList.filter(ncr => {
      const matchesStatus = ncrStatusFilter === 'all' || ncr.status === ncrStatusFilter;

      const lmReviewed = Boolean(ncr.reviewed_by_lab_manager || ncr.verified_by_lab_manager);
      const qmApproved = Boolean(ncr.approved_by_qm || ncr.reviewed_by_qm);

      let matchesQueue = true;
      if (ncrQueueFilter === 'lm_pending') matchesQueue = !lmReviewed && ncr.status !== 'closed';
      if (ncrQueueFilter === 'qm_pending') matchesQueue = lmReviewed && !qmApproved && ncr.status !== 'closed';

      const q = ncrSearch.toLowerCase();
      const matchesSearch = !q.trim() ||
        ncr.ncr_number?.toLowerCase().includes(q) ||
        ncr.recorded_by?.toLowerCase().includes(q) ||
        ncr.unit?.toLowerCase().includes(q) ||
        ncr.description?.toLowerCase().includes(q);
      return matchesStatus && matchesQueue && matchesSearch;
    });
  }, [ncrList, ncrStatusFilter, ncrQueueFilter, ncrSearch]);

  // 4-Stage Progress Helper: 1: Logged -> 2: RCA -> 3: Lab Manager Reviewed -> 4: QM Approved (Closed)
  const getNcrProgressStep = (ncr) => {
    const qmApproved = Boolean(ncr.approved_by_qm || ncr.reviewed_by_qm);
    const lmReviewed = Boolean(ncr.reviewed_by_lab_manager || ncr.verified_by_lab_manager);

    if (ncr.status === 'closed' || qmApproved) return 4; // Quality Manager Approved
    if (lmReviewed) return 3; // Lab Manager Reviewed
    if (ncr.rca_results || ncr.corrective_actions) return 2; // RCA & CAPA Set
    return 1; // Logged / Reported
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-800 antialiased bg-slate-50/40 min-h-screen">
      
      {/* ── STREAMLINED EXECUTIVE HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-6 rounded-2xl text-white shadow-sm border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-xl border border-blue-500/30">
              <AlertOctagon className="text-blue-400" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Non-Conformance Management (NCR)
                <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  ISO 15189:2022
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-normal">
                Digital Quality Audit Suite — Form Ref: LEG/PATHLAB/MSD/FM-12-VERS-004
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
              className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
            >
              <FilePlus2 size={16} /> New NCR Report
            </button>
          ) : (
            <button
              onClick={() => { setNcrView('list'); setNcrSelected(null); }}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
            >
              <ListChecks size={16} /> View Register
            </button>
          )}
          <button
            onClick={fetchNCRs}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer border border-slate-800"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={ncrLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'NCRs Registered',
            value: ncrKpi.totalThisMonth ?? 0,
            sub: `${ncrKpi.totalAllTime ?? 0} total cases`,
            icon: <AlertOctagon size={18} className="text-slate-700" />,
            accent: 'bg-white border-slate-200 text-slate-900',
          },
          {
            label: 'Completion Rate',
            value: `${ncrKpi.pctCompleted ?? 0}%`,
            sub: `${ncrKpi.closedThisMonth ?? 0} closed this month`,
            icon: <TrendingUp size={18} className="text-blue-600" />,
            accent: 'bg-white border-slate-200 text-slate-900',
          },
          {
            label: 'Active Open Cases',
            value: ncrKpi.openCount ?? 0,
            sub: `${ncrKpi.inProgressCount ?? 0} in progress`,
            icon: <Clock size={18} className="text-slate-600" />,
            accent: 'bg-white border-slate-200 text-slate-900',
          },
          {
            label: 'Overdue (>30 Days)',
            value: ncrKpi.overdueCount ?? 0,
            sub: 'Requires CAPA escalation',
            icon: <AlertTriangle size={18} className="text-rose-600" />,
            accent: 'bg-white border-slate-200 text-slate-900',
          },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border p-4 space-y-1.5 shadow-2xs ${k.accent}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label}</span>
              {k.icon}
            </div>
            <p className="text-2xl font-bold tracking-tight">{k.value}</p>
            <p className="text-[11px] text-slate-500 font-normal">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── MANAGER WORKFLOW PROGRESS TRACKER ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="text-blue-600" size={18} />
              Quality Audit Pipeline & Work Queues
            </h2>
            <p className="text-xs text-slate-500">
              Lab Manager Review ➔ Quality Manager Final Approval
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setNcrQueueFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                ncrQueueFilter === 'all' ? 'bg-slate-900 text-white shadow-2xs font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({ncrList.length})
            </button>
            <button
              onClick={() => setNcrQueueFilter('lm_pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                ncrQueueFilter === 'lm_pending' ? 'bg-blue-600 text-white shadow-2xs font-bold' : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60'
              }`}
            >
              <UserCheck size={13} />
              Pending Lab Manager Review ({pendingLmReviews.length})
            </button>
            <button
              onClick={() => setNcrQueueFilter('qm_pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                ncrQueueFilter === 'qm_pending' ? 'bg-emerald-700 text-white shadow-2xs font-bold' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              <Shield size={13} />
              Pending QM Approval ({pendingQmApprovals.length})
            </button>
          </div>
        </div>

        {/* 4-Stage Lifecycle Stepper */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
          {[
            {
              step: 1,
              title: '1. Incident Reported',
              desc: 'Logged by staff member',
              count: ncrList.filter(n => getNcrProgressStep(n) === 1).length,
            },
            {
              step: 2,
              title: '2. RCA & CAPA Defined',
              desc: 'Root Cause & Plan documented',
              count: ncrList.filter(n => getNcrProgressStep(n) === 2).length,
            },
            {
              step: 3,
              title: '3. Lab Manager Reviewed',
              desc: 'Reviewed by Lab Manager',
              count: ncrList.filter(n => getNcrProgressStep(n) === 3).length,
            },
            {
              step: 4,
              title: '4. QM Approved & Closed',
              desc: 'Approved by Quality Manager',
              count: ncrList.filter(n => getNcrProgressStep(n) === 4).length,
            },
          ].map((pipeline, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{pipeline.title}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-200">
                  {pipeline.count}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal">{pipeline.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── NCR REGISTER LIST VIEW ── */}
      {ncrView === 'list' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ListChecks size={16} className="text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900">NCR Audit Register</h2>
              <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2.5 py-0.5 font-semibold">
                {filteredNCRs.length} records
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Status Filter Chips */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                {['all','open','in_progress','closed'].map(s => (
                  <button
                    key={s}
                    onClick={() => setNcrStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize cursor-pointer transition-all ${
                      ncrStatusFilter === s ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'
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
                  placeholder="Search NCR, staff, unit..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400 transition-all w-48 sm:w-56"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">NCR Number</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Significance</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4">Lifecycle Step</th>
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
                      <AlertOctagon size={28} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-500 font-medium text-xs">No NCR records match your selected criteria.</p>
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
                  const lmReviewed = Boolean(ncr.reviewed_by_lab_manager || ncr.verified_by_lab_manager);
                  const qmApproved = Boolean(ncr.approved_by_qm || ncr.reviewed_by_qm);

                  const statusCfg = {
                    open:        { label: 'Open',        cls: 'bg-slate-100 text-slate-700 border-slate-200' },
                    in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-800 border-blue-200' },
                    closed:      { label: 'Closed / Approved', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                  }[ncr.status] || { label: ncr.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };

                  return (
                    <tr key={ncr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <button
                          onClick={() => handleNCRViewDetail(ncr)}
                          className="hover:text-blue-600 cursor-pointer flex items-center gap-1"
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
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                          ncr.significance === 'major' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {ncr.significance === 'major' ? <AlertTriangle size={10} /> : <Shield size={10} />}
                          {ncr.significance}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{ncr.recorded_by}</td>

                      {/* Stepper Dots */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {[1,2,3,4].map(s => (
                            <div
                              key={s}
                              className={`h-2 rounded-full transition-all ${
                                s <= step
                                  ? s === 4 ? 'w-5 bg-emerald-600' : s === 3 ? 'w-5 bg-blue-600' : 'w-5 bg-slate-700'
                                  : 'w-2 bg-slate-200'
                              }`}
                              title={`Step ${s}`}
                            />
                          ))}
                          <span className="text-[10px] font-semibold text-slate-500 ml-1">
                            {step === 4 ? 'Approved' : step === 3 ? 'Reviewed' : step === 2 ? 'RCA' : 'Logged'}
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
                          {/* 1-Click Stamps according to rules:
                              Lab Manager REVIEWS -> Quality Manager APPROVES */}
                          {!lmReviewed && ncr.status !== 'closed' && (
                            <button
                              onClick={() => handleLabManagerReviewStamp(ncr)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-[10px] rounded-lg border border-blue-200 transition-all cursor-pointer flex items-center gap-1"
                              title="Lab Manager Review Stamp"
                            >
                              <UserCheck size={11} /> LM Review
                            </button>
                          )}
                          {lmReviewed && !qmApproved && ncr.status !== 'closed' && (
                            <button
                              onClick={() => handleQMApprovalStamp(ncr)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg border border-emerald-200 transition-all cursor-pointer flex items-center gap-1"
                              title="Quality Manager Approval & Final Closure"
                            >
                              <Stamp size={11} /> QM Approve
                            </button>
                          )}

                          {/* PDF Export for Closed / Approved NCRs */}
                          {(ncr.status === 'closed' || qmApproved) && (
                            <button
                              onClick={() => handleExportPDF(ncr)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                              title="Export Minimalist ISO PDF"
                            >
                              <Download size={14} />
                            </button>
                          )}

                          <button
                            onClick={() => handleNCRViewDetail(ncr)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                            title="View Record Summary"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleNCREdit(ncr)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                            title="Edit Form"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleNCRDelete(ncr.id, ncr.ncr_number)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Delete"
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

      {/* ── 4-STEP GUIDED WIZARD FORM ── */}
      {ncrView === 'wizard' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden max-w-3xl mx-auto space-y-0">
          
          {/* Header */}
          <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                ISO 15189:2022 | Ref: LEG/PATHLAB/MSD/FM-12-VERS-004
              </span>
              <h2 className="text-base font-bold mt-0.5 text-white">
                {ncrSelected?.id ? `Edit NCR — ${ncrSelected.ncr_number}` : 'New Non-Conformance Incident Report'}
              </h2>
            </div>
            <button
              onClick={() => { setNcrView('list'); setNcrSelected(null); }}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Stepper Nav */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
            <div className="flex items-center justify-between">
              {[
                { step: 1, label: '1. Incident Details' },
                { step: 2, label: '2. Root Cause (RCA)' },
                { step: 3, label: '3. CAPA Plan' },
                { step: 4, label: '4. Manager Sign-off' },
              ].map((s) => (
                <button
                  key={s.step}
                  onClick={() => setFormStep(s.step)}
                  className={`flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-all ${
                    formStep === s.step ? 'text-blue-600 font-bold' : formStep > s.step ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    formStep === s.step ? 'bg-blue-600 text-white' : formStep > s.step ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {formStep > s.step ? '✓' : s.step}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleNCRSubmit} className="p-6 space-y-5 text-xs">
            
            {/* STEP 1 */}
            {formStep === 1 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Step 1: Non-Conformance Incident Identification</h3>
                  <p className="text-xs text-slate-500">Record occurrence timestamp, section unit, category, and severity.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">NCR Reference</label>
                    <input
                      type="text"
                      readOnly
                      value={ncrSelected?.ncr_number || 'Auto-generated'}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono font-bold cursor-not-allowed text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Date & Time <span className="text-rose-500">*</span></label>
                    <input
                      type="datetime-local"
                      required
                      value={ncrForm.occurred_at}
                      onChange={e => handleNCRFieldChange('occurred_at', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-medium text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Staff Member Recording <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={ncrForm.recorded_by}
                      onChange={e => handleNCRFieldChange('recorded_by', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 text-slate-900 font-medium text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Unit / Section <span className="text-rose-500">*</span></label>
                    <select
                      required
                      value={ncrForm.unit}
                      onChange={e => handleNCRFieldChange('unit', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 text-slate-900 text-xs"
                    >
                      {['Hematology','Biochemistry','Microbiology','Serology / Immunology','Molecular / PCR','Coagulation','Urinalysis','Blood Bank','Reception / Pre-Analytical','Quality Control','General Laboratory','Administration'].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">NC Category</label>
                    <select
                      value={ncrForm.nc_category}
                      onChange={e => handleNCRFieldChange('nc_category', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 text-slate-900 text-xs"
                    >
                      {['Pre-analytical','Analytical','Post-analytical','Administrative','Equipment / Instrumentation','Reagent / Consumable','Personnel','Facility / Environment'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Significance Level</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleNCRFieldChange('significance', 'minor')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        ncrForm.significance === 'minor'
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-xs font-bold">Minor Non-Conformance</p>
                      <p className="text-[10px] text-slate-500 font-normal">Isolated procedural discrepancy with low clinical risk</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNCRFieldChange('significance', 'major')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        ncrForm.significance === 'major'
                          ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-xs font-bold text-rose-700">Major Non-Conformance</p>
                      <p className="text-[10px] text-rose-600 font-normal">Critical breakdown affecting diagnostic outcome or safety</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Description <span className="text-rose-500">*</span></label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide details on the non-conforming event..."
                    value={ncrForm.description}
                    onChange={e => handleNCRFieldChange('description', e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 text-slate-900 text-xs"
                  />
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {formStep === 2 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Step 2: Root Cause Analysis (RCA)</h3>
                  <p className="text-xs text-slate-500">Methodology used and findings from the quality investigation.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1.5">RCA Methodology</label>
                  <div className="flex flex-wrap gap-2">
                    {['5 Whys', 'Fishbone / Ishikawa', 'Brainstorming', 'Process Mapping', 'Audit Inspection'].map(m => {
                      const isSel = Array.isArray(ncrForm.rca_method) && ncrForm.rca_method.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleNCRRcaToggle(m)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            isSel ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isSel ? '✓ ' : '+ '}{m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">RCA Investigation Findings</label>
                  <textarea
                    rows={4}
                    placeholder="Document root causes identified..."
                    value={ncrForm.rca_results}
                    onChange={e => handleNCRFieldChange('rca_results', e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Immediate Containment Action</label>
                  <textarea
                    rows={3}
                    placeholder="Immediate action taken to contain the issue..."
                    value={ncrForm.immediate_action}
                    onChange={e => handleNCRFieldChange('immediate_action', e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 text-slate-900 text-xs"
                  />
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {formStep === 3 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Step 3: Corrective & Preventive Action Plan (CAPA)</h3>
                  <p className="text-xs text-slate-500">Actionee responsibility and preventive measures.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Assigned Actionee</label>
                    <input
                      type="text"
                      placeholder="Name of assigned staff"
                      value={ncrForm.assigned_to_name}
                      onChange={e => handleNCRFieldChange('assigned_to_name', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Target Completion Date</label>
                    <input
                      type="date"
                      value={ncrForm.target_completion}
                      onChange={e => handleNCRFieldChange('target_completion', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">CAPA Action Plan</label>
                  <textarea
                    rows={4}
                    placeholder="Preventive steps to avoid recurrence..."
                    value={ncrForm.corrective_actions}
                    onChange={e => handleNCRFieldChange('corrective_actions', e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Audit Monitoring Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Audit verification plan..."
                    value={ncrForm.monitoring_notes}
                    onChange={e => handleNCRFieldChange('monitoring_notes', e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 text-slate-900 text-xs"
                  />
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {formStep === 4 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Step 4: Management Review & Quality Manager Approval</h3>
                  <p className="text-xs text-slate-500">Lab Manager reviews the NCR. Quality Manager grants final approval and closure.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Lab Manager REVIEW */}
                  <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                        <UserCheck size={14} className="text-blue-600" /> Reviewed by Laboratory Manager
                      </label>
                      <button
                        type="button"
                        onClick={() => handleNCRFieldChange('reviewed_by_lab_manager', `${user?.full_name || 'Lab Manager'} (${new Date().toLocaleDateString('en-GB')})`)}
                        className="px-2.5 py-1 bg-blue-600 text-white rounded-md font-bold text-[10px] hover:bg-blue-700 cursor-pointer shadow-2xs"
                      >
                        Stamp Review
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Lab Manager review stamp"
                      value={ncrForm.reviewed_by_lab_manager}
                      onChange={e => handleNCRFieldChange('reviewed_by_lab_manager', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-blue-950 font-bold text-xs"
                    />
                  </div>

                  {/* Quality Manager APPROVAL */}
                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                        <Stamp size={14} className="text-emerald-600" /> Approved by Quality Manager
                      </label>
                      <button
                        type="button"
                        onClick={() => handleNCRFieldChange('approved_by_qm', `${user?.full_name || 'Quality Manager'} (${new Date().toLocaleDateString('en-GB')})`)}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded-md font-bold text-[10px] hover:bg-emerald-700 cursor-pointer shadow-2xs"
                      >
                        Stamp Approval
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Quality Manager approval stamp"
                      value={ncrForm.approved_by_qm}
                      onChange={e => handleNCRFieldChange('approved_by_qm', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-emerald-950 font-bold text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">NCR Record Status</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { status: 'open', label: 'Open (Logging)' },
                      { status: 'in_progress', label: 'In Progress (CAPA)' },
                      { status: 'closed', label: 'Closed (Approved)' },
                    ].map(st => (
                      <button
                        key={st.status}
                        type="button"
                        onClick={() => handleNCRFieldChange('status', st.status)}
                        className={`p-3 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                          ncrForm.status === st.status
                            ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Nav Buttons */}
            <div className="flex items-center justify-between pt-5 border-t border-slate-100">
              {formStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setFormStep(prev => prev - 1)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                {formStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setFormStep(prev => prev + 1)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    Next Step <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={ncrSubmitting}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save size={15} /> {ncrSubmitting ? 'Saving...' : 'Save & Submit Report'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── DETAIL MODAL VIEW WITH STAMPS ── */}
      {ncrView === 'detail' && ncrSelected && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full overflow-hidden space-y-0 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {ncrSelected.unit}
                </span>
                <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                  {ncrSelected.ncr_number}
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-sans font-bold ${
                    ncrSelected.status === 'closed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {ncrSelected.status.toUpperCase()}
                  </span>
                </h2>
              </div>
              <button
                onClick={() => setNcrView('list')}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto text-xs flex-1">
              
              {/* Stepper Progress */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quality Audit Workflow Progress</p>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                  <div className="p-2 bg-slate-800 text-white rounded-lg">1. Logged</div>
                  <div className={`p-2 rounded-lg ${ncrSelected.rca_results ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'}`}>2. RCA Set</div>
                  <div className={`p-2 rounded-lg ${(ncrSelected.reviewed_by_lab_manager || ncrSelected.verified_by_lab_manager) ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>3. LM Reviewed</div>
                  <div className={`p-2 rounded-lg ${(ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm) ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>4. QM Approved</div>
                </div>
              </div>

              {/* Grid Data */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Occurrence Date</span>
                  <p className="font-semibold text-slate-900">{ncrSelected.occurred_at ? new Date(ncrSelected.occurred_at).toLocaleString('en-GB') : '—'}</p>
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
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Incident Description</span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-normal leading-relaxed">
                  {ncrSelected.description || 'No detailed description provided.'}
                </div>
              </div>

              {/* RCA */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Root Cause Analysis (RCA)</span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 space-y-1">
                  <p className="text-[10px] font-bold text-blue-700">Methodology: {ncrSelected.rca_method || '5 Whys'}</p>
                  <p>{ncrSelected.rca_results || 'RCA investigation notes pending.'}</p>
                </div>
              </div>

              {/* CAPA Plan */}
              {ncrSelected.corrective_actions && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Corrective & Preventive Action Plan (CAPA)</span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 space-y-1">
                    <p className="text-[10px] font-bold text-slate-700">Actionee: {ncrSelected.assigned_to_name || 'Unassigned'} | Target: {ncrSelected.target_completion || 'Immediate'}</p>
                    <p>{ncrSelected.corrective_actions}</p>
                  </div>
                </div>
              )}

              {/* ── OFFICIAL DIGITAL STAMPS SECTION ── */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Official Verification & Approval Stamps</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* LAB MANAGER REVIEW STAMP */}
                  <div className={`p-4 rounded-xl border relative overflow-hidden ${
                    ncrSelected.reviewed_by_lab_manager || ncrSelected.verified_by_lab_manager
                      ? 'bg-blue-50/80 border-blue-300 text-blue-950'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Lab Manager Review</span>
                      <UserCheck size={16} className={ncrSelected.reviewed_by_lab_manager || ncrSelected.verified_by_lab_manager ? 'text-blue-600' : 'text-slate-300'} />
                    </div>
                    {ncrSelected.reviewed_by_lab_manager || ncrSelected.verified_by_lab_manager ? (
                      <div className="space-y-0.5">
                        <div className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-blue-600 text-white mb-1">
                          REVIEWED BY LAB MANAGER
                        </div>
                        <p className="font-bold text-xs">{ncrSelected.reviewed_by_lab_manager || ncrSelected.verified_by_lab_manager}</p>
                      </div>
                    ) : (
                      <p className="text-xs italic">Pending Lab Manager Review</p>
                    )}
                  </div>

                  {/* QUALITY MANAGER APPROVAL STAMP */}
                  <div className={`p-4 rounded-xl border relative overflow-hidden ${
                    ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Quality Manager Approval</span>
                      <Stamp size={16} className={ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm ? 'text-emerald-600' : 'text-slate-300'} />
                    </div>
                    {ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm ? (
                      <div className="space-y-0.5">
                        <div className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-emerald-600 text-white mb-1">
                          APPROVED BY QUALITY MANAGER
                        </div>
                        <p className="font-bold text-xs">{ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm}</p>
                      </div>
                    ) : (
                      <p className="text-xs italic">Pending Quality Manager Approval</p>
                    )}
                  </div>

                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Lab Manager Review Action */}
                {!(ncrSelected.reviewed_by_lab_manager || ncrSelected.verified_by_lab_manager) && ncrSelected.status !== 'closed' && (
                  <button
                    onClick={() => handleLabManagerReviewStamp(ncrSelected)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <UserCheck size={14} /> Stamp Lab Manager Review
                  </button>
                )}

                {/* Quality Manager Approval Action */}
                {(ncrSelected.reviewed_by_lab_manager || ncrSelected.verified_by_lab_manager) && !(ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm) && ncrSelected.status !== 'closed' && (
                  <button
                    onClick={() => handleQMApprovalStamp(ncrSelected)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Stamp size={14} /> Stamp QM Approval & Close
                  </button>
                )}

                {/* PDF Export Button */}
                {(ncrSelected.status === 'closed' || ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm) && (
                  <button
                    onClick={() => handleExportPDF(ncrSelected)}
                    disabled={exportingPdf}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download size={14} /> {exportingPdf ? 'Exporting...' : 'Export Minimalist PDF'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNCREdit(ncrSelected)}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
                >
                  Edit Form
                </button>
                <button
                  onClick={() => setNcrView('list')}
                  className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── HIDDEN A4 PDF PRINT/EXPORT TEMPLATE ── */}
      {ncrSelected && (
        <div className="hidden">
          <div
            id="ncr-pdf-document-template"
            ref={pdfTemplateRef}
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: '18mm 16mm',
              fontFamily: 'Arial, sans-serif',
              fontSize: '11px',
              color: '#0f172a',
              backgroundColor: '#ffffff'
            }}
            className="space-y-5 leading-relaxed"
          >
            {/* Header Banner */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
              <div>
                <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">NON-CONFORMANCE REPORT (NCR)</h1>
                <p className="text-xs text-slate-600 font-semibold">ISO 15189:2022 Quality Management Standard</p>
                <p className="text-[10px] text-slate-500">Document Ref: LEG/PATHLAB/MSD/FM-12-VERS-004</p>
              </div>
              <div className="text-right">
                <div className="inline-block px-3 py-1 bg-slate-900 text-white font-mono font-bold text-sm rounded">
                  {ncrSelected.ncr_number}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">STATUS: {ncrSelected.status?.toUpperCase() || 'CLOSED'}</p>
              </div>
            </div>

            {/* Section 1: Non-Conformance Identification */}
            <div className="border border-slate-300 rounded p-3 space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                1. Incident Identification & Details
              </h2>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div><strong className="text-slate-600">Date/Time:</strong> {ncrSelected.occurred_at ? new Date(ncrSelected.occurred_at).toLocaleString('en-GB') : '—'}</div>
                <div><strong className="text-slate-600">Unit/Section:</strong> {ncrSelected.unit}</div>
                <div><strong className="text-slate-600">Recorded By:</strong> {ncrSelected.recorded_by}</div>
                <div><strong className="text-slate-600">NC Category:</strong> {ncrSelected.nc_category || 'Pre-analytical'}</div>
                <div><strong className="text-slate-600">Significance:</strong> {ncrSelected.significance?.toUpperCase()}</div>
                <div><strong className="text-slate-600">Staff Assigned:</strong> {ncrSelected.assigned_to_name || 'Laboratory Staff'}</div>
              </div>
            </div>

            {/* Section 2: Description */}
            <div className="border border-slate-300 rounded p-3 space-y-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                2. Incident Description & Observation
              </h2>
              <p className="text-[11px] text-slate-800 whitespace-pre-wrap pt-1">
                {ncrSelected.description || 'No description recorded.'}
              </p>
            </div>

            {/* Section 3: RCA */}
            <div className="border border-slate-300 rounded p-3 space-y-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                3. Root Cause Analysis (RCA) & Immediate Action
              </h2>
              <p className="text-[10px] font-bold text-slate-700">RCA Methodology: {ncrSelected.rca_method || '5 Whys'}</p>
              <p className="text-[11px] text-slate-800 pt-1">{ncrSelected.rca_results || 'RCA investigation completed.'}</p>
              {ncrSelected.immediate_action && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <strong className="text-[10px] text-slate-600 block">Immediate Containment Action:</strong>
                  <p className="text-[11px] text-slate-800">{ncrSelected.immediate_action}</p>
                </div>
              )}
            </div>

            {/* Section 4: CAPA */}
            <div className="border border-slate-300 rounded p-3 space-y-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                4. Corrective & Preventive Action Plan (CAPA)
              </h2>
              <p className="text-[11px] text-slate-800 pt-1">{ncrSelected.corrective_actions || 'CAPA plan established.'}</p>
              {ncrSelected.monitoring_notes && (
                <p className="text-[10px] text-slate-600 pt-1"><strong>Audit Monitoring:</strong> {ncrSelected.monitoring_notes}</p>
              )}
            </div>

            {/* Section 5: Official Stamps */}
            <div className="pt-4 border-t-2 border-slate-900 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                5. Quality Management Sign-off & Official Stamps
              </h2>
              <div className="grid grid-cols-2 gap-4 pt-1">
                
                {/* LAB MANAGER STAMP */}
                <div className="border-2 border-blue-800 p-3 rounded text-center space-y-1">
                  <div className="text-[10px] font-bold text-blue-900 uppercase tracking-widest border-b border-blue-300 pb-1">
                    REVIEWED BY LABORATORY MANAGER
                  </div>
                  <p className="text-xs font-bold text-blue-950 pt-1">
                    {ncrSelected.reviewed_by_lab_manager || ncrSelected.verified_by_lab_manager || 'Reviewed by Laboratory Manager'}
                  </p>
                  <p className="text-[9px] text-slate-500">ISO 15189 Quality Review Stamp</p>
                </div>

                {/* QUALITY MANAGER STAMP */}
                <div className="border-2 border-emerald-800 p-3 rounded text-center space-y-1">
                  <div className="text-[10px] font-bold text-emerald-900 uppercase tracking-widest border-b border-emerald-300 pb-1">
                    APPROVED BY QUALITY MANAGER
                  </div>
                  <p className="text-xs font-bold text-emerald-950 pt-1">
                    {ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm || 'Approved by Quality Manager'}
                  </p>
                  <p className="text-[9px] text-slate-500">ISO 15189 Quality Approval Stamp</p>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="pt-6 text-center text-[9px] text-slate-400 border-t border-slate-200">
              This document is an official Quality Management Record generated by LC Reporting Portal under ISO 15189:2022 guidelines.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
