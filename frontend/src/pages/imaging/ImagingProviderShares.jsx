import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Share2,
  Search,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  Copy,
  Check,
  ShieldAlert,
  Calendar,
  Layers,
  RefreshCw,
  Plus,
  Trash2,
  FileText,
  User
} from 'lucide-react';
import { getShares, getMySharedStudies, revokeShare } from '../../api/imaging';
import DiagnosticViewerModal from './DiagnosticViewerModal';
import ShareStudyModal from './ShareStudyModal';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const MODALITY_BADGES = {
  'CT': 'bg-amber-100 text-amber-800 border-amber-300',
  'MRI': 'bg-sky-100 text-sky-800 border-sky-300',
  'OPG': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  'X-Ray': 'bg-blue-100 text-blue-800 border-blue-300',
  'Mammography': 'bg-rose-100 text-rose-800 border-rose-300',
  'Ultrasound': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'CBCT': 'bg-teal-100 text-teal-800 border-teal-300',
  'CEPHALOGRAM': 'bg-[#1C69A0]/10 text-[#1C69A0] border-[#1C69A0]/30',
};

const URGENCY_BADGES = {
  'stat': 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
  'urgent': 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
  'routine': 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function ImagingProviderShares({ initialToken = null }) {
  const { user } = useAuth();
  const [shares, setShares] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total_shares: 0, pending_views: 0, viewed_shares: 0, urgent_shares: 0 });
  const [loading, setLoading] = useState(false);

  // Filter state
  const [tab, setTab] = useState('all'); // 'all' | 'my'
  const [search, setSearch] = useState('');
  const [modalityFilter, setModalityFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');

  // Modals & Viewer
  const [viewerToken, setViewerToken] = useState(initialToken);
  const [shareStudyModalOpen, setShareStudyModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const fetchShares = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'my') {
        const res = await getMySharedStudies();
        setShares(res.data.data || []);
        setTotal(res.data.data?.length || 0);
      } else {
        const params = {
          search: search.trim() || undefined,
          modality: modalityFilter || undefined,
          limit: 100,
          offset: 0,
        };
        const res = await getShares(params);
        setShares(res.data.data || []);
        setTotal(res.data.total || 0);
        if (res.data.stats) setStats(res.data.stats);
      }
    } catch {
      toast.error('Failed to load Imaging Data studies.');
    } finally {
      setLoading(false);
    }
  }, [tab, search, modalityFilter]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  useEffect(() => {
    if (initialToken) {
      setViewerToken(initialToken);
    }
  }, [initialToken]);

  const handleCopyLink = (share) => {
    const url = `${window.location.origin}/imaging?tab=shares&token=${share.share_token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(share.id);
    toast.success('Direct viewer link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Are you sure you want to revoke provider access to this study?')) return;
    try {
      await revokeShare(id);
      toast.success('Share access revoked.');
      fetchShares();
    } catch {
      toast.error('Failed to revoke share access.');
    }
  };

  const filteredShares = useMemo(() => {
    if (!urgencyFilter) return shares;
    return shares.filter((s) => s.urgency === urgencyFilter);
  }, [shares, urgencyFilter]);

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Total Studies Shared</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.total_shares || total}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">With requesting doctors & dentists</div>
          </div>
          <div className="p-3 bg-[#1C69A0]/10 text-[#1C69A0] rounded-xl">
            <Share2 size={22} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Viewed by Clinicians</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.viewed_shares || 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">In-Lumina diagnostic sessions</div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Pending Review</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.pending_views || 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Awaiting provider examination</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Urgent & STAT Shares</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">{stats.urgent_shares || 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">High priority consultations</div>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setTab('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${tab === 'all' ? 'bg-white shadow-sm text-[#1C69A0] font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              All Shared Studies
            </button>
            <button
              onClick={() => setTab('my')}
              className={`px-3 py-1.5 rounded-md transition-colors ${tab === 'my' ? 'bg-white shadow-sm text-[#1C69A0] font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Shared with Me (My Consultations)
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchShares}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShareStudyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1C69A0] hover:bg-[#16527D] rounded-lg transition-colors shadow-sm"
            >
              <Plus size={14} /> Share Study
            </button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search provider, patient, PID, clinical notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C69A0]"
            />
          </div>

          {/* Modality Selector */}
          <select
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
          >
            <option value="">All Modalities</option>
            <option value="CT">CT Scan</option>
            <option value="MRI">MRI</option>
            <option value="OPG">OPG</option>
            <option value="X-Ray">X-Ray</option>
            <option value="Mammography">Mammography</option>
            <option value="Ultrasound">Ultrasound</option>
            <option value="CBCT">CBCT</option>
            <option value="CEPHALOGRAM">Cephalogram</option>
          </select>

          {/* Urgency Selector */}
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
          >
            <option value="">All Urgencies</option>
            <option value="stat">STAT (Immediate)</option>
            <option value="urgent">Urgent</option>
            <option value="routine">Routine</option>
          </select>
        </div>
      </div>

      {/* ── Table of Shares ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <RefreshCw size={24} className="animate-spin text-[#1C69A0] mx-auto mb-2" />
          <p className="text-xs">Loading shared studies...</p>
        </div>
      ) : filteredShares.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 space-y-3">
          <Share2 size={40} className="mx-auto text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">No Shared Studies Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {tab === 'my'
              ? 'No studies have been directly shared with your provider profile yet.'
              : 'Share a CT Scan, MRI, OPG, X-Ray, Mammography, Ultrasound, CBCT, or Cephalogram with requesting doctors.'}
          </p>
          <button
            onClick={() => setShareStudyModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#1C69A0] bg-[#1C69A0]/10 hover:bg-[#1C69A0]/20 rounded-lg"
          >
            <Plus size={14} /> Share Study Now
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Urgency</th>
                <th className="py-3 px-4">Modality</th>
                <th className="py-3 px-4">Patient (PID & Name)</th>
                <th className="py-3 px-4">Requesting Provider</th>
                <th className="py-3 px-4">Shared By</th>
                <th className="py-3 px-4">Status & Views</th>
                <th className="py-3 px-4">Shared On</th>
                <th className="py-3 px-4 text-right">In-Lumina Viewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredShares.map((item) => {
                const modBadge = MODALITY_BADGES[item.modality] || 'bg-slate-100 text-slate-800';
                const urgBadge = URGENCY_BADGES[item.urgency] || 'bg-slate-100 text-slate-700';

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${urgBadge}`}>
                        {item.urgency}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${modBadge}`}>
                        {item.modality}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.patient_name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{item.patient_id}</div>
                      {item.clinical_indication && (
                        <div className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1">
                          {item.clinical_indication}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <User size={13} className="text-[#1C69A0]" />
                        {item.provider_name}
                      </div>
                      {item.consultation_notes && (
                        <div className="text-[11px] text-[#1C69A0] font-medium mt-0.5 line-clamp-1" title={item.consultation_notes}>
                          "{item.consultation_notes}"
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {item.shared_by_name || 'Imaging Tech'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${item.status === 'viewed'
                              ? 'bg-emerald-500'
                              : item.status === 'revoked'
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                        />
                        <span className="font-semibold capitalize text-slate-700">{item.status}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {item.view_count || 0} view(s)
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setViewerToken(item.share_token)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1C69A0] hover:bg-[#16527D] text-white transition-colors shadow-sm"
                          title="Open in Lumina Diagnostic Viewer"
                        >
                          <Eye size={13} /> View Images
                        </button>

                        <button
                          onClick={() => handleCopyLink(item)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Copy Link"
                        >
                          {copiedId === item.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        </button>

                        <button
                          onClick={() => handleRevoke(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Revoke Share"
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
      )}

      {/* ── Diagnostic Viewer Modal ───────────────────────────────────────── */}
      {viewerToken && (
        <DiagnosticViewerModal
          shareToken={viewerToken}
          isOpen={!!viewerToken}
          onClose={() => setViewerToken(null)}
          onShare={null}
        />
      )}

      {/* ── Share Study Modal ─────────────────────────────────────────────── */}
      {shareStudyModalOpen && (
        <ShareStudyModal
          isOpen={shareStudyModalOpen}
          onClose={() => setShareStudyModalOpen(false)}
          onSuccess={() => {
            setShareStudyModalOpen(false);
            fetchShares();
          }}
        />
      )}
    </div>
  );
}
