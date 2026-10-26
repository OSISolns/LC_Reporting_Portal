import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Archive,
  Upload,
  Search,
  Grid,
  List,
  Filter,
  Eye,
  Share2,
  Trash2,
  FileText,
  Clock,
  Layers,
  HardDrive,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { getArchives, uploadArchiveFiles, deleteArchive } from '../../api/imaging';
import DiagnosticViewerModal from './DiagnosticViewerModal';
import ShareStudyModal from './ShareStudyModal';
import { toast } from 'react-hot-toast';

const MODALITIES = [
  { code: 'ALL', label: 'All Modalities' },
  { code: 'CT', label: 'CT Scan', color: 'bg-amber-500/10 text-amber-600 border-amber-300' },
  { code: 'MRI', label: 'MRI', color: 'bg-purple-500/10 text-purple-600 border-purple-300' },
  { code: 'OPG', label: 'OPG (Panoramic)', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-300' },
  { code: 'X-Ray', label: 'X-Ray', color: 'bg-blue-500/10 text-blue-600 border-blue-300' },
  { code: 'Mammography', label: 'Mammography', color: 'bg-pink-500/10 text-pink-600 border-pink-300' },
  { code: 'Ultrasound', label: 'Ultrasound', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-300' },
  { code: 'CBCT', label: 'CBCT (Dental 3D)', color: 'bg-teal-500/10 text-teal-600 border-teal-300' },
  { code: 'CEPHALOGRAM', label: 'Cephalogram', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-300' },
];

const MODALITY_BADGES = {
  'CT': 'bg-amber-100 text-amber-800 border-amber-300',
  'MRI': 'bg-purple-100 text-purple-800 border-purple-300',
  'OPG': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  'X-Ray': 'bg-blue-100 text-blue-800 border-blue-300',
  'Mammography': 'bg-pink-100 text-pink-800 border-pink-300',
  'Ultrasound': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'CBCT': 'bg-teal-100 text-teal-800 border-teal-300',
  'CEPHALOGRAM': 'bg-indigo-100 text-indigo-800 border-indigo-300',
};

export default function ImagingArchiveHub() {
  const [archives, setArchives] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);

  // Filters
  const [activeModality, setActiveModality] = useState('ALL');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState(null);
  const [shareItem, setShareItem] = useState(null);

  // Upload Form State
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadModality, setUploadModality] = useState('CT');
  const [uploadPatientId, setUploadPatientId] = useState('');
  const [uploadPatientName, setUploadPatientName] = useState('');
  const [uploadBodyRegion, setUploadBodyRegion] = useState('');
  const [uploadSeriesName, setUploadSeriesName] = useState('Diagnostic Series');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchArchives = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: 100,
        offset: 0,
        search: search.trim() || undefined,
        modality: activeModality !== 'ALL' ? activeModality : undefined,
      };
      const res = await getArchives(params);
      setArchives(res.data.data || []);
      setTotal(res.data.total || 0);
      setStats(res.data.stats || {});
    } catch {
      toast.error('Failed to load imaging archives.');
    } finally {
      setLoading(false);
    }
  }, [activeModality, search]);

  useEffect(() => {
    fetchArchives();
  }, [fetchArchives]);

  const handleDelete = async (id, fileName) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName || 'this archive'}"?`)) return;
    try {
      await deleteArchive(id);
      toast.success('Archive deleted.');
      fetchArchives();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete archive.');
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setUploadFiles((prev) => [...prev, ...filesArr]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      toast.error('Please select at least one image file.');
      return;
    }
    if (!uploadPatientId.trim() || !uploadPatientName.trim()) {
      toast.error('Patient ID and Name are mandatory.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('patient_id', uploadPatientId.trim());
      formData.append('patient_name', uploadPatientName.trim());
      formData.append('modality', uploadModality);
      formData.append('body_region', uploadBodyRegion.trim() || 'General');
      formData.append('series_name', uploadSeriesName.trim() || 'Diagnostic Series');
      formData.append('clinical_notes', uploadNotes.trim() || '');

      uploadFiles.forEach((f) => {
        formData.append('files', f);
      });

      const res = await uploadArchiveFiles(formData);
      toast.success(res.data.message || 'Archived successfully!');
      setUploadModalOpen(false);
      setUploadFiles([]);
      setUploadNotes('');
      fetchArchives();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // Stats calculation
  const totalStorageMb = useMemo(() => {
    const bytes = Object.values(stats).reduce((acc, curr) => acc + (curr.bytes || 0), 0);
    return (bytes / (1024 * 1024)).toFixed(1);
  }, [stats]);

  const ctMriCount = (stats['CT']?.count || 0) + (stats['MRI']?.count || 0);
  const dentalCount = (stats['OPG']?.count || 0) + (stats['CBCT']?.count || 0) + (stats['CEPHALOGRAM']?.count || 0);

  return (
    <div className="space-y-6">
      {/* ── Summary Stats Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Total Archived Files</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{total}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Across all 8 clinical modalities</div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Archive size={22} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Storage Volume</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{totalStorageMb} MB</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Secure in-portal archive</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <HardDrive size={22} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">CT Scan & MRI</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{ctMriCount} Files</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Cross-sectional series</div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Layers size={22} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Dental & Maxillofacial</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{dentalCount} Files</div>
            <div className="text-[11px] text-slate-400 mt-0.5">OPG, CBCT, Cephalogram</div>
          </div>
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* ── Toolbar: Search, Modality Pills, View Toggle, Upload Action ────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Patient Name, PID, Accession, Body Region..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm text-slate-800 font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Grid View"
              >
                <Grid size={15} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'table' ? 'bg-white shadow-sm text-slate-800 font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table List View"
              >
                <List size={15} />
              </button>
            </div>

            <button
              onClick={fetchArchives}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="Refresh Archives"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
            >
              <Upload size={14} /> Upload & Archive
            </button>
          </div>
        </div>

        {/* Modality Filter Pills (All 8 Modalities) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
          {MODALITIES.map((m) => {
            const count = m.code === 'ALL' ? total : (stats[m.code]?.count || 0);
            const active = activeModality === m.code;
            return (
              <button
                key={m.code}
                onClick={() => setActiveModality(m.code)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>{m.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Archives Content Display ──────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <RefreshCw size={24} className="animate-spin text-indigo-500 mx-auto mb-2" />
          <p className="text-xs">Loading organized imaging archives...</p>
        </div>
      ) : archives.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 space-y-3">
          <Archive size={40} className="mx-auto text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">No Archives Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No diagnostic images archived under this selection. Upload a new series or link from DICOM.
          </p>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            <Plus size={14} /> Upload First Study
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Visual Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {archives.map((item) => {
            const badgeClass = MODALITY_BADGES[item.modality] || 'bg-slate-100 text-slate-800 border-slate-200';
            const imgSrc = item.thumbnail_base64
              ? (item.thumbnail_base64.startsWith('data:') ? item.thumbnail_base64 : `data:${item.file_type || 'image/png'};base64,${item.thumbnail_base64}`)
              : (item.file_base64 ? `data:${item.file_type || 'image/png'};base64,${item.file_base64}` : null);

            return (
              <div
                key={item.id}
                className="group bg-white rounded-xl border border-slate-200 hover:border-indigo-400 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
              >
                {/* Thumbnail Preview with 1-click View Overlay */}
                <div
                  onClick={() => setViewerItem(item)}
                  className="relative h-44 bg-slate-950 flex items-center justify-center overflow-hidden cursor-pointer"
                >
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={item.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-slate-600 text-xs flex flex-col items-center gap-1">
                      <Archive size={28} />
                      <span>{item.file_name}</span>
                    </div>
                  )}

                  {/* Modality Tag */}
                  <span
                    className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shadow-sm ${badgeClass}`}
                  >
                    {item.modality}
                  </span>

                  {/* Slice index badge */}
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/70 text-white">
                    Slice #{item.slice_index || 1}
                  </span>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-indigo-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-xs font-semibold shadow-lg">
                      <Eye size={14} /> View in Lumina
                    </span>
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 truncate" title={item.patient_name}>
                        {item.patient_name}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {item.patient_id}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>{item.body_region || 'General'}</span>
                      <span className="truncate max-w-[120px]" title={item.series_name}>
                        {item.series_name || 'Diagnostic Series'}
                      </span>
                    </div>

                    {item.clinical_notes && (
                      <p className="text-[11px] text-slate-600 mt-2 bg-slate-50 p-1.5 rounded border border-slate-100 line-clamp-2">
                        {item.clinical_notes}
                      </p>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShareItem(item)}
                        className="p-1.5 rounded text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Share with Requesting Provider"
                      >
                        <Share2 size={14} />
                      </button>
                      <button
                        onClick={() => setViewerItem(item)}
                        className="p-1.5 rounded text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Open Diagnostic Viewer"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.file_name)}
                        className="p-1.5 rounded text-rose-500 hover:bg-rose-50 transition-colors"
                        title="Delete Archive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table List View */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Preview</th>
                <th className="py-3 px-4">Modality</th>
                <th className="py-3 px-4">Patient Name & PID</th>
                <th className="py-3 px-4">Body Region / Series</th>
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4">Archived Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {archives.map((item) => {
                const badgeClass = MODALITY_BADGES[item.modality] || 'bg-slate-100 text-slate-800';
                const imgSrc = item.thumbnail_base64
                  ? (item.thumbnail_base64.startsWith('data:') ? item.thumbnail_base64 : `data:${item.file_type || 'image/png'};base64,${item.thumbnail_base64}`)
                  : (item.file_base64 ? `data:${item.file_type || 'image/png'};base64,${item.file_base64}` : null);

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4">
                      <div
                        onClick={() => setViewerItem(item)}
                        className="w-10 h-10 rounded bg-slate-900 overflow-hidden cursor-pointer border border-slate-200 shrink-0"
                      >
                        {imgSrc ? (
                          <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Archive size={16} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${badgeClass}`}>
                        {item.modality}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      <div>{item.patient_name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{item.patient_id}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-800">{item.body_region || 'General'}</div>
                      <div className="text-[11px] text-slate-400">{item.series_name} (Slice #{item.slice_index || 1})</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500 truncate max-w-[150px]">
                      {item.file_name}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setViewerItem(item)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setShareItem(item)}
                          className="p-1 rounded text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                          title="Share"
                        >
                          <Share2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.file_name)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
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
      )}

      {/* ── Diagnostic Viewer Modal ───────────────────────────────────────── */}
      {viewerItem && (
        <DiagnosticViewerModal
          archiveItem={viewerItem}
          isOpen={!!viewerItem}
          onClose={() => setViewerItem(null)}
          onShare={() => {
            const itemToShare = viewerItem;
            setViewerItem(null);
            setShareItem(itemToShare);
          }}
        />
      )}

      {/* ── Share Study Modal ─────────────────────────────────────────────── */}
      {shareItem && (
        <ShareStudyModal
          archiveItem={shareItem}
          isOpen={!!shareItem}
          onClose={() => setShareItem(null)}
          onSuccess={() => {
            fetchArchives();
          }}
        />
      )}

      {/* ── Upload & Archive Modal ────────────────────────────────────────── */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Upload size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Archive Clinical Imaging</h2>
                  <p className="text-xs text-slate-300">
                    Store and organize CT, MRI, OPG, X-Ray, Mammography, Ultrasound, CBCT, Cephalogram
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Modality Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Clinical Modality <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {MODALITIES.filter((m) => m.code !== 'ALL').map((m) => (
                    <button
                      key={m.code}
                      type="button"
                      onClick={() => setUploadModality(m.code)}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        uploadModality === m.code
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m.code}
                    </button>
                  ))}
                </div>
              </div>

              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Patient ID (PID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PID-10492"
                    value={uploadPatientId}
                    onChange={(e) => setUploadPatientId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Patient Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={uploadPatientName}
                    onChange={(e) => setUploadPatientName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Anatomical Region & Series */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Anatomical Body Region
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Brain, Chest, Mandible, L-Spine"
                    value={uploadBodyRegion}
                    onChange={(e) => setUploadBodyRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Series / Protocol Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Axial C+, T2 Sagittal, Panoramic"
                    value={uploadSeriesName}
                    onChange={(e) => setUploadSeriesName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Clinical Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinical & Radiographer Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. High resolution diagnostic acquisition. Contrast administered..."
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* File Dropzone */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Image Series Files <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.dcm,.dicom"
                    id="archive-file-input"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="archive-file-input" className="cursor-pointer block space-y-1.5">
                    <Upload size={24} className="mx-auto text-indigo-600" />
                    <div className="text-slate-800 font-semibold">
                      Click to select or drag & drop diagnostic images
                    </div>
                    <div className="text-[11px] text-slate-400">
                      PNG, JPEG, WebP, DICOM files up to 50MB
                    </div>
                  </label>
                </div>

                {/* Selected Files List */}
                {uploadFiles.length > 0 && (
                  <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-white">
                    <div className="text-[11px] font-bold text-slate-500 mb-1">
                      Selected Files ({uploadFiles.length}):
                    </div>
                    {uploadFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 px-2 bg-slate-50 rounded">
                        <span className="font-mono text-slate-700 truncate max-w-[300px]">{f.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">{(f.size / 1024).toFixed(0)} KB</span>
                          <button
                            type="button"
                            onClick={() => setUploadFiles((prev) => prev.filter((_, idx) => idx !== i))}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || uploadFiles.length === 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  <Upload size={14} />
                  {uploading ? 'Archiving Files...' : `Archive ${uploadFiles.length} File(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
