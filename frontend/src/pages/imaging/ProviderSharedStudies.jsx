import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ScanLine,
  FileSearch,
  FileText,
  Eye,
  Download,
  ExternalLink,
  Clock,
  User,
  Calendar,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ShieldCheck,
  Stethoscope,
  Activity,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Sparkles,
  Share2,
  Check,
  Tag,
  Info,
  X,
  Printer,
  Edit3,
  Save,
  CheckSquare,
  Square,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Table
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
  getMySharedStudies,
  updateShareStatus,
  downloadShareReportPdf,
  downloadReportPdf
} from '../../api/imaging';
import DiagnosticViewerModal from './DiagnosticViewerModal';
import { Button, Card, Badge } from '../../components/ui/index.jsx';

// ── Modality Styling Palette ────────────────────────────────────────────────
const getModalityBadge = (mod) => {
  const m = (mod || '').toUpperCase();
  switch (m) {
    case 'CT':
      return { bg: 'bg-cyan-50 text-cyan-800 border-cyan-200', dot: 'bg-cyan-500' };
    case 'MRI':
      return { bg: 'bg-purple-50 text-purple-800 border-purple-200', dot: 'bg-purple-500' };
    case 'X-RAY':
    case 'XR':
      return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' };
    case 'US':
    case 'ULTRASOUND':
      return { bg: 'bg-blue-50 text-blue-800 border-blue-200', dot: 'bg-blue-500' };
    case 'MAMMO':
    case 'MAMMOGRAPHY':
    case 'MG':
      return { bg: 'bg-pink-50 text-pink-800 border-pink-200', dot: 'bg-pink-500' };
    case 'OPG':
    case 'CBCT':
    case 'CEPHALOGRAM':
      return { bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' };
    default:
      return { bg: 'bg-indigo-50 text-indigo-800 border-indigo-200', dot: 'bg-indigo-500' };
  }
};

export default function ProviderSharedStudies() {
  const { user } = useAuth();

  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [modalityFilter, setModalityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | awaiting | viewed
  const [urgencyFilter, setUrgencyFilter] = useState('ALL'); // ALL | routine | urgent | stat
  const [sortBy, setSortBy] = useState('newest'); // newest | oldest | patient
  const [viewMode, setViewMode] = useState('grid'); // grid | table

  // Expanded report cards & Full report modal
  const [expandedCards, setExpandedCards] = useState({});
  const [selectedFullReportShare, setSelectedFullReportShare] = useState(null);

  // Provider Clinical Decisions / Follow-up Notes (persisted in localStorage)
  const [providerNotes, setProviderNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lumina_provider_imaging_notes') || '{}');
    } catch {
      return {};
    }
  });
  const [editingNoteShareId, setEditingNoteShareId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');

  // Diagnostic PACS Viewer modal state
  const [activeViewerShare, setActiveViewerShare] = useState(null);

  // Save provider notes to localStorage
  const saveProviderNote = (shareId) => {
    const updated = { ...providerNotes, [shareId]: noteDraft };
    setProviderNotes(updated);
    try {
      localStorage.setItem('lumina_provider_imaging_notes', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist provider note:', e);
    }
    setEditingNoteShareId(null);
    toast.success('Clinical decision note saved.');
  };

  // Load shared studies
  const loadSharedStudies = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const res = await getMySharedStudies();
      const list = res.data?.data || res.data || [];
      setShares(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load shared imaging studies:', err);
      setError(err?.response?.data?.message || 'Failed to load your shared imaging studies.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSharedStudies();
  }, [loadSharedStudies]);

  // Handle status toggle (viewed / shared)
  const handleToggleStatus = async (share) => {
    try {
      const newStatus = share.status === 'viewed' ? 'shared' : 'viewed';
      await updateShareStatus(share.id, newStatus);
      setShares((prev) =>
        prev.map((s) => (s.id === share.id ? { ...s, status: newStatus } : s))
      );
      if (newStatus === 'viewed') {
        toast.success('Study marked as reviewed.');
      } else {
        toast.success('Study marked as pending review.');
      }
    } catch (err) {
      toast.error('Failed to update study status.');
    }
  };

  // Handle PDF report download
  const handleDownloadReport = async (share, e) => {
    e?.stopPropagation();
    try {
      const toastId = toast.loading('Preparing imaging report PDF...');
      let res;
      if (share.share_token) {
        res = await downloadShareReportPdf(share.share_token);
      } else if (share.study_id) {
        res = await downloadReportPdf(share.study_id);
      } else {
        toast.dismiss(toastId);
        throw new Error('No study or share token available for report download.');
      }

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Imaging_Report_${(share.patient_name || 'Patient').replace(/\s+/g, '_')}_${share.modality || 'Scan'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.dismiss(toastId);
      toast.success('Report downloaded successfully.');
    } catch (err) {
      console.error('Error downloading report:', err);
      toast.error('Could not download report PDF. Please verify report status.');
    }
  };

  // Launch in-portal PACS viewer
  const handleOpenViewer = (share) => {
    if (share.status !== 'viewed') {
      updateShareStatus(share.id, 'viewed').catch(() => { });
      setShares((prev) =>
        prev.map((s) => (s.id === share.id ? { ...s, status: 'viewed' } : s))
      );
    }
    setActiveViewerShare(share);
  };

  // Open standalone dual-monitor viewer in new window
  const handleOpenStandalone = (share, e) => {
    e?.stopPropagation();
    if (share.status !== 'viewed') {
      updateShareStatus(share.id, 'viewed').catch(() => { });
      setShares((prev) =>
        prev.map((s) => (s.id === share.id ? { ...s, status: 'viewed' } : s))
      );
    }
    const params = new URLSearchParams();
    if (share.share_token) params.set('token', share.share_token);
    if (share.study_id) params.set('studyId', share.study_id);
    if (share.archive_id) params.set('archiveId', share.archive_id);
    if (share.patient_id) params.set('patientId', share.patient_id);
    window.open(`/imaging/viewer?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const toggleCardExpand = (shareId) => {
    setExpandedCards((prev) => ({ ...prev, [shareId]: !prev[shareId] }));
  };

  // Metrics computation
  const stats = useMemo(() => {
    const total = shares.length;
    const pendingReview = shares.filter((s) => s.status !== 'viewed').length;
    const reviewed = shares.filter((s) => s.status === 'viewed').length;
    const urgent = shares.filter(
      (s) => (s.urgency || '').toLowerCase() === 'urgent' || (s.urgency || '').toLowerCase() === 'stat'
    ).length;
    return { total, pendingReview, reviewed, urgent };
  }, [shares]);

  // Available modalities in dataset
  const availableModalities = useMemo(() => {
    const set = new Set();
    shares.forEach((s) => {
      if (s.modality) set.add(s.modality.toUpperCase());
    });
    return Array.from(set);
  }, [shares]);

  // Filter & sort processing
  const filteredShares = useMemo(() => {
    return shares
      .filter((share) => {
        // Modality filter
        if (modalityFilter !== 'ALL' && (share.modality || '').toUpperCase() !== modalityFilter) {
          return false;
        }

        // Status filter
        if (statusFilter === 'awaiting' && share.status === 'viewed') return false;
        if (statusFilter === 'viewed' && share.status !== 'viewed') return false;

        // Urgency filter
        if (urgencyFilter !== 'ALL') {
          const u = (share.urgency || 'routine').toLowerCase();
          if (urgencyFilter === 'stat' && u !== 'stat') return false;
          if (urgencyFilter === 'urgent' && u !== 'urgent') return false;
          if (urgencyFilter === 'routine' && u !== 'routine') return false;
        }

        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchPatient = (share.patient_name || '').toLowerCase().includes(q);
          const matchPid = (share.patient_id || '').toLowerCase().includes(q);
          const matchAccession = (share.accession_number || '').toLowerCase().includes(q);
          const matchBodyPart = (share.body_part || '').toLowerCase().includes(q);
          const matchModality = (share.modality || '').toLowerCase().includes(q);
          const matchRad = (share.radiologist_name || '').toLowerCase().includes(q);
          const matchIndication = (share.clinical_indication || share.study_clinical_indication || '').toLowerCase().includes(q);
          const matchFindings = (share.findings_narrative || '').toLowerCase().includes(q);
          const matchImpression = (share.impression || '').toLowerCase().includes(q);
          return (
            matchPatient ||
            matchPid ||
            matchAccession ||
            matchBodyPart ||
            matchModality ||
            matchRad ||
            matchIndication ||
            matchFindings ||
            matchImpression
          );
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at || b.study_date || 0) - new Date(a.created_at || a.study_date || 0);
        }
        if (sortBy === 'oldest') {
          return new Date(a.created_at || a.study_date || 0) - new Date(b.created_at || b.study_date || 0);
        }
        if (sortBy === 'patient') {
          return (a.patient_name || '').localeCompare(b.patient_name || '');
        }
        return 0;
      });
  }, [shares, modalityFilter, statusFilter, urgencyFilter, searchTerm, sortBy]);

  const hasActiveFilters = modalityFilter !== 'ALL' || statusFilter !== 'ALL' || urgencyFilter !== 'ALL' || searchTerm.trim() !== '';

  const getProviderFirstName = () => {
    const raw = user?.fullName || user?.full_name || user?.name || '';
    if (raw) {
      const cleaned = raw.replace(/^Dr\.?\s+/i, '').trim();
      const first = cleaned.split(' ')[0];
      if (first) return first;
    }
    if (user?.username) {
      const parts = user.username.split('_');
      const cand = parts[parts.length - 1] || user.username;
      return cand.charAt(0).toUpperCase() + cand.slice(1);
    }
    return 'Doctor';
  };

  const clearAllFilters = () => {
    setModalityFilter('ALL');
    setStatusFilter('ALL');
    setUrgencyFilter('ALL');
    setSearchTerm('');
  };

  return (
    <div 
      className="text-slate-800"
      style={{
        marginTop: 'calc(-1 * var(--page-padding))',
        marginLeft: 'calc(-1 * var(--page-padding))',
        marginRight: 'calc(-1 * var(--page-padding))',
      }}
    >
      {/* ── Top Header Bar (Thin, Solid Blue #1C69A0, No Gradient, Flush At Top Of Page) ── */}
      <div className="bg-[#1C69A0] py-3.5 px-6 sm:px-8 text-white shadow-xs border-b border-[#15527d] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Shared Imaging &amp; Clinical Findings</span>
          </h1>
          <p className="text-blue-100 text-xs font-medium mt-0.5 flex flex-wrap items-center gap-1.5">
            <span>Referred studies &amp; radiologist findings for</span>
            <strong className="text-white font-bold">
              Dr. {getProviderFirstName()}
            </strong>
            <span className="text-[10px] px-2 py-0.2 rounded-full bg-white/20 text-white font-bold uppercase tracking-wider">
              {(user?.role || 'Clinician').replace('_', ' ')}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => loadSharedStudies(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs uppercase tracking-wider border border-white/20 transition-all shadow-xs active:scale-95"
            title="Refresh shared studies list"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <div className="bg-white/15 border border-white/20 rounded-xl p-0.5 flex items-center gap-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'grid' ? 'bg-white text-[#1C69A0] shadow-xs' : 'text-blue-100 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'table' ? 'bg-white text-[#1C69A0] shadow-xs' : 'text-blue-100 hover:text-white'
              }`}
              title="Table View"
            >
              <Table size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content Body With Lumina Padding ── */}
      <div className="p-4 sm:p-6 lg:p-7 space-y-6">

      {/* ── Metric KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#007B8A] border border-teal-200 flex items-center justify-center shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{stats.total}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Shared</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">{stats.pendingReview}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Awaiting Review</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600">{stats.urgent}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">STAT / Urgent</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <FileCheck size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600">{stats.reviewed}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reviewed</div>
          </div>
        </div>
      </div>

      {/* ── Search & Advanced Filters Bar ───────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by patient name, PID, accession, modality, body part, findings, or impression..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-[#007B8A] focus:ring-2 focus:ring-[#007B8A]/20 text-sm font-medium transition-all bg-slate-50/60 focus:bg-white text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Review Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              All ({shares.length})
            </button>
            <button
              onClick={() => setStatusFilter('awaiting')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${statusFilter === 'awaiting'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Clock size={12} />
              <span>Awaiting Review ({stats.pendingReview})</span>
            </button>
            <button
              onClick={() => setStatusFilter('viewed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${statusFilter === 'viewed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <CheckCircle2 size={12} />
              <span>Reviewed ({stats.reviewed})</span>
            </button>
          </div>
        </div>

        {/* Secondary Filters: Modality pills, Urgency, Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Filter size={12} /> Modality:
            </span>
            <button
              onClick={() => setModalityFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${modalityFilter === 'ALL'
                ? 'bg-[#007B8A] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              All Modalities
            </button>
            {['CT', 'MRI', 'X-RAY', 'US', 'MAMMO', 'OPG'].map((mod) => (
              <button
                key={mod}
                onClick={() => setModalityFilter(mod)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${modalityFilter === mod
                  ? 'bg-[#007B8A] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {mod}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Urgency select */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Urgency:</span>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#007B8A]"
              >
                <option value="ALL">All Priorities</option>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT / Immediate</option>
              </select>
            </div>

            {/* Sort order */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#007B8A]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="patient">Patient (A-Z)</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Content Area: Studies & Findings ─────────────────────────────────── */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-sm">
          <RefreshCw size={28} className="animate-spin text-[#007B8A] mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Retrieving diagnostic studies & radiologist reports...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3 shadow-sm">
          <AlertCircle size={32} className="text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-rose-900">Failed to Load Shared Studies</h3>
          <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => loadSharedStudies(true)}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredShares.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <ScanLine size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">No Shared Imaging Studies Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {hasActiveFilters
                ? 'No studies match your current filter parameters. Try clearing your search or filters.'
                : 'There are currently no imaging exams shared to your provider profile. Newly acquired or referred scans will appear here automatically.'}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 bg-[#007B8A] text-white rounded-xl text-xs font-bold hover:bg-[#005B66] transition-colors"
            >
              Clear Active Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── GRID VIEW ───────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredShares.map((share) => {
            const modBadge = getModalityBadge(share.modality);
            const isStat = (share.urgency || '').toLowerCase() === 'stat';
            const isUrgent = (share.urgency || '').toLowerCase() === 'urgent';
            const isReviewed = share.status === 'viewed';
            const isExpanded = !!expandedCards[share.id];
            const hasReport = !!share.findings_narrative || !!share.impression;
            const currentNote = providerNotes[share.id] || '';

            return (
              <div
                key={share.id}
                className="bg-white border border-slate-200/90 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* ── Top Header Bar ── */}
                <div className="p-5 border-b border-slate-100 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200 font-black text-sm">
                        <User size={20} className="text-[#007B8A]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 leading-tight">
                            {share.patient_name || 'Patient Study'}
                          </h3>
                          {share.patient_id && (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                              PID: {share.patient_id}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-2">
                          {share.body_part && (
                            <span className="font-bold text-slate-700">{share.body_part}</span>
                          )}
                          {share.accession_number && (
                            <span>&bull; ACC: <span className="font-mono text-slate-600">{share.accession_number}</span></span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Modality & Urgency Badges */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${modBadge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${modBadge.dot}`} />
                          {share.modality || 'SCAN'}
                        </span>
                        {isStat ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-rose-500 text-white animate-pulse">
                            STAT
                          </span>
                        ) : isUrgent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white">
                            Urgent
                          </span>
                        ) : null}
                      </div>

                      {/* Status indicator */}
                      <button
                        onClick={() => handleToggleStatus(share)}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${isReviewed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                          }`}
                        title="Click to toggle review state"
                      >
                        {isReviewed ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        <span>{isReviewed ? 'Reviewed' : 'Awaiting Review'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Clinical Indication / Reason for study */}
                  {(share.clinical_indication || share.study_clinical_indication || share.consultation_notes) && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                      {(share.clinical_indication || share.study_clinical_indication) && (
                        <p className="text-slate-700">
                          <strong className="text-slate-900 font-bold">Clinical Indication:</strong>{' '}
                          {share.clinical_indication || share.study_clinical_indication}
                        </p>
                      )}
                      {share.consultation_notes && (
                        <p className="text-slate-600 italic">
                          <strong className="text-slate-700 font-semibold not-italic">Imaging Note:</strong>{' '}
                          {share.consultation_notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Radiologist Clinical Findings & Impression ──────────────── */}
                <div className="p-5 space-y-4 flex-1">
                  {hasReport ? (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/20 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#007B8A]">
                          <Activity size={15} />
                          <span>Radiologist Findings & Impression</span>
                        </div>
                        {share.report_status && (
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${share.report_status === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                            }`}>
                            {share.report_status}
                          </span>
                        )}
                      </div>

                      {/* Impression */}
                      {share.impression && (
                        <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Conclusion / Impression:
                          </div>
                          <p className="text-xs font-bold text-slate-800 leading-relaxed whitespace-pre-line">
                            {share.impression}
                          </p>
                        </div>
                      )}

                      {/* Key Findings Narrative preview or expanded */}
                      {share.findings_narrative && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Key Findings:
                          </div>
                          <p className={`text-xs text-slate-700 leading-relaxed whitespace-pre-line ${!isExpanded ? 'line-clamp-3' : ''}`}>
                            {share.findings_narrative}
                          </p>
                        </div>
                      )}

                      {/* Diagnostic Codes */}
                      {((share.diagnosis_codes && share.diagnosis_codes.length > 0) || (share.findings_codes && share.findings_codes.length > 0)) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {(share.diagnosis_codes || []).map((code, idx) => (
                            <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {code.code || code.name || code}
                            </span>
                          ))}
                          {(share.findings_codes || []).map((code, idx) => (
                            <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {code.code || code.name || code}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Sign-off info */}
                      {share.radiologist_name && (
                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 font-medium">
                            <ShieldCheck size={13} className="text-emerald-600" />
                            Reported by Dr. <strong className="text-slate-700">{share.radiologist_name}</strong>
                          </span>
                          {share.reported_at && (
                            <span>{new Date(share.reported_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-1.5 text-slate-500">
                      <Clock size={20} className="mx-auto text-slate-400" />
                      <p className="text-xs font-semibold text-slate-700">Radiology Report Pending Formal Sign-Off</p>
                      <p className="text-[11px] text-slate-500">
                        Diagnostic image slices are uploaded and available for immediate interactive PACS review.
                      </p>
                    </div>
                  )}

                  {/* ── Clinician Follow-up Decision Note (Treating Doctor's Log) ── */}
                  <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                        <Edit3 size={13} className="text-amber-700" />
                        <span>My Clinical Decision / Treatment Note</span>
                      </span>
                      {editingNoteShareId !== share.id && (
                        <button
                          onClick={() => {
                            setEditingNoteShareId(share.id);
                            setNoteDraft(currentNote);
                          }}
                          className="text-[11px] font-bold text-[#007B8A] hover:underline"
                        >
                          {currentNote ? 'Edit Note' : '+ Add Note'}
                        </button>
                      )}
                    </div>

                    {editingNoteShareId === share.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="e.g. Reviewed with patient. Conservative PT initiated; follow up in 2 weeks..."
                          rows={2}
                          className="w-full text-xs font-medium p-2.5 rounded-lg border border-amber-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#007B8A]"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingNoteShareId(null)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveProviderNote(share.id)}
                            className="px-3 py-1 bg-[#007B8A] hover:bg-[#005B66] text-white text-xs font-bold rounded-lg shadow-sm"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : currentNote ? (
                      <p className="text-xs font-semibold text-slate-700 italic bg-white/80 p-2 rounded-lg border border-amber-200/50">
                        "{currentNote}"
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        No clinical follow-up note recorded yet.
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Interactive Action Buttons Footer ──────────────────────── */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenViewer(share)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#007B8A] hover:bg-[#005B66] text-white text-xs font-black tracking-wider uppercase shadow-md shadow-[#007B8A]/20 transition-all active:scale-95"
                    >
                      <Eye size={15} />
                      <span>Launch PACS Viewer</span>
                    </button>

                    <button
                      onClick={(e) => handleOpenStandalone(share, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors shadow-sm"
                      title="Open in new standalone browser window (for dual monitors)"
                    >
                      <ExternalLink size={14} />
                      <span className="hidden sm:inline">New Tab</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasReport && (
                      <button
                        onClick={() => setSelectedFullReportShare(share)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors shadow-sm"
                        title="View complete official clinical report"
                      >
                        <FileText size={14} className="text-[#007B8A]" />
                        <span>Full Report</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => handleDownloadReport(share, e)}
                      className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors shadow-sm"
                      title="Download Official PDF Report"
                    >
                      <Download size={15} />
                    </button>

                    <button
                      onClick={() => toggleCardExpand(share.id)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                      title={isExpanded ? 'Collapse card' : 'Expand full findings'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── TABLE / LIST VIEW ───────────────────────────────────────────────── */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Patient / PID</th>
                  <th className="py-3 px-4">Modality & Body Part</th>
                  <th className="py-3 px-4">Urgency</th>
                  <th className="py-3 px-4">Impression / Findings</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredShares.map((share) => {
                  const modBadge = getModalityBadge(share.modality);
                  const isReviewed = share.status === 'viewed';
                  const isStat = (share.urgency || '').toLowerCase() === 'stat';

                  return (
                    <tr key={share.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{share.patient_name}</div>
                        {share.patient_id && (
                          <div className="font-mono text-slate-400 text-[11px]">PID: {share.patient_id}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${modBadge.bg}`}>
                          {share.modality}
                        </span>
                        <div className="font-semibold text-slate-700 text-xs mt-0.5">
                          {share.body_part || 'General'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {isStat ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500 text-white animate-pulse">
                            STAT
                          </span>
                        ) : (
                          <span className="text-slate-600 font-semibold capitalize">
                            {share.urgency || 'Routine'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        {share.impression ? (
                          <div className="font-bold text-slate-800 line-clamp-2">
                            {share.impression}
                          </div>
                        ) : share.findings_narrative ? (
                          <div className="text-slate-600 line-clamp-2">
                            {share.findings_narrative}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Report pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleStatus(share)}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${isReviewed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                        >
                          {isReviewed ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          <span>{isReviewed ? 'Reviewed' : 'Pending'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {share.created_at ? new Date(share.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenViewer(share)}
                            className="px-3 py-1.5 rounded-lg bg-[#007B8A] text-white font-bold text-xs hover:bg-[#005B66] shadow-sm transition-all"
                            title="Launch PACS Viewer"
                          >
                            View
                          </button>
                          <button
                            onClick={(e) => handleDownloadReport(share, e)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                            title="Download Report PDF"
                          >
                            <Download size={14} />
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

      {/* ── Detailed Official Report Modal ───────────────────────────────────── */}
      {selectedFullReportShare && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-[#003B44] to-[#007B8A] text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Diagnostic Radiology Report</h3>
                <p className="text-xs text-teal-100">
                  Legacy Clinics Kigali &bull; Patient: {selectedFullReportShare.patient_name} (PID: {selectedFullReportShare.patient_id})
                </p>
              </div>
              <button
                onClick={() => setSelectedFullReportShare(null)}
                className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800">
              {/* Study Info Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Modality:</span>
                  <div className="font-bold text-slate-800">{selectedFullReportShare.modality}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Exam Region:</span>
                  <div className="font-bold text-slate-800">{selectedFullReportShare.body_part || 'General'}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Accession No:</span>
                  <div className="font-mono font-bold text-slate-800">{selectedFullReportShare.accession_number || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Exam Date:</span>
                  <div className="font-bold text-slate-800">
                    {selectedFullReportShare.study_date ? new Date(selectedFullReportShare.study_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Indication */}
              {(selectedFullReportShare.clinical_indication || selectedFullReportShare.study_clinical_indication) && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#007B8A] mb-1">Clinical Indication:</h4>
                  <p className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-medium">
                    {selectedFullReportShare.clinical_indication || selectedFullReportShare.study_clinical_indication}
                  </p>
                </div>
              )}

              {/* Technique */}
              {selectedFullReportShare.technique && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#007B8A] mb-1">Examination Technique:</h4>
                  <p className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-medium whitespace-pre-line">
                    {selectedFullReportShare.technique}
                  </p>
                </div>
              )}

              {/* Findings */}
              {selectedFullReportShare.findings_narrative && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#007B8A] mb-1">Radiographic Findings:</h4>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 font-medium whitespace-pre-line leading-relaxed text-slate-700">
                    {selectedFullReportShare.findings_narrative}
                  </div>
                </div>
              )}

              {/* Impression / Conclusion */}
              {selectedFullReportShare.impression && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 mb-1">Impression / Conclusion:</h4>
                  <div className="p-4 bg-rose-50/60 rounded-lg border border-rose-200 font-bold text-slate-900 whitespace-pre-line leading-relaxed">
                    {selectedFullReportShare.impression}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {selectedFullReportShare.recommendations && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-700 mb-1">Clinical Recommendations:</h4>
                  <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 font-medium text-slate-800 whitespace-pre-line">
                    {selectedFullReportShare.recommendations}
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600">
                <div>
                  Interpreting Radiologist:{' '}
                  <strong className="text-slate-900">Dr. {selectedFullReportShare.radiologist_name || 'Radiologist'}</strong>
                </div>
                {selectedFullReportShare.verified_by_name && (
                  <div>
                    Clinically Verified by:{' '}
                    <strong className="text-slate-900">Dr. {selectedFullReportShare.verified_by_name}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setSelectedFullReportShare(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Close Report
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleDownloadReport(selectedFullReportShare, e)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={14} />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => {
                    const share = selectedFullReportShare;
                    setSelectedFullReportShare(null);
                    handleOpenViewer(share);
                  }}
                  className="px-4 py-2 bg-[#007B8A] hover:bg-[#005B66] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Eye size={14} />
                  <span>Open in PACS Viewer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ── High-Performance Diagnostic PACS Viewer Modal ───────────────────── */}
      {activeViewerShare && (
        <DiagnosticViewerModal
          isOpen={!!activeViewerShare}
          onClose={() => setActiveViewerShare(null)}
          shareToken={activeViewerShare.share_token}
          studyId={activeViewerShare.study_id}
          archiveItem={
            activeViewerShare.archive_id
              ? {
                id: activeViewerShare.archive_id,
                modality: activeViewerShare.modality,
                file_name: activeViewerShare.archive_filename,
              }
              : null
          }
          onShare={null}
        />
      )}
    </div>
  );
}
