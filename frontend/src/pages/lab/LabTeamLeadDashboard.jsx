import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FlaskConical, Activity, Clock, AlertTriangle, ShieldCheck,
  RefreshCw, CheckCircle2, ChevronRight, AlertOctagon, UserCheck,
  Zap, Layers, BarChart2, CheckSquare, Square, Microscope,
  ArrowRight, Search, Filter, ShieldAlert, Cpu, Send,
  FileCheck, Users, HelpCircle, AlertCircle, PlusCircle, ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { getTeamLeadSummary, batchVerifyOrders, verifyOrder, recordQCRun } from '../../api/lab';

export default function LabTeamLeadDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [activeTab, setActiveTab] = useState('bench_flow'); // 'bench_flow' | 'verification' | 'qc' | 'pre_analytical' | 'staffing'

  // Verification Selection
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [verifying, setVerifying] = useState(false);
  const [verificationNote, setVerificationNote] = useState('');

  // QC Run Modal State
  const [showQcModal, setShowQcModal] = useState(false);
  const [qcForm, setQcForm] = useState({
    analyzer_name: 'Sysmex XN-550 (Hematology)',
    parameter_name: 'WBC (White Blood Cells)',
    control_level: 'Level 1 Normal',
    mean_target: 7.2,
    sd_target: 0.4,
    measured_value: 7.3,
    corrective_action: ''
  });


  // Bench assignments (local state saved in localStorage for the shift)
  const [benchAssignments, setBenchAssignments] = useState(() => {
    const saved = localStorage.getItem('lc_lab_lead_bench_assignments');
    return saved ? JSON.parse(saved) : {
      'Phlebotomy': 'KABASINGA Claudine',
      'Hematology': 'RAFIKI Justin',
      'Clinical Chemistry': 'NZABIHIMANA Shemayi',
      'Microbiology': 'ABAKUNDANYE Marie Chantal',
      'Biochemestry': 'YUJITUZE Clemence',
      'Histopathology': 'UWAMAHORO Marie Claire',
      'POCT': 'KAGABIRWA Jeanne',
      'Molecular Biology': 'KAYITESI Edith'
    };
  });

  // Role Access Guard
  const userRole = (user?.role || '').toLowerCase();
  const isAuthorizedLead = [
    'admin', 'deputy_coo', 'coo', 'general_manager', 'chairman',
    'lab_hod', 'lab_manager', 'quality_manager', 'qm',
    'lab_team_lead', 'lab_lead', 'lab_safety_officer', 'lab_stock_officer',
    'head_biochemistry', 'head_microbiology', 'head_hematology', 'head_histopathology',
    'head_poct', 'head_phlebotomy', 'head_molecular_biology',
    'lab_micro_specialist'
  ].includes(userRole);

  const fetchSummary = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getTeamLeadSummary();
      if (res.data?.success) {
        setSummaryData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load lab team lead summary:', err);
      toast.error('Could not refresh team lead dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(() => fetchSummary(false), 30000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  // Handle single order verification
  const handleSingleVerify = async (orderId, orderAccession) => {
    try {
      const res = await verifyOrder(orderId, {
        verified_by_name: `${user?.full_name || 'Team Lead'} (Lab Lead)`
      });
      if (res.data?.success) {
        toast.success(`Specimen ${orderAccession || orderId} verified and authorized.`);
        fetchSummary(true);
        setSelectedOrderIds(prev => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed.');
    }
  };

  // Handle Batch Verification
  const handleBatchVerify = async () => {
    if (selectedOrderIds.size === 0) return;
    setVerifying(true);
    try {
      const res = await batchVerifyOrders({
        orderIds: Array.from(selectedOrderIds),
        verification_note: verificationNote
      });
      if (res.data?.success) {
        toast.success(res.data.message || `Successfully verified ${selectedOrderIds.size} orders.`);
        setSelectedOrderIds(new Set());
        setVerificationNote('');
        fetchSummary(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Batch verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  // Toggle order selection for batch verify
  const toggleSelectOrder = (id) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (orders) => {
    if (selectedOrderIds.size === orders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(orders.map(o => o.id)));
    }
  };

  // Handle QC Run Submission
  const handleRecordQC = async (e) => {
    e.preventDefault();
    try {
      const res = await recordQCRun(qcForm);
      if (res.data?.success) {
        toast.success(res.data.message || 'QC Run recorded.');
        setShowQcModal(false);
        fetchSummary(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit QC record.');
    }
  };

  const saveBenchAssignment = (bench, personName) => {
    const updated = { ...benchAssignments, [bench]: personName };
    setBenchAssignments(updated);
    localStorage.setItem('lc_lab_lead_bench_assignments', JSON.stringify(updated));
    toast.success(`Bench assignment updated: ${bench} → ${personName}`);
  };


  if (!isAuthorizedLead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] text-center p-6 space-y-4">
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 max-w-md shadow-sm">
          <ShieldAlert size={42} className="mx-auto mb-3 text-amber-600" />
          <h2 className="text-lg font-bold text-amber-900">Laboratory Team Leader Authorization Required</h2>
          <p className="text-xs text-amber-700 mt-2 leading-relaxed">
            This operational cockpit is strictly reserved for Laboratory Team Leaders, Unit Heads (Microbiology, Hematology, Phlebotomy, POCT, Histo), and Laboratory Management.
          </p>
        </div>
        <button
          onClick={() => navigate('/lab')}
          className="px-5 py-2.5 bg-[#1B669E] hover:bg-[#155280] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          Return to Laboratory Hub
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-slate-400 text-sm space-y-3">
        <RefreshCw size={32} className="animate-spin text-[#1B669E]" />
        <span>Loading Laboratory Team Leader Dashboard…</span>
      </div>
    );
  }

  const data = summaryData || {};
  const metrics = data.metrics || {};
  const statQueue = data.stat_queue || [];
  const verificationQueue = data.verification_queue || [];
  const preAnalyticalExceptions = data.pre_analytical_exceptions || [];
  const benchBreakdown = data.bench_breakdown || [];
  const qcSurveillance = data.qc_surveillance || [];
  const analyzers = data.analyzers || [];
  const personnel = data.personnel || [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-800 antialiased bg-slate-50/40 min-h-screen">

      {/* ── TOP HEADER ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-[#0d47a1] via-[#1565c0] to-[#1976d2] p-6 rounded-2xl text-white shadow-lg border border-blue-900">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-sm">
              Operational Command
            </span>
            <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-extrabold bg-amber-400/25 text-amber-100 border border-amber-300/40">
              Control No: LEG/PATHLAB/MSD/FM-12-VERS-004
            </span>
            <span className="flex items-center gap-1 text-[11px] text-blue-100 font-medium">
              <Clock size={12} />
              Shift: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Microscope className="text-blue-200" size={26} />
            Laboratory Team Leader Hub
          </h1>
          <p className="text-xs text-blue-100 max-w-xl">
            Real-time bench workload distribution, STAT sample turn-around countdown, QC Westgard compliance, and technical verification authorization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchSummary(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          <button
            onClick={() => setShowQcModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Activity size={14} />
            <span>Record IQC Run</span>
          </button>

          <Link
            to="/lab"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-[#0d47a1] hover:bg-blue-50 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
          >
            <FlaskConical size={14} />
            <span>Main Worklist</span>
          </Link>
        </div>
      </div>


      {/* ── KPI METRICS CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">

        {/* Active Samples */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Samples</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
              <FlaskConical size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-800">{metrics.total_active || 0}</span>
            <span className="text-[10px] text-slate-500 block font-medium">In pre- & analytical queue</span>
          </div>
        </div>

        {/* STAT Urgency */}
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-all ${metrics.stat_pending > 0 ? 'bg-rose-50/60 border-rose-200 hover:border-rose-400' : 'bg-white border-slate-200'
          }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">STAT Priority</span>
            <div className="p-1.5 bg-rose-100 text-rose-700 rounded-xl">
              <Zap size={16} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-rose-700">{metrics.stat_pending || 0}</span>
              {metrics.stat_pending > 0 && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-rose-200 text-rose-800 uppercase animate-pulse">
                  Urgent
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 block font-medium">STAT Turnaround Active</span>
          </div>
        </div>

        {/* Awaiting Lead Verification */}
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-all ${metrics.awaiting_verification > 0 ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400' : 'bg-white border-slate-200'
          }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Verification</span>
            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-xl">
              <FileCheck size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-800">{metrics.awaiting_verification || 0}</span>
            <span className="text-[10px] text-slate-500 block font-medium">Awaiting Lead Authorization</span>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-all ${metrics.critical_alerts > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200'
          }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Critical Alerts</span>
            <div className="p-1.5 bg-red-100 text-red-700 rounded-xl">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-red-700">{metrics.critical_alerts || 0}</span>
            <span className="text-[10px] text-slate-500 block font-medium">Panic range results</span>
          </div>
        </div>

        {/* IQC Compliance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">IQC Compliance</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-700">{metrics.qc_compliance_rate}%</span>
            <span className="text-[10px] text-slate-500 block font-medium">Westgard standards</span>
          </div>
        </div>

        {/* Pre-Analytical Exceptions */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pre-Analytic</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-xl">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-purple-900">{metrics.pre_analytical_exceptions || 0}</span>
            <span className="text-[10px] text-slate-500 block font-medium">Hemolysis / Clots / HIL</span>
          </div>
        </div>

      </div>

      {/* ── NAVIGATION TABS ── */}
      <div className="flex border-b border-slate-200 bg-white px-3 pt-2 rounded-2xl shadow-sm overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('bench_flow')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${activeTab === 'bench_flow'
              ? 'border-[#0d47a1] text-[#0d47a1]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Layers size={16} />
          <span>Bench & Shift Flow</span>
        </button>

        <button
          onClick={() => setActiveTab('verification')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${activeTab === 'verification'
              ? 'border-[#0d47a1] text-[#0d47a1]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <FileCheck size={16} />
          <span>Technical Verification Queue</span>
          {verificationQueue.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
              {verificationQueue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('qc')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${activeTab === 'qc'
              ? 'border-[#0d47a1] text-[#0d47a1]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Activity size={16} />
          <span>IQC & Westgard Surveillance</span>
        </button>

        <button
          onClick={() => setActiveTab('pre_analytical')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${activeTab === 'pre_analytical'
              ? 'border-[#0d47a1] text-[#0d47a1]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <AlertOctagon size={16} />
          <span>Specimen Quality Exceptions</span>
          {preAnalyticalExceptions.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
              {preAnalyticalExceptions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('staffing')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${activeTab === 'staffing'
              ? 'border-[#0d47a1] text-[#0d47a1]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Users size={16} />
          <span>Bench Allocation & Roster</span>
        </button>
      </div>

      {/* ── TAB 1: BENCH & SHIFT FLOW ── */}
      {activeTab === 'bench_flow' && (
        <div className="space-y-6">

          {/* URGENT STAT QUEUE CAROUSEL / HIGHLIGHT */}
          {statQueue.length > 0 && (
            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                  <h3 className="text-sm font-black text-rose-900 uppercase tracking-wide">
                    Live STAT Priority Attention Queue ({statQueue.length})
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full">
                  Target TAT: 45 Minutes
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {statQueue.map(order => (
                  <div key={order.id} className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-xs flex flex-col justify-between space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-black text-slate-800 block">{order.test_name || 'STAT Test'}</span>
                        <span className="text-[11px] font-semibold text-slate-600 block">{order.patient_name} ({order.patient_id})</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${order.is_overdue
                          ? 'bg-red-600 text-white animate-pulse'
                          : (order.tat_remaining_mins !== null && order.tat_remaining_mins < 15)
                            ? 'bg-amber-500 text-white'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                        {order.is_overdue ? 'TAT BREACHED' : `${order.tat_remaining_mins ?? 30}m Left`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                      <span className="font-mono">{order.accession_number}</span>
                      <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{order.stage}</span>
                    </div>

                    <button
                      onClick={() => navigate('/lab')}
                      className="w-full mt-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer shadow-xs"
                    >
                      Process in Lab Hub →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BENCH WORKLOAD CARDS */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Layers size={18} className="text-[#0d47a1]" />
              Workload by Laboratory Bench
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {benchBreakdown.map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-slate-800">{item.bench}</h4>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Total: {item.total}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 my-3 text-center">
                    <div className="bg-amber-50 p-1.5 rounded-lg border border-amber-100">
                      <span className="text-[10px] text-amber-700 font-semibold block">Pending</span>
                      <span className="text-sm font-black text-amber-900">{item.pending}</span>
                    </div>
                    <div className="bg-blue-50 p-1.5 rounded-lg border border-blue-100">
                      <span className="text-[10px] text-blue-700 font-semibold block">Testing</span>
                      <span className="text-sm font-black text-blue-900">{item.in_testing}</span>
                    </div>
                    <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-emerald-700 font-semibold block">Verified</span>
                      <span className="text-sm font-black text-emerald-900">{item.verified}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Lead:</span>
                    <span className="font-bold text-slate-700 truncate max-w-[130px]">
                      {benchAssignments[item.bench] || 'Unassigned'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ACTIVE ANALYZER FLEET STATUS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Cpu size={18} className="text-[#0d47a1]" />
                  Active Diagnostic Instrument Fleet
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Automated analyzers real-time connection and operational readiness.</p>
              </div>
              <Link
                to="/lab/equipment"
                className="text-xs font-bold text-[#0d47a1] hover:underline flex items-center gap-1"
              >
                Equipment PPM Hub <ExternalLink size={12} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {analyzers.map(analyzer => (
                <div key={analyzer.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-800">{analyzer.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${analyzer.status === 'Operational' || analyzer.status === 'operational'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                      }`}>
                      {analyzer.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 space-y-0.5">
                    <div>Dept: <span className="font-semibold text-slate-700">{analyzer.department}</span></div>
                    <div>Model: <span className="font-mono text-slate-700">{analyzer.model || 'Standard'}</span></div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center text-[10px] text-slate-400">
                    <span>LIS Interfaced</span>
                    <span className="text-emerald-600 font-bold">● Active Online</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── TAB 2: TECHNICAL VERIFICATION QUEUE ── */}
      {activeTab === 'verification' && (
        <div className="space-y-4">

          {/* Action Bar for Batch Verification */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSelectAll(verificationQueue)}
                className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                {selectedOrderIds.size === verificationQueue.length && verificationQueue.length > 0 ? (
                  <CheckSquare size={18} className="text-[#0d47a1]" />
                ) : (
                  <Square size={18} className="text-slate-400" />
                )}
                <span>Select All ({verificationQueue.length})</span>
              </button>

              {selectedOrderIds.size > 0 && (
                <span className="text-xs font-black px-2.5 py-1 bg-blue-50 text-[#0d47a1] rounded-lg">
                  {selectedOrderIds.size} specimen(s) selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Optional verification note / dilution remarks…"
                value={verificationNote}
                onChange={(e) => setVerificationNote(e.target.value)}
                className="text-xs p-2 rounded-xl border border-slate-200 flex-1 sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
              />

              <button
                onClick={handleBatchVerify}
                disabled={selectedOrderIds.size === 0 || verifying}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer whitespace-nowrap flex items-center gap-1.5"
              >
                <CheckCircle2 size={16} />
                <span>{verifying ? 'Verifying…' : `Verify Selected (${selectedOrderIds.size})`}</span>
              </button>
            </div>
          </div>

          {/* Queue List */}
          {verificationQueue.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 space-y-2">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
              <h4 className="text-sm font-bold text-slate-700">All Diagnostic Orders Verified</h4>
              <p className="text-xs text-slate-400">There are no pending specimens awaiting Lead verification right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {verificationQueue.map(order => {
                const isSelected = selectedOrderIds.has(order.id);
                return (
                  <div
                    key={order.id}
                    className={`bg-white p-4 rounded-2xl border transition-all shadow-sm ${isSelected ? 'border-[#0d47a1] ring-1 ring-[#0d47a1] bg-blue-50/20' : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">

                      {/* Left: Checkbox & Info */}
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleSelectOrder(order.id)}
                          className="mt-1 cursor-pointer text-slate-400 hover:text-[#0d47a1]"
                        >
                          {isSelected ? (
                            <CheckSquare size={20} className="text-[#0d47a1]" />
                          ) : (
                            <Square size={20} />
                          )}
                        </button>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                              {order.accession_number}
                            </span>
                            <span className="text-xs font-black text-slate-900">{order.test_name}</span>
                            {order.urgency === 'STAT' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 uppercase animate-pulse">
                                STAT
                              </span>
                            )}
                            {order.is_critical && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white uppercase">
                                CRITICAL PANIC
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>Patient: <b className="text-slate-700">{order.patient_name}</b> ({order.patient_id})</span>
                            <span>Provider: <b className="text-slate-700">{order.referring_provider || 'OPD'}</b></span>
                            <span>Barcode: <b className="font-mono text-slate-700">{order.specimen_barcode}</b></span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick Authorize Button */}
                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <button
                          onClick={() => handleSingleVerify(order.id, order.accession_number)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 size={14} />
                          <span>Authorize & Release</span>
                        </button>
                      </div>

                    </div>

                    {/* Parameters Table */}
                    {order.results && order.results.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-[10px] text-slate-400 uppercase tracking-wider">
                              <th className="py-1 pr-3">Parameter</th>
                              <th className="py-1 px-3">Measured Value</th>
                              <th className="py-1 px-3">Reference Range</th>
                              <th className="py-1 px-3">Flag</th>
                              <th className="py-1 pl-3">Delta / Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                            {order.results.map((param, pIdx) => (
                              <tr key={pIdx} className={param.is_critical ? 'bg-red-50/50' : param.is_abnormal ? 'bg-amber-50/40' : ''}>
                                <td className="py-1.5 pr-3 font-semibold">{param.parameter_name}</td>
                                <td className="py-1.5 px-3 font-mono font-bold">
                                  {param.parameter_value} <span className="text-[10px] text-slate-500">{param.unit}</span>
                                </td>
                                <td className="py-1.5 px-3 text-slate-500">{param.reference_range || '-'}</td>
                                <td className="py-1.5 px-3">
                                  {param.is_critical ? (
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-600 text-white">PANIC</span>
                                  ) : param.is_abnormal ? (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">ABNORMAL</span>
                                  ) : (
                                    <span className="text-[10px] font-medium text-emerald-600">Normal</span>
                                  )}
                                </td>
                                <td className="py-1.5 pl-3 text-slate-500 text-[11px]">
                                  {param.delta_change || param.remarks || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ── TAB 3: IQC & WESTGARD SURVEILLANCE ── */}
      {activeTab === 'qc' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600" />
                Shift Quality Control (IQC) Surveillance Logs
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Westgard Multi-Rule Evaluation for Levey-Jennings Quality Compliance.</p>
            </div>
            <button
              onClick={() => setShowQcModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle size={14} />
              <span>Record IQC Run</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Analyzer</th>
                    <th className="py-3 px-4">Parameter</th>
                    <th className="py-3 px-4">Control Level</th>
                    <th className="py-3 px-4">Target Mean (SD)</th>
                    <th className="py-3 px-4">Measured</th>
                    <th className="py-3 px-4">Z-Score</th>
                    <th className="py-3 px-4">Westgard Rule</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Run By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {qcSurveillance.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No Quality Control runs recorded today.
                      </td>
                    </tr>
                  ) : (
                    qcSurveillance.map(qc => (
                      <tr key={qc.id} className={qc.status === 'Rejected' ? 'bg-rose-50/50' : 'hover:bg-slate-50/60'}>
                        <td className="py-2.5 px-4 font-bold text-slate-800">{qc.analyzer_name}</td>
                        <td className="py-2.5 px-4">{qc.parameter_name}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700 text-[10px]">
                            {qc.control_level}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-500">
                          {qc.mean_target} (±{qc.sd_target})
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                          {qc.measured_value}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-extrabold">
                          <span className={Math.abs(qc.z_score) >= 2 ? 'text-rose-600' : 'text-slate-700'}>
                            {qc.z_score > 0 ? `+${qc.z_score}` : qc.z_score}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          {qc.westgard_rule_breach && qc.westgard_rule_breach !== 'None' ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-600 text-white animate-pulse">
                              {qc.westgard_rule_breach}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">In-Control (None)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${qc.status === 'Passed' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {qc.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{qc.run_by_name || 'Lab Staff'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: PRE-ANALYTICAL & SPECIMEN QUALITY EXCEPTIONS ── */}
      {activeTab === 'pre_analytical' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <AlertOctagon size={18} className="text-purple-600" />
              Pre-Analytical Rejection & Specimen Integrity Exceptions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Specimens flagged at accessioning or centrifugation with Hemolysis, Icterus, Lipemia (HIL) or volume deficiencies.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Accession</th>
                    <th className="py-3 px-4">Patient Name</th>
                    <th className="py-3 px-4">Test Requested</th>
                    <th className="py-3 px-4">Specimen Type</th>
                    <th className="py-3 px-4">Integrity / Flag</th>
                    <th className="py-3 px-4">Urgency</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {preAnalyticalExceptions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No pre-analytical specimen exceptions currently active.
                      </td>
                    </tr>
                  ) : (
                    preAnalyticalExceptions.map(order => (
                      <tr key={order.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-4 font-mono font-bold">{order.accession_number}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{order.patient_name}</td>
                        <td className="py-2.5 px-4">{order.test_name}</td>
                        <td className="py-2.5 px-4 text-slate-500">{order.specimen_type}</td>
                        <td className="py-2.5 px-4">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                            {order.issue || 'Compromised'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${order.urgency === 'STAT' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {order.urgency}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <button
                            onClick={() => navigate('/lab')}
                            className="px-2.5 py-1 bg-[#1B669E] hover:bg-[#155280] text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                          >
                            Trigger Recollection
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: BENCH ROSTER & ALLOCATION ── */}
      {activeTab === 'staffing' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Users size={18} className="text-[#0d47a1]" />
                Laboratory Bench Staffing Allocation & Active Roster
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Assign active technologists and scientists to operational benches for this shift.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {Object.keys(benchAssignments).map((bench, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-800">{bench} Bench</h4>
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold">Assigned</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Assigned Technologist / Specialist:</label>
                  <select
                    value={benchAssignments[bench] || ''}
                    onChange={(e) => saveBenchAssignment(bench, e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50/50 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">-- Select Staff --</option>
                    {personnel.map(p => (
                      <option key={p.id} value={p.full_name}>
                        {p.full_name} ({p.role_name || p.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RECORD IQC RUN MODAL ── */}
      {showQcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Activity size={18} className="text-emerald-600" />
                Record Analyzer Quality Control (IQC) Run
              </h3>
              <button
                onClick={() => setShowQcModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordQC} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Analyzer</label>
                <select
                  value={qcForm.analyzer_name}
                  onChange={(e) => setQcForm({ ...qcForm, analyzer_name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-sans"
                >
                  <option value="Sysmex XN-550 (Hematology)">Sysmex XN-550 (Hematology)</option>
                  <option value="Cobas c311 (Clinical Chemistry)">Cobas c311 (Clinical Chemistry)</option>
                  <option value="Maglumi 800 (CLIA Biochemestry)">Maglumi 800 (CLIA Biochemestry)</option>
                  <option value="Stat Profile Prime (Electrolytes / ABG)">Stat Profile Prime (Electrolytes / ABG)</option>
                  <option value="Stago Satellite (Coagulation)">Stago Satellite (Coagulation)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Parameter</label>
                  <input
                    type="text"
                    value={qcForm.parameter_name}
                    onChange={(e) => setQcForm({ ...qcForm, parameter_name: e.target.value })}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Control Level</label>
                  <select
                    value={qcForm.control_level}
                    onChange={(e) => setQcForm({ ...qcForm, control_level: e.target.value })}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200"
                  >
                    <option value="Level 1 Normal">Level 1 Normal</option>
                    <option value="Level 2 High">Level 2 High</option>
                    <option value="Level 3 Low">Level 3 Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Target Mean</label>
                  <input
                    type="number"
                    step="0.01"
                    value={qcForm.mean_target}
                    onChange={(e) => setQcForm({ ...qcForm, mean_target: parseFloat(e.target.value) })}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Target SD (1s)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={qcForm.sd_target}
                    onChange={(e) => setQcForm({ ...qcForm, sd_target: parseFloat(e.target.value) })}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Measured Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={qcForm.measured_value}
                    onChange={(e) => setQcForm({ ...qcForm, measured_value: parseFloat(e.target.value) })}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Corrective Action (if out of control)</label>
                <input
                  type="text"
                  placeholder="e.g. Recalibrated reagent pack, fresh vial opened"
                  value={qcForm.corrective_action}
                  onChange={(e) => setQcForm({ ...qcForm, corrective_action: e.target.value })}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQcModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm"
                >
                  Save IQC Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
