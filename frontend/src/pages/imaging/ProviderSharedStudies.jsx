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
  Info
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

export default function ProviderSharedStudies() {
  const { user } = useAuth();

  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [modalityFilter, setModalityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [expandedReportId, setExpandedReportId] = useState(null);

  // Diagnostic Viewer modal state
  const [activeViewerShare, setActiveViewerShare] = useState(null);

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

  // Launch viewer
  const handleOpenViewer = (share) => {
    setActiveViewerShare(share);
  };

  // Open viewer in detached new browser window / tab
  const handleOpenNewTabViewer = (share, e) => {
    e?.stopPropagation();
    const query = share.share_token
      ? `token=${encodeURIComponent(share.share_token)}`
      : `studyId=${encodeURIComponent(share.study_id)}`;
    window.open(`/imaging/viewer?${query}`, '_blank', 'noopener,noreferrer');
  };

  // Metrics
  const stats = useMemo(() => {
    const total = shares.length;
    const pendingReview = shares.filter((s) => s.status !== 'viewed').length;
    const urgent = shares.filter(
      (s) => (s.urgency || '').toLowerCase() === 'urgent' || (s.urgency || '').toLowerCase() === 'stat'
    ).length;
    const withReports = shares.filter(
      (s) => s.findings_narrative || s.impression || s.report_status
    ).length;

    return { total, pendingReview, urgent, withReports };
  }, [shares]);

  // Unique modalities
  const availableModalities = useMemo(() => {
    const mods = new Set();
    shares.forEach((s) => {
      if (s.modality) mods.add(s.modality.toUpperCase());
    });
    return Array.from(mods).sort();
  }, [shares]);

  // Filtered shares
  const filteredShares = useMemo(() => {
    return shares.filter((share) => {
      const matchModality =
        modalityFilter === 'ALL' ||
        (share.modality && share.modality.toUpperCase() === modalityFilter);

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'VIEWED' && share.status === 'viewed') ||
        (statusFilter === 'PENDING' && share.status !== 'viewed');

      const matchUrgency =
        urgencyFilter === 'ALL' ||
        (urgencyFilter === 'URGENT' &&
          ['urgent', 'stat'].includes((share.urgency || '').toLowerCase())) ||
        (urgencyFilter === 'ROUTINE' &&
          !['urgent', 'stat'].includes((share.urgency || '').toLowerCase()));

      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        (share.patient_name && share.patient_name.toLowerCase().includes(q)) ||
        (share.patient_id && share.patient_id.toLowerCase().includes(q)) ||
        (share.accession_number && share.accession_number.toLowerCase().includes(q)) ||
        (share.modality && share.modality.toLowerCase().includes(q)) ||
        (share.body_part && share.body_part.toLowerCase().includes(q)) ||
        (share.clinical_indication && share.clinical_indication.toLowerCase().includes(q)) ||
        (share.consultation_notes && share.consultation_notes.toLowerCase().includes(q)) ||
        (share.findings_narrative && share.findings_narrative.toLowerCase().includes(q)) ||
        (share.impression && share.impression.toLowerCase().includes(q)) ||
        (share.radiologist_name && share.radiologist_name.toLowerCase().includes(q));

      return matchModality && matchStatus && matchUrgency && matchSearch;
    });
  }, [shares, modalityFilter, statusFilter, urgencyFilter, searchTerm]);

  const getModalityColor = (mod) => {
    switch ((mod || '').toUpperCase()) {
      case 'CT':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'MRI':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'X-RAY':
      case 'XR':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'US':
      case 'ULTRASOUND':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'MAMMO':
      case 'MG':
        return 'bg-pink-500/15 text-pink-400 border-pink-500/30';
      case 'OPG':
      case 'CBCT':
      case 'CEPHALOGRAM':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default:
        return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-indigo-400 shadow-inner">
              <ScanLine size={24} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Shared Imaging & Clinical Findings
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                  Clinical Workspace
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Diagnostic scans, radiologist notes, and key findings referred to Dr.{' '}
                <span className="text-slate-200 font-semibold">{user?.full_name || user?.name || user?.username}</span>{' '}
                ({(user?.role || 'Clinician').replace('_', ' ').toUpperCase()}).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadSharedStudies(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-sm font-medium shadow-sm"
            title="Refresh shared studies list"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Metric KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-slate-400 font-medium">Shared Studies</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{stats.pendingReview}</div>
            <div className="text-xs text-slate-400 font-medium">Awaiting Review</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-400">{stats.urgent}</div>
            <div className="text-xs text-slate-400 font-medium">Urgent / STAT</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FileCheck size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{stats.withReports}</div>
            <div className="text-xs text-slate-400 font-medium">With Findings Report</div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ────────────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Patient Name, ID, Accession #, Body Part, Indication or Findings..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Modality Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Modality:</span>
              <select
                value={modalityFilter}
                onChange={(e) => setModalityFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-slate-200">All Modalities</option>
                {availableModalities.map((mod) => (
                  <option key={mod} value={mod} className="bg-slate-900 text-slate-200">
                    {mod}
                  </option>
                ))}
              </select>
            </div>

            {/* Urgency Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5">
              <span className="text-xs text-slate-400 font-medium">Urgency:</span>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-slate-200">All Urgencies</option>
                <option value="URGENT" className="bg-slate-900 text-rose-300">Urgent / STAT Only</option>
                <option value="ROUTINE" className="bg-slate-900 text-slate-200">Routine Only</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5">
              <span className="text-xs text-slate-400 font-medium">Review:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-slate-200">All Status</option>
                <option value="PENDING" className="bg-slate-900 text-amber-300">Awaiting Review</option>
                <option value="VIEWED" className="bg-slate-900 text-emerald-300">Reviewed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(modalityFilter !== 'ALL' || urgencyFilter !== 'ALL' || statusFilter !== 'ALL' || searchTerm) && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60 text-xs text-slate-400">
            <span>Filtering by:</span>
            {modalityFilter !== 'ALL' && (
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {modalityFilter}
              </span>
            )}
            {urgencyFilter !== 'ALL' && (
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {urgencyFilter}
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {statusFilter === 'VIEWED' ? 'Reviewed' : 'Awaiting Review'}
              </span>
            )}
            {searchTerm && (
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                &ldquo;{searchTerm}&rdquo;
              </span>
            )}
            <button
              onClick={() => {
                setModalityFilter('ALL');
                setUrgencyFilter('ALL');
                setStatusFilter('ALL');
                setSearchTerm('');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline ml-auto"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* ── Studies List / Feed ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3 bg-slate-900/40 rounded-xl border border-slate-800">
          <RefreshCw className="animate-spin text-indigo-400" size={32} />
          <p className="text-sm text-slate-400">Loading your shared imaging studies and findings...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5 text-rose-400" />
          <div className="space-y-1">
            <h3 className="font-semibold text-rose-200">Unable to load shared studies</h3>
            <p className="text-sm">{error}</p>
            <button
              onClick={() => loadSharedStudies()}
              className="mt-2 text-xs font-semibold px-3 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : filteredShares.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-4 bg-slate-900/50 rounded-2xl border border-slate-800/80 text-center">
          <div className="p-4 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700">
            <FileSearch size={36} />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-lg font-semibold text-white">No shared imaging studies found</h3>
            <p className="text-sm text-slate-400">
              {shares.length === 0
                ? 'No imaging studies or diagnostic findings have been shared with your clinical account yet.'
                : 'No studies match your current search and filter criteria.'}
            </p>
          </div>
          {(modalityFilter !== 'ALL' || urgencyFilter !== 'ALL' || statusFilter !== 'ALL' || searchTerm) && (
            <button
              onClick={() => {
                setModalityFilter('ALL');
                setUrgencyFilter('ALL');
                setStatusFilter('ALL');
                setSearchTerm('');
              }}
              className="text-xs px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
            >
              Clear Search Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredShares.map((share) => {
            const isUrgent =
              (share.urgency || '').toLowerCase() === 'urgent' ||
              (share.urgency || '').toLowerCase() === 'stat';
            const isReviewed = share.status === 'viewed';
            const isReportExpanded = expandedReportId === share.id;
            const hasReport =
              share.findings_narrative ||
              share.impression ||
              share.technique ||
              share.recommendations ||
              share.report_status;

            return (
              <div
                key={share.id}
                className={`bg-slate-900/90 border rounded-2xl p-5 transition-all shadow-md hover:shadow-indigo-500/5 ${
                  isUrgent
                    ? 'border-rose-500/40 hover:border-rose-500/60'
                    : isReviewed
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-indigo-500/40 hover:border-indigo-500/60 bg-gradient-to-r from-slate-900/90 via-indigo-950/20 to-slate-900/90'
                }`}
              >
                {/* ── Main Card Header Row ──────────────────────────────────── */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`px-3 py-2 rounded-xl text-center font-bold text-sm border flex flex-col items-center justify-center min-w-[70px] ${getModalityColor(
                        share.modality
                      )}`}
                    >
                      <span className="tracking-wider">{share.modality || 'SCAN'}</span>
                      {share.body_part && (
                        <span className="text-[10px] font-normal uppercase opacity-80 truncate max-w-[80px]">
                          {share.body_part}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-white hover:text-indigo-300 transition-colors">
                          {share.patient_name || 'Patient Name Unspecified'}
                        </h2>
                        {share.patient_id && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
                            MRN: {share.patient_id}
                          </span>
                        )}
                        {share.accession_number && (
                          <span className="text-xs text-slate-400 font-mono">
                            Acc: {share.accession_number}
                          </span>
                        )}
                        {isUrgent && (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/40 animate-pulse">
                            <AlertTriangle size={12} />
                            STAT / URGENT
                          </span>
                        )}
                        {isReviewed ? (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-medium border border-emerald-500/30">
                            <CheckCircle2 size={12} />
                            Reviewed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-xs font-medium border border-amber-500/30">
                            <Clock size={12} />
                            New / Unreviewed
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        {share.study_date && (
                          <span className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-slate-500" />
                            Exam Date: {new Date(share.study_date).toLocaleDateString()}
                          </span>
                        )}
                        {share.created_at && (
                          <span className="flex items-center gap-1.5">
                            <Share2 size={13} className="text-slate-500" />
                            Shared: {new Date(share.created_at).toLocaleDateString()}
                          </span>
                        )}
                        {share.shared_by_name && (
                          <span className="flex items-center gap-1.5">
                            <User size={13} className="text-slate-500" />
                            Referred by: {share.shared_by_name}
                          </span>
                        )}
                        {share.radiologist_name && (
                          <span className="flex items-center gap-1.5 text-indigo-300">
                            <Stethoscope size={13} className="text-indigo-400" />
                            Radiologist: Dr. {share.radiologist_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Primary Action Buttons ──────────────────────────────── */}
                  <div className="flex flex-wrap items-center gap-2 lg:self-center">
                    <button
                      onClick={() => handleOpenViewer(share)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                      <Eye size={16} />
                      <span>View Study Images</span>
                    </button>

                    <button
                      onClick={(e) => handleOpenNewTabViewer(share, e)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                      title="Open Diagnostic Viewer in New Window / Dedicated Screen"
                    >
                      <Maximize2 size={16} />
                    </button>

                    {hasReport && (
                      <button
                        onClick={(e) => handleDownloadReport(share, e)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-colors"
                        title="Download Radiologist Verified PDF Report"
                      >
                        <Download size={15} />
                        <span className="hidden sm:inline">PDF Report</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleStatus(share)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                        isReviewed
                          ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                          : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                      }`}
                      title={isReviewed ? 'Mark as Unreviewed' : 'Mark as Reviewed'}
                    >
                      <Check size={14} />
                      <span>{isReviewed ? 'Mark Unreviewed' : 'Mark Reviewed'}</span>
                    </button>
                  </div>
                </div>

                {/* ── Clinical Indication / Referral Note Banner ─────────────── */}
                {(share.clinical_indication || share.consultation_notes) && (
                  <div className="mt-4 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-start gap-2.5 text-xs">
                    <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-semibold text-cyan-300">Clinical Referral Indication: </span>
                      <span className="text-slate-300">
                        {share.clinical_indication || share.consultation_notes}
                      </span>
                    </div>
                  </div>
                )}

                {/* ── Dedicated Imaging Findings & Radiology Notes Section ───── */}
                {hasReport ? (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400">
                          <FileText size={15} />
                          <span>Radiology Findings & Diagnostic Notes</span>
                        </div>
                        {share.report_status && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              share.report_status === 'verified'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : share.report_status === 'final'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {share.report_status}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          setExpandedReportId(isReportExpanded ? null : share.id)
                        }
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                      >
                        <span>{isReportExpanded ? 'Show Less' : 'View Full Findings Narrative'}</span>
                        {isReportExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>

                    {/* Prominent Impression Highlight */}
                    {share.impression && (
                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/50 via-slate-900 to-indigo-950/40 border border-indigo-500/30 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 uppercase tracking-wide">
                          <Sparkles size={14} className="text-indigo-400" />
                          <span>Key Impression / Conclusion</span>
                        </div>
                        <p className="text-sm font-medium text-slate-100 whitespace-pre-line leading-relaxed">
                          {share.impression}
                        </p>
                      </div>
                    )}

                    {/* Expandable Full Report Content */}
                    {isReportExpanded && (
                      <div className="space-y-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-3.5 animate-fadeIn">
                        {share.technique && (
                          <div className="space-y-1">
                            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
                              Imaging Technique & Protocol:
                            </span>
                            <p className="text-slate-200">{share.technique}</p>
                          </div>
                        )}

                        {share.findings_narrative && (
                          <div className="space-y-1">
                            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
                              Detailed Findings Narrative:
                            </span>
                            <p className="text-slate-200 whitespace-pre-line leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 font-sans">
                              {share.findings_narrative}
                            </p>
                          </div>
                        )}

                        {share.recommendations && (
                          <div className="space-y-1">
                            <span className="font-semibold text-amber-400 uppercase tracking-wider text-[11px]">
                              Clinical Recommendations & Follow-Up:
                            </span>
                            <p className="text-slate-200 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                              {share.recommendations}
                            </p>
                          </div>
                        )}

                        {/* Diagnostic Codes */}
                        {((share.findings_codes && share.findings_codes.length > 0) ||
                          (share.diagnosis_codes && share.diagnosis_codes.length > 0)) && (
                          <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2 items-center">
                            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                              <Tag size={13} /> Coded Clinical Concepts:
                            </span>
                            {share.findings_codes?.map((fc, i) => (
                              <span
                                key={`fc-${i}`}
                                className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300 font-mono text-[10px]"
                              >
                                {fc.code} {fc.display ? `(${fc.display})` : ''}
                              </span>
                            ))}
                            {share.diagnosis_codes?.map((dc, i) => (
                              <span
                                key={`dc-${i}`}
                                className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-300 font-mono text-[10px]"
                              >
                                {dc.code} {dc.display ? `(${dc.display})` : ''}
                              </span>
                            ))}
                          </div>
                        )}

                        {share.radiologist_name && (
                          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/60">
                            <span>
                              Interpreted by: <strong className="text-slate-200">Dr. {share.radiologist_name}</strong>
                              {share.verified_by_name && (
                                <> &bull; Verified by: <strong className="text-slate-200">Dr. {share.verified_by_name}</strong></>
                              )}
                            </span>
                            {share.reported_at && (
                              <span>Reported: {new Date(share.reported_at).toLocaleString()}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                    <span className="italic flex items-center gap-1.5">
                      <Clock size={13} />
                      Radiologist report is pending acquisition or formal signing. Image series are available for immediate review.
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Diagnostic PACS Viewer Modal ────────────────────────────────────── */}
      {activeViewerShare && (
        <DiagnosticViewerModal
          isOpen={!!activeViewerShare}
          onClose={() => setActiveViewerShare(null)}
          shareToken={activeViewerShare.share_token}
          studyId={activeViewerShare.study_id}
          onShare={null}
        />
      )}
    </div>
  );
}
