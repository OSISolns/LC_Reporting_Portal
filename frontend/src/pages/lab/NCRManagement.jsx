import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertOctagon, TrendingUp, Clock, AlertTriangle, ListChecks,
  Search, FilePlus2, RefreshCw, Pencil, Trash2, X, CheckCircle2,
  Shield, Save, ArrowRight, ArrowLeft, UserCheck,
  ShieldCheck, FileText, Download, Stamp, Eye, Lock
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function NCRManagement() {
  const { user } = useAuth();
  const pdfTemplateRef = useRef(null);

  // ── ROLE-BASED ACCESS CONTROL (RBAC) CALCULATIONS ─────────────────────────
  const userRole = (user?.role || '').toLowerCase();
  const adminOrExec = ['admin', 'deputy_coo', 'coo', 'general_manager'];

  // Can perform Lab Manager Review
  const canReviewLM = adminOrExec.includes(userRole) ||
    ['lab_manager', 'lab_lead', 'lab_team_lead', 'lab_head'].includes(userRole);

  // Can perform Quality Manager Approval & Final Closure
  const canApproveQM = adminOrExec.includes(userRole) ||
    ['quality_manager', 'qm'].includes(userRole);

  // Can delete NCR records
  const canDeleteNCR = adminOrExec.includes(userRole) ||
    ['quality_manager', 'qm', 'lab_manager', 'lab_lead', 'lab_head'].includes(userRole);

  // Check edit capability for a given NCR (Closed NCRs must NEVER be edited)
  const canEditNCR = (ncr) => {
    if (!ncr) return true; // New NCR creation
    if (ncr.status === 'closed') return false; // Closed NCRs must NEVER be edited by anyone!
    if (adminOrExec.includes(userRole)) return true;
    if (canReviewLM || canApproveQM) return true;
    // Creator can edit their own report if open
    return Boolean(user?.full_name && ncr.recorded_by === user.full_name);
  };

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
      const errMsg = err.response?.data?.message || 'Failed to save NCR.';
      toast.error(errMsg);
    } finally {
      setNcrSubmitting(false);
    }
  };

  const handleNCREdit = (ncr) => {
    if (!canEditNCR(ncr)) {
      toast.error('Access Denied: You do not have permission to edit this NCR.');
      return;
    }
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
    if (!canDeleteNCR) {
      toast.error('Access Denied: Only Quality Managers, Lab Managers, and Administrators can delete NCR records.');
      return;
    }
    if (!window.confirm(`Permanently delete NCR ${ncrNumber}? This action cannot be undone.`)) return;
    try {
      await api.delete(`/lab/ncr/${id}`);
      toast.success(`NCR ${ncrNumber} deleted.`);
      fetchNCRs();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to delete NCR.';
      toast.error(errMsg);
    }
  };

  // Manager Actions:
  // 1. Lab Manager REVIEWS
  const handleLabManagerReviewStamp = async (ncr) => {
    if (!canReviewLM) {
      toast.error('Access Denied: Only Laboratory Managers and Authorized Leadership can stamp Lab Manager Review.');
      return;
    }
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
      const errMsg = err.response?.data?.message || 'Failed to update Lab Manager Review.';
      toast.error(errMsg);
    }
  };

  // 2. Quality Manager APPROVES (Final Closure)
  const handleQMApprovalStamp = async (ncr) => {
    if (!canApproveQM) {
      toast.error('Access Denied: Only Quality Managers and Authorized Leadership can approve and close NCR reports.');
      return;
    }
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
      const errMsg = err.response?.data?.message || 'Failed to approve and close NCR.';
      toast.error(errMsg);
    }
  };

  // Professional Multi-page ISO 15189 Executive PDF Exporter Function
  const handleExportPDF = async (ncrTarget) => {
    const targetNCR = ncrTarget || ncrSelected;
    if (!targetNCR) return;

    setExportingPdf(true);
    toast.loading('Generating executive ISO 15189 PDF report...', { id: 'ncr-pdf-toast' });
    try {
      const element = document.getElementById('ncr-pdf-document-template');
      if (!element) throw new Error('PDF Template container not found');

      // Render off-screen canvas at 300 DPI equivalent scale
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Handle multi-page overflow cleanly if document content spans beyond single page
      while (heightLeft > 5) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      pdf.save(`NCR_${targetNCR.ncr_number || 'Report'}_ISO15189.pdf`);
      toast.success('ISO 15189 NCR PDF exported successfully.', { id: 'ncr-pdf-toast' });
    } catch (err) {
      console.error('PDF export failed:', err);
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

  // 4-Stage Progress Helper
  const getNcrProgressStep = (ncr) => {
    const qmApproved = Boolean(ncr.approved_by_qm || ncr.reviewed_by_qm);
    const lmReviewed = Boolean(ncr.reviewed_by_lab_manager || ncr.verified_by_lab_manager);

    if (ncr.status === 'closed' || qmApproved) return 4; // Quality Manager Approved
    if (lmReviewed) return 3; // Lab Manager Reviewed
    if (ncr.rca_results || ncr.corrective_actions) return 2; // RCA & CAPA Set
    return 1; // Logged / Reported
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-800 antialiased bg-slate-50/50 min-h-screen">
      
      {/* ── EXECUTIVE BLUE HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1B669E] p-6 rounded-2xl text-white shadow-xs border border-[#155280]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-800/80 rounded-xl border border-blue-700">
              <AlertOctagon className="text-blue-100" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Non-Conformance Management (NCR)
                <span className="text-[10px] font-medium bg-blue-800/80 text-blue-200 border border-blue-700 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  ISO 15189:2022
                </span>
              </h1>
              <p className="text-xs text-blue-200/80 font-normal">
                Lumina Quality Audit Suite — Ref: LEG/PATHLAB/MSD/FM-12-VERS-004
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
              className="flex-1 sm:flex-none px-4 py-2 bg-[#155280] hover:bg-[#114266] text-white font-semibold text-xs rounded-xl border border-[#114266] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-98"
            >
              <FilePlus2 size={15} /> New NCR Report
            </button>
          ) : (
            <button
              onClick={() => { setNcrView('list'); setNcrSelected(null); }}
              className="flex-1 sm:flex-none px-4 py-2 bg-[#155280] hover:bg-[#114266] text-blue-100 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#114266]"
            >
              <ListChecks size={15} /> View Register
            </button>
          )}
          <button
            onClick={fetchNCRs}
            className="p-2 text-white/80 hover:text-white hover:bg-[#155280] rounded-xl transition-all cursor-pointer border border-[#155280]"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={ncrLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS (LOW COLOR PALETTE) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'NCRs Registered',
            value: ncrKpi.totalThisMonth ?? 0,
            sub: `${ncrKpi.totalAllTime ?? 0} total cases`,
            icon: <AlertOctagon size={18} className="text-slate-600" />,
          },
          {
            label: 'Completion Rate',
            value: `${ncrKpi.pctCompleted ?? 0}%`,
            sub: `${ncrKpi.closedThisMonth ?? 0} closed this month`,
            icon: <TrendingUp size={18} className="text-slate-700" />,
          },
          {
            label: 'Active Open Cases',
            value: ncrKpi.openCount ?? 0,
            sub: `${ncrKpi.inProgressCount ?? 0} in progress`,
            icon: <Clock size={18} className="text-slate-600" />,
          },
          {
            label: 'Overdue (>30 Days)',
            value: ncrKpi.overdueCount ?? 0,
            sub: 'Requires CAPA escalation',
            icon: <AlertTriangle size={18} className="text-slate-700" />,
          },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label}</span>
              {k.icon}
            </div>
            <p className="text-2xl font-bold tracking-tight text-slate-900">{k.value}</p>
            <p className="text-[11px] text-slate-500 font-normal">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── MANAGER WORKFLOW PROGRESS TRACKER ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="text-slate-700" size={18} />
              Quality Audit Pipeline & Work Queues
            </h2>
            <p className="text-xs text-slate-500">
              Lab Manager Review ➔ Quality Manager Final Approval
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setNcrQueueFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                ncrQueueFilter === 'all' ? 'bg-blue-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({ncrList.length})
            </button>
            <button
              onClick={() => setNcrQueueFilter('lm_pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 border ${
                ncrQueueFilter === 'lm_pending'
                  ? 'bg-blue-800 text-white border-blue-800 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <UserCheck size={13} />
              Pending Lab Manager Review ({pendingLmReviews.length})
            </button>
            <button
              onClick={() => setNcrQueueFilter('qm_pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 border ${
                ncrQueueFilter === 'qm_pending'
                  ? 'bg-blue-800 text-white border-blue-800 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
            <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
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
              <span className="text-xs bg-slate-100 text-slate-600 rounded-md px-2.5 py-0.5 font-semibold border border-slate-200">
                {filteredNCRs.length} records
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Status Filter Chips */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                {['all','open','in_progress','closed'].map(s => (
                  <button
                    key={s}
                    onClick={() => setNcrStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize cursor-pointer transition-all ${
                      ncrStatusFilter === s ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
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
                  <th className="py-3 px-4 w-32">NCR Number</th>
                  <th className="py-3 px-4 w-36">Date / Time</th>
                  <th className="py-3 px-4 w-36">Unit</th>
                  <th className="py-3 px-4 w-36">Category</th>
                  <th className="py-3 px-4 w-28">Significance</th>
                  <th className="py-3 px-4 w-36">Recorded By</th>
                  <th className="py-3 px-4 w-32">Lifecycle Step</th>
                  <th className="py-3 px-4 w-28">Status</th>
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
                        className="mt-2 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer underline"
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
                    in_progress: { label: 'In Progress', cls: 'bg-slate-200 text-slate-800 border-slate-300' },
                    closed:      { label: 'Closed / Approved', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                  }[ncr.status] || { label: ncr.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };

                  const canEditThis = canEditNCR(ncr);

                  return (
                    <tr key={ncr.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-950">
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
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-medium capitalize border ${
                          ncr.significance === 'major' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-blue-50 text-blue-800 border-blue-200'
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
                                  ? s === 4 ? 'w-5 bg-emerald-700' : s === 3 ? 'w-5 bg-blue-800' : 'w-5 bg-blue-600'
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
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1-Click Role-gated Stamps */}
                          {!lmReviewed && ncr.status !== 'closed' && (
                            <button
                              onClick={() => handleLabManagerReviewStamp(ncr)}
                              disabled={!canReviewLM}
                              className={`px-2.5 py-1 font-bold text-[10px] rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                canReviewLM
                                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-300 shadow-2xs'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                              }`}
                              title={canReviewLM ? "Stamp Lab Manager Review" : "Requires Lab Manager or Executive Role"}
                            >
                              {canReviewLM ? <UserCheck size={11} /> : <Lock size={10} />} LM Review
                            </button>
                          )}
                          {lmReviewed && !qmApproved && ncr.status !== 'closed' && (
                            <button
                              onClick={() => handleQMApprovalStamp(ncr)}
                              disabled={!canApproveQM}
                              className={`px-2.5 py-1 font-bold text-[10px] rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                canApproveQM
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                              }`}
                              title={canApproveQM ? "Stamp Quality Manager Approval & Closure" : "Requires Quality Manager Role"}
                            >
                              {canApproveQM ? <Stamp size={11} /> : <Lock size={10} />} QM Approve
                            </button>
                          )}

                          {/* PDF Export for Closed / Approved NCRs */}
                          {(ncr.status === 'closed' || qmApproved) && (
                            <button
                              onClick={() => handleExportPDF(ncr)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                              title="Export ISO 15189 Executive PDF"
                            >
                              <Download size={14} />
                            </button>
                          )}

                          <button
                            onClick={() => handleNCRViewDetail(ncr)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                            title="View Record Summary"
                          >
                            <Eye size={14} />
                          </button>
                          
                          {canEditThis ? (
                            <button
                              onClick={() => handleNCREdit(ncr)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                              title="Edit Form"
                            >
                              <Pencil size={14} />
                            </button>
                          ) : (
                            <span className="p-1.5 text-slate-300 cursor-not-allowed" title="Editing Restricted for your Role / Status">
                              <Lock size={14} />
                            </span>
                          )}

                          {canDeleteNCR && (
                            <button
                              onClick={() => handleNCRDelete(ncr.id, ncr.ncr_number)}
                              className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              title="Delete NCR Record"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
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
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden max-w-3xl mx-auto space-y-0">
          
          {/* Header */}
          <div className="bg-[#1B669E] p-5 text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] font-medium text-blue-200 uppercase tracking-wider">
                ISO 15189:2022 | Ref: LEG/PATHLAB/MSD/FM-12-VERS-004
              </span>
              <h2 className="text-base font-bold mt-0.5 text-white">
                {ncrSelected?.id ? `Edit NCR — ${ncrSelected.ncr_number}` : 'New Non-Conformance Incident Report'}
              </h2>
            </div>
            <button
              onClick={() => { setNcrView('list'); setNcrSelected(null); }}
              className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-800 rounded-lg cursor-pointer transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Stepper Nav */}
          <div className="bg-blue-50/50 border-b border-slate-200 px-6 py-3">
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
                    formStep === s.step ? 'text-blue-950 font-bold' : formStep > s.step ? 'text-blue-800' : 'text-slate-400'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    formStep === s.step ? 'bg-blue-900 text-white' : formStep > s.step ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-500'
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
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-medium text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Staff Member Recording <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={ncrForm.recorded_by}
                      onChange={e => handleNCRFieldChange('recorded_by', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 text-slate-900 font-medium text-xs"
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
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 text-slate-900 text-xs"
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
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 text-slate-900 text-xs"
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
                          ? 'border-slate-800 bg-slate-50 text-slate-900 font-bold'
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
                          ? 'border-rose-300 bg-rose-50/60 text-rose-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-xs font-bold text-rose-800">Major Non-Conformance</p>
                      <p className="text-[10px] text-rose-700 font-normal">Critical breakdown affecting diagnostic outcome or safety</p>
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
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 text-slate-900 text-xs"
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
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Immediate Containment Action</label>
                  <textarea
                    rows={3}
                    placeholder="Immediate action taken to contain the issue..."
                    value={ncrForm.immediate_action}
                    onChange={e => handleNCRFieldChange('immediate_action', e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 text-slate-900 text-xs"
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
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Audit Monitoring Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Audit verification plan..."
                    value={ncrForm.monitoring_notes}
                    onChange={e => handleNCRFieldChange('monitoring_notes', e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 text-slate-900 text-xs"
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
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                        <UserCheck size={14} className="text-slate-700" /> Reviewed by Laboratory Manager
                      </label>
                      <button
                        type="button"
                        disabled={!canReviewLM}
                        onClick={() => {
                          if (!canReviewLM) {
                            toast.error('Requires Lab Manager or Leadership Role');
                            return;
                          }
                          handleNCRFieldChange('reviewed_by_lab_manager', `${user?.full_name || 'Lab Manager'} (${new Date().toLocaleDateString('en-GB')})`);
                        }}
                        className={`px-2.5 py-1 text-white rounded-md font-bold text-[10px] cursor-pointer shadow-2xs ${
                          canReviewLM ? 'bg-slate-900 hover:bg-slate-800' : 'bg-slate-400 cursor-not-allowed'
                        }`}
                      >
                        Stamp Review
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Lab Manager review stamp"
                      value={ncrForm.reviewed_by_lab_manager}
                      onChange={e => handleNCRFieldChange('reviewed_by_lab_manager', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-950 font-bold text-xs"
                    />
                  </div>

                  {/* Quality Manager APPROVAL */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                        <Stamp size={14} className="text-slate-700" /> Approved by Quality Manager
                      </label>
                      <button
                        type="button"
                        disabled={!canApproveQM}
                        onClick={() => {
                          if (!canApproveQM) {
                            toast.error('Requires Quality Manager Role');
                            return;
                          }
                          handleNCRFieldChange('approved_by_qm', `${user?.full_name || 'Quality Manager'} (${new Date().toLocaleDateString('en-GB')})`);
                        }}
                        className={`px-2.5 py-1 text-white rounded-md font-bold text-[10px] cursor-pointer shadow-2xs ${
                          canApproveQM ? 'bg-slate-900 hover:bg-slate-800' : 'bg-slate-400 cursor-not-allowed'
                        }`}
                      >
                        Stamp Approval
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Quality Manager approval stamp"
                      value={ncrForm.approved_by_qm}
                      onChange={e => handleNCRFieldChange('approved_by_qm', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-950 font-bold text-xs"
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
                    ].map(st => {
                      const isDisabled = st.status === 'closed' && !canApproveQM;
                      return (
                        <button
                          key={st.status}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleNCRFieldChange('status', st.status)}
                          className={`p-3 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                            ncrForm.status === st.status
                              ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                              : isDisabled
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {st.label}
                        </button>
                      );
                    })}
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
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    Next Step <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={ncrSubmitting}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
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
            <div className="bg-[#1B669E] p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                  {ncrSelected.unit}
                </span>
                <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                  {ncrSelected.ncr_number}
                  <span className={`text-xs px-2.5 py-0.5 rounded-md font-sans font-bold border ${
                    ncrSelected.status === 'closed'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-blue-800 text-blue-100 border-blue-700'
                  }`}>
                    {ncrSelected.status.toUpperCase()}
                  </span>
                </h2>
              </div>
              <button
                onClick={() => setNcrView('list')}
                className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto text-xs flex-1">
              
              {/* Stepper Progress */}
              <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-200 space-y-1.5">
                <p className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">Quality Audit Workflow Progress</p>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                  <div className="p-2 bg-blue-900 text-white rounded-lg">1. Logged</div>
                  <div className={`p-2 rounded-lg ${ncrSelected.rca_results ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-500'}`}>2. RCA Set</div>
                  <div className={`p-2 rounded-lg ${(ncrSelected.reviewed_by_lab_manager || ncrSelected.verified_by_lab_manager) ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-500'}`}>3. LM Reviewed</div>
                  <div className={`p-2 rounded-lg ${(ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm) ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-500'}`}>4. QM Approved</div>
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
                  <p className={`font-semibold capitalize ${ncrSelected.significance === 'major' ? 'text-rose-700' : 'text-slate-800'}`}>
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
                  <p className="text-[10px] font-bold text-slate-700">Methodology: {ncrSelected.rca_method || '5 Whys'}</p>
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
                      ? 'bg-blue-50/80 border-blue-300 text-blue-950 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    {(ncrSelected.reviewed_by_lab_manager || ncrSelected.verified_by_lab_manager) && (
                      <img
                        src="/stamps/verified.png"
                        alt="REVIEWED"
                        className="absolute right-2 -bottom-2 w-28 h-auto opacity-20 transform -rotate-12 pointer-events-none"
                      />
                    )}
                    <div className="flex items-center justify-between mb-1 relative z-10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900">Lab Manager Review Stamp</span>
                      <UserCheck size={16} className={ncrSelected.reviewed_by_lab_manager || ncrSelected.verified_by_lab_manager ? 'text-blue-900' : 'text-slate-300'} />
                    </div>
                    {ncrSelected.reviewed_by_lab_manager || ncrSelected.verified_by_lab_manager ? (
                      <div className="space-y-0.5 relative z-10">
                        <div className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-blue-900 text-white mb-1">
                          REVIEWED BY LAB MANAGER
                        </div>
                        <p className="font-bold text-xs text-blue-950">{ncrSelected.reviewed_by_lab_manager || ncrSelected.verified_by_lab_manager}</p>
                        <p className="text-[9px] text-blue-700 font-mono">ISO 15189 Verified Review Stamp</p>
                      </div>
                    ) : (
                      <p className="text-xs italic">Pending Lab Manager Review</p>
                    )}
                  </div>

                  {/* QUALITY MANAGER APPROVAL STAMP */}
                  <div className={`p-4 rounded-xl border relative overflow-hidden ${
                    ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm || ncrSelected.status === 'closed'
                      ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    {(ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm || ncrSelected.status === 'closed') && (
                      <img
                        src="/stamps/approved.png"
                        alt="APPROVED"
                        className="absolute right-2 -bottom-2 w-28 h-auto opacity-25 transform -rotate-12 pointer-events-none"
                      />
                    )}
                    <div className="flex items-center justify-between mb-1 relative z-10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">Quality Manager Approval Stamp</span>
                      <Stamp size={16} className={ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm || ncrSelected.status === 'closed' ? 'text-emerald-800' : 'text-slate-300'} />
                    </div>
                    {ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm || ncrSelected.status === 'closed' ? (
                      <div className="space-y-0.5 relative z-10">
                        <div className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-emerald-800 text-white mb-1">
                          APPROVED BY QUALITY MANAGER
                        </div>
                        <p className="font-bold text-xs text-emerald-950">{ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm || 'Approved by Quality Manager'}</p>
                        <p className="text-[9px] text-emerald-700 font-mono">ISO 15189 Quality Approval Seal</p>
                      </div>
                    ) : (
                      <p className="text-xs italic">Pending Quality Manager Approval</p>
                    )}
                  </div>

                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {/* Lab Manager Review Action */}
                {!(ncrSelected.reviewed_by_lab_manager || ncrSelected.verified_by_lab_manager) && ncrSelected.status !== 'closed' && (
                  <button
                    onClick={() => handleLabManagerReviewStamp(ncrSelected)}
                    disabled={!canReviewLM}
                    className={`px-3.5 py-2 font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                      canReviewLM ? 'bg-blue-900 hover:bg-blue-800 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {canReviewLM ? <UserCheck size={14} /> : <Lock size={14} />} Stamp Lab Manager Review
                  </button>
                )}

                {/* Quality Manager Approval Action */}
                {(ncrSelected.reviewed_by_lab_manager || ncrSelected.verified_by_lab_manager) && !(ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm) && ncrSelected.status !== 'closed' && (
                  <button
                    onClick={() => handleQMApprovalStamp(ncrSelected)}
                    disabled={!canApproveQM}
                    className={`px-3.5 py-2 font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                      canApproveQM ? 'bg-emerald-800 hover:bg-emerald-900 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {canApproveQM ? <Stamp size={14} /> : <Lock size={14} />} Stamp QM Approval & Close
                  </button>
                )}

                {/* PDF Export Button */}
                {(ncrSelected.status === 'closed' || ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm) && (
                  <button
                    onClick={() => handleExportPDF(ncrSelected)}
                    disabled={exportingPdf}
                    className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download size={14} /> {exportingPdf ? 'Exporting...' : 'Export ISO 15189 PDF'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {canEditNCR(ncrSelected) && (
                  <button
                    onClick={() => handleNCREdit(ncrSelected)}
                    className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg cursor-pointer"
                  >
                    Edit Form
                  </button>
                )}
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

      {/* ── OFF-SCREEN A4 EXECUTIVE ISO 15189 PDF PRINT TEMPLATE WITH LEGACY CLINICS BRANDING ── */}
      {ncrSelected && (
        <div
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: '210mm',
            minHeight: '297mm',
            padding: '14mm 16mm',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10px',
            color: '#0f172a',
            backgroundColor: '#ffffff',
            zIndex: -100,
            pointerEvents: 'none'
          }}
          id="ncr-pdf-document-template"
          ref={pdfTemplateRef}
          className="space-y-3.5 leading-relaxed relative flex flex-col justify-between"
        >
          <div>
            {/* Top-Right PDF Watermark Rubber Stamp when Approved */}
            {(ncrSelected.status === 'closed' || ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm) && (
              <img
                src="/stamps/approved.png"
                alt="APPROVED STAMP"
                style={{
                  position: 'absolute',
                  top: '22mm',
                  right: '35mm',
                  width: '45mm',
                  height: 'auto',
                  opacity: 0.3,
                  transform: 'rotate(-12deg)',
                  pointerEvents: 'none'
                }}
              />
            )}

            {/* Official Legacy Clinics Branding Header */}
            <div className="flex items-start justify-between pb-3 border-b-2" style={{ borderColor: '#003B44' }}>
              <div className="flex items-center gap-3">
                <img src="/logo.png" style={{ height: '52px', width: 'auto', display: 'block' }} alt="Legacy Clinics Logo" />
                <div>
                  <div style={{ fontSize: '11pt', fontWeight: 800, color: '#003B44', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                    LEGACY CLINICS AND DIAGNOSTICS
                  </div>
                  <div style={{ fontSize: '7.5pt', color: '#475569', lineHeight: '1.3', fontWeight: 500 }}>
                    KK3 RD 134, Kicukiro, Kigali | Contact: +250 788 122 100 / +250 788 382 000
                  </div>
                </div>
              </div>

              <div className="text-right space-y-1">
                <h1 style={{ fontSize: '13pt', fontWeight: 900, color: '#003B44', textTransform: 'uppercase', margin: 0, letterSpacing: '-0.02em' }}>
                  NON-CONFORMANCE REPORT
                </h1>
                <div style={{ backgroundColor: '#f8fafc', border: '1.5px solid #007B8A', padding: '3px 8px', borderRadius: '5px', display: 'inline-block' }}>
                  <span style={{ fontSize: '6.5pt', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                    Official NCR Ref ID
                  </span>
                  <span style={{ fontSize: '9.5pt', fontWeight: 800, color: '#007B8A', fontFamily: 'monospace' }}>
                    {ncrSelected.ncr_number}
                  </span>
                </div>
                <div style={{ fontSize: '7pt', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
                  STATUS: {ncrSelected.status?.toUpperCase() || 'CLOSED'}
                </div>
              </div>
            </div>

            {/* Official Verification Bar */}
            <div style={{
              backgroundColor: '#003B44',
              color: '#ffffff',
              padding: '6px 12px',
              fontSize: '8.5pt',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '10px'
            }}>
              <span>Official Quality Verification & Non-Conformance Record</span>
              <span style={{ fontSize: '7.5pt', opacity: 0.85 }}>Legacy Medical Center</span>
            </div>

            {/* Section 1: Non-Conformance Incident Summary Grid */}
            <div className="border rounded-md p-3 space-y-2 mt-3" style={{ borderColor: '#cbd5e1' }}>
              <h2 className="text-[10px] font-bold uppercase tracking-wider border-b pb-1 flex justify-between items-center" style={{ color: '#003B44', borderColor: '#e2e8f0' }}>
                <span>1. Incident Identification & Record Summary</span>
                <span className="text-[8.5px] font-semibold text-slate-500">ISO 15189 Section 1</span>
              </h2>
              <div className="grid grid-cols-3 gap-2 text-[9pt]">
                <div><strong style={{ color: '#003B44' }}>Occurrence Date:</strong> {ncrSelected.occurred_at ? new Date(ncrSelected.occurred_at).toLocaleString('en-GB') : '—'}</div>
                <div><strong style={{ color: '#003B44' }}>Unit / Department:</strong> {ncrSelected.unit}</div>
                <div><strong style={{ color: '#003B44' }}>Recorded By:</strong> {ncrSelected.recorded_by}</div>
                <div><strong style={{ color: '#003B44' }}>NC Category:</strong> {ncrSelected.nc_category || 'Pre-analytical'}</div>
                <div><strong style={{ color: '#003B44' }}>Significance Level:</strong> {ncrSelected.significance?.toUpperCase()}</div>
                <div><strong style={{ color: '#003B44' }}>Assigned Actionee:</strong> {ncrSelected.assigned_to_name || 'Laboratory Manager'}</div>
              </div>
            </div>

            {/* Section 2: Narrative Incident Description */}
            <div className="border rounded-md p-3 space-y-1 mt-3" style={{ borderColor: '#cbd5e1' }}>
              <h2 className="text-[10px] font-bold uppercase tracking-wider border-b pb-1" style={{ color: '#003B44', borderColor: '#e2e8f0' }}>
                2. Incident Description & Observation
              </h2>
              <p className="text-[9.5pt] text-slate-900 whitespace-pre-wrap pt-1 leading-relaxed">
                {ncrSelected.description || 'No description recorded.'}
              </p>
            </div>

            {/* Section 3: Root Cause Analysis (RCA) & Containment */}
            <div className="border rounded-md p-3 space-y-1.5 mt-3" style={{ borderColor: '#cbd5e1' }}>
              <h2 className="text-[10px] font-bold uppercase tracking-wider border-b pb-1" style={{ color: '#003B44', borderColor: '#e2e8f0' }}>
                3. Root Cause Analysis (RCA) & Immediate Actions
              </h2>
              <p className="text-[9pt] font-bold text-slate-800">
                Methodology Applied: <span className="font-semibold" style={{ color: '#007B8A' }}>{ncrSelected.rca_method || '5 Whys'}</span>
              </p>
              <p className="text-[9.5pt] text-slate-900 pt-0.5 leading-relaxed">
                {ncrSelected.rca_results || 'Root cause analysis completed.'}
              </p>
              {ncrSelected.immediate_action && (
                <div className="mt-2 pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
                  <strong className="text-[9pt] block" style={{ color: '#003B44' }}>Immediate Containment Action Taken:</strong>
                  <p className="text-[9.5pt] text-slate-900 leading-relaxed">{ncrSelected.immediate_action}</p>
                </div>
              )}
            </div>

            {/* Section 4: CAPA Action Plan */}
            <div className="border rounded-md p-3 space-y-1.5 mt-3" style={{ borderColor: '#cbd5e1' }}>
              <h2 className="text-[10px] font-bold uppercase tracking-wider border-b pb-1" style={{ color: '#003B44', borderColor: '#e2e8f0' }}>
                4. Corrective & Preventive Action Plan (CAPA)
              </h2>
              <p className="text-[9.5pt] text-slate-900 leading-relaxed pt-0.5">
                {ncrSelected.corrective_actions || 'CAPA action plan documented.'}
              </p>
              {ncrSelected.monitoring_notes && (
                <p className="text-[9pt] text-slate-700 pt-1 border-t mt-1" style={{ borderColor: '#f1f5f9' }}>
                  <strong style={{ color: '#003B44' }}>Audit Monitoring Plan:</strong> {ncrSelected.monitoring_notes}
                </p>
              )}
            </div>

            {/* Section 5: Verification Seals & Digital Stamps */}
            <div className="pt-2 border-t-2 space-y-2 mt-3" style={{ borderColor: '#003B44' }}>
              <h2 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#003B44' }}>
                5. Quality Sign-off & Official Stamps
              </h2>
              <div className="grid grid-cols-2 gap-4 pt-1">
                
                {/* LAB MANAGER REVIEW STAMP BOX */}
                <div className="border-2 p-3 rounded-md text-center space-y-1 bg-slate-50/60 relative overflow-hidden" style={{ borderColor: '#003B44' }}>
                  {(ncrSelected.reviewed_by_lab_manager || ncrSelected.verified_by_lab_manager) && (
                    <img
                      src="/stamps/verified.png"
                      alt="VERIFIED STAMP"
                      style={{
                        position: 'absolute',
                        right: '2mm',
                        bottom: '-2mm',
                        width: '32mm',
                        height: 'auto',
                        opacity: 0.35,
                        transform: 'rotate(-8deg)',
                        pointerEvents: 'none'
                      }}
                    />
                  )}
                  <div className="text-[8.5pt] font-bold uppercase tracking-widest border-b pb-1" style={{ color: '#003B44', borderColor: '#cbd5e1' }}>
                    REVIEWED BY LABORATORY MANAGER
                  </div>
                  <p className="text-[9.5pt] font-bold text-slate-950 pt-1">
                    {ncrSelected.reviewed_by_lab_manager || ncrSelected.verified_by_lab_manager || 'Reviewed by Laboratory Manager'}
                  </p>
                  <p className="text-[8pt] text-slate-500 font-mono">ISO 15189 Quality Review Stamp</p>
                </div>

                {/* QUALITY MANAGER APPROVAL STAMP BOX */}
                <div className="border-2 p-3 rounded-md text-center space-y-1 bg-emerald-50/40 relative overflow-hidden" style={{ borderColor: '#007B8A' }}>
                  {(ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm || ncrSelected.status === 'closed') && (
                    <img
                      src="/stamps/approved.png"
                      alt="APPROVED STAMP"
                      style={{
                        position: 'absolute',
                        right: '2mm',
                        bottom: '-2mm',
                        width: '32mm',
                        height: 'auto',
                        opacity: 0.35,
                        transform: 'rotate(-8deg)',
                        pointerEvents: 'none'
                      }}
                    />
                  )}
                  <div className="text-[8.5pt] font-bold uppercase tracking-widest border-b pb-1" style={{ color: '#007B8A', borderColor: '#a7f3d0' }}>
                    APPROVED BY QUALITY MANAGER
                  </div>
                  <p className="text-[9.5pt] font-bold text-emerald-950 pt-1">
                    {ncrSelected.approved_by_qm || ncrSelected.reviewed_by_qm || 'Approved by Quality Manager'}
                  </p>
                  <p className="text-[8pt] text-emerald-700 font-mono">ISO 15189 Quality Approval Seal</p>
                </div>

              </div>
            </div>
          </div>

          {/* Official Legacy Clinics Print Footer */}
          <div className="pt-3 border-t flex justify-between items-center" style={{ borderColor: '#e2e8f0', marginTop: '12px' }}>
            <div style={{ fontSize: '6pt', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Legacy Clinics • Lumina Reporting System • Specialized Healthcare Solutions • info@legacyclinics.rw • www.legacyclinics.rw
            </div>
            <div style={{ fontSize: '6pt', color: '#007B8A', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', marginLeft: '8px' }}>
              ISO 15189:2022 QUALITY AUDIT SUITE — FORM: LEG/PATHLAB/MSD/FM-12-VERS-004
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
