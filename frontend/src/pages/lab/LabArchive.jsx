import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Archive, Upload, Search, Filter, X, Download, Eye, Pencil, Trash2,
  FileText, FileSpreadsheet, Image, File, RefreshCw, Shield, ShieldAlert,
  ShieldCheck, Lock, ChevronDown, Clock, User, History, Folder, FolderOpen,
  ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  listDocuments, uploadDocument, getDocumentMeta,
  downloadDocument, updateDocumentMeta, deleteDocument, getAccessLog
} from '../../api/archive';

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'SOP', 'Quality Control', 'Calibration Certificate', 'Audit Report',
  'Training Record', 'Regulatory', 'Equipment Manual', 'Patient Data',
  'NCR Document', 'Other'
];

const CLASSIFICATIONS = ['Public', 'Internal', 'Confidential', 'Restricted'];

const DEPARTMENTS = [
  'Hematology', 'Biochemistry', 'Microbiology', 'Serology / Immunology',
  'Urinalysis', 'Blood Bank', 'Coagulation', 'Immunoassay', 'Molecular', 'General', 'Other'
];

const MANAGER_ROLES = ['lab_manager', 'lab_lead', 'lab_team_lead', 'quality_manager', 'qm', 'admin', 'deputy_coo', 'coo'];

const CLASSIFICATION_CONFIG = {
  Public:       { color: 'bg-slate-100 text-slate-700 border-slate-300',   icon: <Shield size={11} /> },
  Internal:     { color: 'bg-[#1B669E]/10 text-[#1B669E] border-[#1B669E]/30', icon: <ShieldCheck size={11} /> },
  Confidential: { color: 'bg-amber-50 text-amber-800 border-amber-200',     icon: <ShieldAlert size={11} /> },
  Restricted:   { color: 'bg-rose-50 text-rose-800 border-rose-200',        icon: <Lock size={11} /> },
};

const FILE_ICONS = {
  pdf:  <FileText size={18} className="text-rose-500 flex-shrink-0" />,
  docx: <FileText size={18} className="text-[#1B669E] flex-shrink-0" />,
  doc:  <FileText size={18} className="text-[#1B669E] flex-shrink-0" />,
  xlsx: <FileSpreadsheet size={18} className="text-emerald-500 flex-shrink-0" />,
  xls:  <FileSpreadsheet size={18} className="text-emerald-500 flex-shrink-0" />,
  csv:  <FileSpreadsheet size={18} className="text-teal-500 flex-shrink-0" />,
  png:  <Image size={18} className="text-purple-500 flex-shrink-0" />,
  jpg:  <Image size={18} className="text-purple-500 flex-shrink-0" />,
  jpeg: <Image size={18} className="text-purple-500 flex-shrink-0" />,
};
const getFileIcon = (ext) => FILE_ICONS[(ext || '').toLowerCase()] || <File size={18} className="text-slate-400 flex-shrink-0" />;

const formatBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const formatDate = (s) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return s; }
};

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose, onUploaded, defaultCategory }) {
  const [form, setForm] = useState({
    title: '', description: '', category: defaultCategory || 'SOP',
    classification: 'Internal', document_date: '', expiry_date: '',
    version: '', reference_number: '', department: '', tags: ''
  });
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(f => f.size <= 25 * 1024 * 1024);
    if (valid.length < newFiles.length) {
      toast.error('Some files were ignored because they exceed 25 MB.');
    }
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const combined = [...prev];
      valid.forEach(f => {
        if (!existingNames.has(f.name)) combined.push(f);
      });
      return combined;
    });

    if (valid.length === 1 && files.length === 0 && !form.title) {
      set('title', valid[0].name.replace(/\.[^/.]+$/, ''));
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files?.length) {
      addFiles(e.target.files);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) { toast.error('Please select at least one file to upload.'); return; }
    if (files.length === 1 && !form.title.trim()) { toast.error('Title is required for single document upload.'); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      const res = await uploadDocument(fd);
      toast.success(res.data?.message || `${files.length} document(s) archived successfully.`);
      onUploaded();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-bold text-[#1B669E] text-base flex items-center gap-2">
            <Upload size={16} className="text-[#1B669E]" /> Archive Document(s)
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer transition-all"><X size={15} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragging ? 'border-[#1B669E] bg-[#1B669E]/10' : files.length > 0 ? 'border-[#1B669E]/50 bg-[#1B669E]/5' : 'border-slate-300 hover:border-[#1B669E]/60 hover:bg-slate-50'
            }`}
          >
            <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileInput}
              accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.png,.jpg,.jpeg" />
            
            <Upload size={28} className="mx-auto text-[#1B669E] mb-2" />
            <p className="text-sm font-semibold text-slate-700">Drop files here or click to browse</p>
            <p className="text-xs text-slate-400 mt-1">Select single or multiple files (PDF, DOCX, XLSX, TXT, CSV, Images — max 25 MB each)</p>
          </div>

          {/* Selected File List */}
          {files.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
              <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <span>Selected Documents ({files.length})</span>
                <button type="button" onClick={() => setFiles([])} className="text-red-500 hover:underline cursor-pointer">Clear All</button>
              </div>
              {files.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    {getFileIcon(f.name.split('.').pop())}
                    <span className="font-medium text-slate-800 truncate max-w-[260px]">{f.name}</span>
                    <span className="text-slate-400 text-[10px]">({formatBytes(f.size)})</span>
                  </div>
                  <button type="button" onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500 p-1 cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
              {files.length > 1 ? 'Batch Title Prefix (Optional)' : 'Title *'}
            </label>
            <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30 focus:border-[#1B669E]"
              placeholder={files.length > 1 ? 'e.g. Q3 Laboratory SOPs (leave blank to use filenames)' : 'Document title'}
              value={form.title} onChange={e => set('title', e.target.value)} required={files.length === 1} />
          </div>

          {/* Category + Classification */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Category Folder</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30 focus:border-[#1B669E] bg-white"
                value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Classification</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30 focus:border-[#1B669E] bg-white"
                value={form.classification} onChange={e => set('classification', e.target.value)}>
                {CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Description / Notes</label>
            <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30 focus:border-[#1B669E] resize-none"
              placeholder="Brief description of document content, purpose, or origin"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {/* Dates + Version + Ref */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Document Date</label>
              <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30 focus:border-[#1B669E]"
                value={form.document_date} onChange={e => set('document_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Expiry Date</label>
              <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30 focus:border-[#1B669E]"
                value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Version</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30 focus:border-[#1B669E]"
                placeholder="e.g. v2.1" value={form.version} onChange={e => set('version', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Ref / Doc No.</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30 focus:border-[#1B669E]"
                placeholder="Auto-generated if left blank" value={form.reference_number} onChange={e => set('reference_number', e.target.value)} />
            </div>
          </div>

          {/* Department + Tags */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Department</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30 focus:border-[#1B669E] bg-white"
                value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">Select…</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Tags (comma-separated)</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30 focus:border-[#1B669E]"
                placeholder="e.g. qc, 2024, approved" value={form.tags} onChange={e => set('tags', e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={uploading}
              className="flex-1 py-2.5 bg-[#1B669E] hover:bg-[#155280] text-white rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm">
              {uploading ? <><RefreshCw size={13} className="animate-spin" /> Archiving…</> : <><Upload size={13} /> Archive Document</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Full Page Document Detail & Preview Workspace ─────────────────────────────
function DocumentDetailView({ docMeta, isManager, onBack, onEdit, onDelete, onDownload }) {
  const [log, setLog] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [previewing, setPreviewing] = useState(true);
  const [previewData, setPreviewData] = useState(null);

  const cfg = CLASSIFICATION_CONFIG[docMeta.classification] || CLASSIFICATION_CONFIG.Internal;

  useEffect(() => {
    let isMounted = true;
    const fetchPreview = async () => {
      setPreviewing(true);
      try {
        const res = await downloadDocument(docMeta.id, { mode: 'preview' });
        if (isMounted) setPreviewData(res.data.data);
      } catch {
        toast.error('Could not load document preview.');
      } finally {
        if (isMounted) setPreviewing(false);
      }
    };
    fetchPreview();
    return () => { isMounted = false; };
  }, [docMeta.id]);

  const handleLoadLog = async () => {
    if (showLog) { setShowLog(false); return; }
    setLoadingLog(true);
    try {
      const res = await getAccessLog(docMeta.id);
      setLog(res.data.data || []);
      setShowLog(true);
    } catch { toast.error('Failed to load access log.'); }
    finally { setLoadingLog(false); }
  };

  const ext = (docMeta.file_extension || '').toLowerCase();
  const canPreview = ['pdf', 'png', 'jpg', 'jpeg', 'txt', 'csv', 'json'].includes(ext);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Archive
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2.5">
            {getFileIcon(docMeta.file_extension)}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base leading-tight">{docMeta.title}</h1>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${cfg.color}`}>
                  {cfg.icon} {docMeta.classification}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {docMeta.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{docMeta.reference_number || docMeta.file_name}</p>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1B669E] hover:bg-[#155280] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Download size={14} /> Download Document
          </button>

          {isManager && (
            <>
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                onClick={handleLoadLog}
                disabled={loadingLog}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
              >
                <History size={13} /> {showLog ? 'Hide Access Log' : 'Access Log'}
              </button>
              <button
                onClick={onDelete}
                className="p-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                title="Delete Document"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Metadata & Document Details */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Metadata</h2>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Ref / Doc No.', value: docMeta.reference_number },
                { label: 'Department',    value: docMeta.department },
                { label: 'Document Date', value: formatDate(docMeta.document_date) },
                { label: 'Expiry Date',   value: formatDate(docMeta.expiry_date) },
                { label: 'File Size',     value: formatBytes(docMeta.file_size_bytes) },
                { label: 'File Format',   value: (docMeta.file_extension || '').toUpperCase() },
                { label: 'Uploaded By',   value: docMeta.uploaded_by_name },
                { label: 'Archived On',   value: formatDate(docMeta.created_at) },
                { label: 'Live Views',    value: docMeta.view_count },
                { label: 'Downloads',     value: docMeta.download_count },
              ].map(({ label, value }) => value ? (
                <div key={label} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">{label}</p>
                  <p className="text-slate-800 font-bold mt-0.5 truncate">{value}</p>
                </div>
              ) : null)}
            </div>

            {docMeta.description && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</p>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">{docMeta.description}</p>
              </div>
            )}

            {/* Tags */}
            {docMeta.tags && docMeta.tags !== '[]' && (() => {
              try {
                const tags = typeof docMeta.tags === 'string'
                  ? (docMeta.tags.startsWith('[') ? JSON.parse(docMeta.tags) : docMeta.tags.split(',').map(t => t.trim()))
                  : docMeta.tags;
                return tags.length > 0 ? (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag, i) => (
                        <span key={i} className="px-2.5 py-1 bg-[#1B669E]/10 text-[#1B669E] rounded-full text-xs font-semibold border border-[#1B669E]/20">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null;
              } catch { return null; }
            })()}

            {/* OCR Extracted Text */}
            {docMeta.ocr_text && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">OCR Extracted Text</p>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-36 overflow-y-auto font-mono">
                  {docMeta.ocr_text}
                </p>
              </div>
            )}
          </div>

          {/* Access Log */}
          {isManager && showLog && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Access Audit Log</h2>
              {log.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No access events recorded.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {log.map(entry => (
                    <div key={entry.id} className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        entry.action === 'download' ? 'bg-[#1B669E]' :
                        entry.action === 'delete' ? 'bg-rose-500' :
                        entry.action === 'update' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                      <div>
                        <p className="font-bold text-slate-800 capitalize">{entry.action}</p>
                        <p className="text-[11px] text-slate-500">{entry.user_name} · {formatDate(entry.accessed_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Full-Screen Document Preview Viewer Canvas */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[78vh]">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={15} className="text-[#1B669E]" />
                <span className="text-xs font-bold text-slate-700">Document Canvas Preview</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">{docMeta.file_name}</span>
            </div>

            <div className="flex-1 bg-slate-100 flex items-center justify-center relative overflow-hidden">
              {previewing ? (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <RefreshCw size={24} className="animate-spin text-[#1B669E]" />
                  <p className="text-xs font-semibold">Loading document canvas…</p>
                </div>
              ) : previewData ? (
                ext === 'pdf' ? (
                  <iframe
                    src={`data:${previewData.file_type};base64,${previewData.file_base64}`}
                    className="w-full h-full border-none"
                    title="Full Page PDF Preview"
                  />
                ) : ['png', 'jpg', 'jpeg'].includes(ext) ? (
                  <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                    <img
                      src={`data:${previewData.file_type};base64,${previewData.file_base64}`}
                      alt={docMeta.title}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                    />
                  </div>
                ) : ['txt', 'csv', 'json'].includes(ext) ? (
                  <div className="w-full h-full p-6 bg-white overflow-auto font-mono text-xs text-slate-800 leading-relaxed">
                    <pre className="whitespace-pre-wrap">{atob(previewData.file_base64)}</pre>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-700">Inline preview not available for .{ext} files</p>
                    <p className="text-xs text-slate-500 mt-1 mb-4">Click below to download and view in your native application.</p>
                    <button
                      onClick={onDownload}
                      className="px-4 py-2 bg-[#1B669E] hover:bg-[#155280] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      Download {docMeta.file_name}
                    </button>
                  </div>
                )
              ) : (
                <div className="text-center p-8">
                  <AlertOctagon size={36} className="mx-auto text-amber-500 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">Failed to render preview canvas.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function LabArchive() {
  const { user } = useAuth();
  const userRole = (user?.role || '').toLowerCase();
  const isManager = MANAGER_ROLES.includes(userRole);

  const [docs, setDocs]                 = useState([]);
  const [total, setTotal]               = useState(0);
  const [categoryCounts, setCatCounts] = useState({});
  const [loading, setLoading]           = useState(true);
  
  // Navigation & Filtering
  const [activeCategory, setActiveCategory] = useState('ALL'); // 'ALL' or category name
  const [search, setSearch]             = useState('');
  const [filterClass, setFClass]        = useState('');
  const [filterType, setFType]          = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [filterOpen, setFilterOpen]     = useState(false);

  // Pagination & Sorting
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(25);
  const [sortField, setSortField]       = useState('created_at');
  const [sortDir, setSortDir]           = useState('desc');

  // Modals & Side Panels
  const [showUpload, setShowUpload]     = useState(false);
  const [selectedDoc, setSelectedDoc]   = useState(null);
  const [detailData, setDetailData]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search,
        page,
        limit: pageSize
      };
      if (activeCategory !== 'ALL') params.category = activeCategory;
      if (filterClass) params.classification = filterClass;
      if (filterType)  params.file_type = filterType;
      if (dateFrom)    params.date_from = dateFrom;
      if (dateTo)      params.date_to = dateTo;

      const res = await listDocuments(params);
      setDocs(res.data?.data || []);
      setTotal(res.data?.total || 0);
      if (res.data?.categoryCounts) {
        setCatCounts(res.data.categoryCounts);
      }
    } catch {
      toast.error('Failed to load archive.');
    } finally { setLoading(false); }
  }, [search, activeCategory, filterClass, filterType, dateFrom, dateTo, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const handleCardClick = async (doc) => {
    try {
      const res = await getDocumentMeta(doc.id);
      const updatedMeta = res.data.data;
      setDetailData(updatedMeta);
      setSelectedDoc(updatedMeta);
      // Immediately reflect incremented view_count in table state
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, view_count: updatedMeta.view_count, last_accessed_at: updatedMeta.last_accessed_at } : d));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Cannot open document.');
    }
  };

  const handleDownload = async (docId) => {
    try {
      const res = await downloadDocument(docId, { mode: 'download' });
      const { file_base64, file_type, file_name } = res.data.data;
      const byteStr = atob(file_base64);
      const ab = new ArrayBuffer(byteStr.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
      const blob = new Blob([ab], { type: file_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file_name; a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started.');

      // Immediately reflect incremented download_count in table state and detail view
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, download_count: (d.download_count || 0) + 1, last_accessed_at: new Date().toISOString() } : d));
      setDetailData(prev => prev && prev.id === docId ? { ...prev, download_count: (prev.download_count || 0) + 1, last_accessed_at: new Date().toISOString() } : prev);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Download failed.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget.id);
      toast.success('Document permanently deleted.');
      setDeleteTarget(null);
      setSelectedDoc(null);
      setDetailData(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed.');
    }
  };

  // Sorting
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedDocs = [...docs].sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(total / pageSize) || 1;
  const activeFilters = [filterClass, filterType, dateFrom, dateTo].filter(Boolean).length;
  const totalAllDocs = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans antialiased overflow-hidden">

      {/* ── Header (#1B669E) ── */}
      <div className="bg-[#1B669E] px-6 py-4 border-b border-[#155280] flex-shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <Archive size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">Lab Archive</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#155280] text-white border border-white/20">
                  Document Management
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Categorized Document Repository &amp; OCR Engine · Gated Access Security
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer border border-white/20" title="Refresh">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-[#1B669E] font-bold text-xs rounded-xl hover:bg-slate-100 transition-all cursor-pointer shadow-sm">
              <Upload size={13} /> Archive Document
            </button>
          </div>
        </div>
      </div>

      {/* ── Category Folder Bar (Horizontal Scroll / Grid) ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Folder size={13} className="text-[#1B669E]" /> Category Folders
            </p>
            {activeCategory !== 'ALL' && (
              <button
                onClick={() => { setActiveCategory('ALL'); setPage(1); }}
                className="text-xs font-semibold text-[#1B669E] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Show All Categories
              </button>
            )}
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
            {/* "All" Folder */}
            <button
              onClick={() => { setActiveCategory('ALL'); setPage(1); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex-shrink-0 ${
                activeCategory === 'ALL'
                  ? 'bg-[#1B669E] text-white border-[#1B669E] shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <FolderOpen size={14} className={activeCategory === 'ALL' ? 'text-white' : 'text-slate-400'} />
              <span>All Documents</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeCategory === 'ALL' ? 'bg-[#155280] text-white' : 'bg-slate-200 text-slate-600'}`}>
                {totalAllDocs}
              </span>
            </button>

            {CATEGORIES.map(cat => {
              const count = categoryCounts[cat] || 0;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setPage(1); }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex-shrink-0 ${
                    isActive
                      ? 'bg-[#1B669E] text-white border-[#1B669E] shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-[#1B669E]/40 hover:bg-slate-50'
                  }`}
                >
                  <Folder size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{cat}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-[#155280] text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Toolbar: Search & Filters ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Breadcrumb / Category Status */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 w-full sm:w-auto">
            <span className="text-slate-400">Viewing:</span>
            <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-900 font-bold flex items-center gap-1.5">
              <Folder size={13} className="text-[#1B669E]" />
              {activeCategory === 'ALL' ? 'All Archive Folders' : activeCategory}
            </span>
            <span className="text-slate-400">({total} document{total !== 1 ? 's' : ''})</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-72">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30 focus:border-[#1B669E]"
                placeholder="Search title, ref number, OCR content..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setFilterOpen(f => !f)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                filterOpen || activeFilters > 0
                  ? 'bg-[#1B669E]/10 text-[#1B669E] border-[#1B669E]/30'
                  : 'text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter size={12} /> Filters {activeFilters > 0 && <span className="bg-[#1B669E] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilters}</span>}
              <ChevronDown size={11} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Dropdown */}
        {filterOpen && (
          <div className="max-w-7xl mx-auto mt-2.5 pt-2.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30"
              value={filterClass}
              onChange={e => { setFClass(e.target.value); setPage(1); }}
            >
              <option value="">All Classifications</option>
              {CLASSIFICATIONS.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>

            <select
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30"
              value={filterType}
              onChange={e => { setFType(e.target.value); setPage(1); }}
            >
              <option value="">All File Extensions</option>
              {['pdf', 'docx', 'xlsx', 'txt', 'csv', 'png', 'jpg'].map(t => <option key={t}>{t}</option>)}
            </select>

            <input
              type="date"
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              placeholder="From Date"
            />

            <input
              type="date"
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              placeholder="To Date"
            />

            {activeFilters > 0 && (
              <button
                onClick={() => { setFClass(''); setFType(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                className="col-span-full text-xs text-rose-600 font-semibold text-left cursor-pointer hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── High-Performance Content Table ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
              <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-[#1B669E]" />
              Loading archive documents…
            </div>
          ) : sortedDocs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-16 text-center">
              <Archive size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-slate-500 text-sm">No documents found in this folder</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                {search || activeFilters ? 'Try clearing your search or filters' : 'Upload a document into this category'}
              </p>
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B669E] text-white text-xs font-bold rounded-xl hover:bg-[#155280] transition-all cursor-pointer shadow-sm"
              >
                <Upload size={13} /> Archive Document
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              
              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4 w-10 text-center">#</th>
                      <th className="py-3 px-4 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('title')}>
                        <div className="flex items-center gap-1">
                          Document Title &amp; File
                          <ArrowUpDown size={11} />
                        </div>
                      </th>
                      <th className="py-3 px-4 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('reference_number')}>
                        <div className="flex items-center gap-1">
                          Ref Number
                          <ArrowUpDown size={11} />
                        </div>
                      </th>
                      {activeCategory === 'ALL' && <th className="py-3 px-4">Category</th>}
                      <th className="py-3 px-4">Classification</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('document_date')}>
                        <div className="flex items-center gap-1">
                          Date
                          <ArrowUpDown size={11} />
                        </div>
                      </th>
                      <th className="py-3 px-4 cursor-pointer hover:text-slate-900 text-right" onClick={() => toggleSort('file_size_bytes')}>
                        <div className="flex items-center justify-end gap-1">
                          Size
                          <ArrowUpDown size={11} />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-center">Views / Downloads</th>
                      <th className="py-3 px-4 text-right pr-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                    {sortedDocs.map((doc, idx) => {
                      const cfg = CLASSIFICATION_CONFIG[doc.classification] || CLASSIFICATION_CONFIG.Internal;
                      const rowIndex = (page - 1) * pageSize + idx + 1;
                      return (
                        <tr
                          key={doc.id}
                          className="hover:bg-[#1B669E]/5 transition-colors group cursor-pointer"
                          onClick={() => handleCardClick(doc)}
                        >
                          <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">{rowIndex}</td>
                          
                          {/* Title & File Name */}
                          <td className="py-3 px-4 max-w-xs">
                            <div className="flex items-center gap-2.5">
                              {getFileIcon(doc.file_extension)}
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-900 group-hover:text-[#1B669E] transition-colors truncate leading-tight">
                                  {doc.title}
                                </p>
                                <p className="text-[10.5px] text-slate-400 truncate mt-0.5">
                                  {doc.file_name} {doc.version ? `· ${doc.version}` : ''}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Reference Number */}
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600 font-semibold whitespace-nowrap">
                            {doc.reference_number || '—'}
                          </td>

                          {/* Category (if ALL) */}
                          {activeCategory === 'ALL' && (
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                <Folder size={11} className="text-slate-500" /> {doc.category}
                              </span>
                            </td>
                          )}

                          {/* Classification */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold border ${cfg.color}`}>
                              {cfg.icon} {doc.classification}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {doc.department || 'General'}
                          </td>

                          {/* Date */}
                          <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                            {formatDate(doc.document_date || doc.created_at)}
                          </td>

                          {/* File Size */}
                          <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {formatBytes(doc.file_size_bytes)}
                          </td>

                          {/* Views / Downloads */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              <span title="Views" className="flex items-center gap-0.5"><Eye size={10} /> {doc.view_count}</span>
                              <span className="text-slate-300">|</span>
                              <span title="Downloads" className="flex items-center gap-0.5"><Download size={10} /> {doc.download_count}</span>
                            </span>
                          </td>

                          {/* Quick Actions */}
                          <td className="py-3 px-4 text-right pr-5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleCardClick(doc)}
                                className="p-1.5 text-slate-400 hover:text-[#1B669E] hover:bg-[#1B669E]/10 rounded-lg transition-all cursor-pointer"
                                title="View Details / Preview"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => handleDownload(doc.id, doc.file_name, doc.file_type)}
                                className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-100/70 rounded-lg transition-all cursor-pointer"
                                title="Download Document"
                              >
                                <Download size={14} />
                              </button>
                              {isManager && (
                                <button
                                  onClick={() => setDeleteTarget(doc)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100/70 rounded-lg transition-all cursor-pointer"
                                  title="Delete Document"
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

              {/* Table Footer / Pagination Controls */}
              <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <span>
                    Showing <strong>{(page - 1) * pageSize + 1}</strong> to <strong>{Math.min(page * pageSize, total)}</strong> of <strong>{total}</strong> documents
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">| Per page:</span>
                    <select
                      className="border border-slate-200 rounded-lg px-2 py-1 bg-white text-xs text-slate-700 focus:outline-none"
                      value={pageSize}
                      onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {/* Page Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <span className="px-3 py-1 font-bold text-slate-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1"
                  >
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={load}
          defaultCategory={activeCategory !== 'ALL' ? activeCategory : 'SOP'}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-[#1B669E] text-sm flex items-center gap-2"><Pencil size={15} className="text-[#1B669E]" /> Edit Document</h2>
              <button onClick={() => setEditTarget(null)} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"><X size={14} /></button>
            </div>
            <EditForm
              initial={editTarget}
              onSave={async (data) => {
                try {
                  await updateDocumentMeta(editTarget.id, data);
                  toast.success('Document updated.');
                  setEditTarget(null);
                  load();
                } catch (err) {
                  toast.error(err?.response?.data?.message || 'Update failed.');
                }
              }}
              onClose={() => setEditTarget(null)}
            />
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200"><Trash2 size={18} className="text-rose-600" /></div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Delete Document</h3>
                <p className="text-xs text-slate-500">This is permanent and cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-700">Delete <strong>{deleteTarget.title}</strong>?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-all cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Edit Form (inner component) ───────────────────────────────────────────────
function EditForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    title: initial.title || '', description: initial.description || '',
    category: initial.category || 'SOP', classification: initial.classification || 'Internal',
    document_date: initial.document_date || '', expiry_date: initial.expiry_date || '',
    version: initial.version || '', reference_number: initial.reference_number || '',
    department: initial.department || '',
    tags: (() => {
      try {
        const t = initial.tags;
        if (!t || t === '[]') return '';
        return (typeof t === 'string' && t.startsWith('[')) ? JSON.parse(t).join(', ') : t;
      } catch { return initial.tags || ''; }
    })(),
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tags = form.tags ? JSON.stringify(form.tags.split(',').map(t => t.trim()).filter(Boolean)) : '[]';
      await onSave({ ...form, tags });
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Title *</label>
        <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30 focus:border-[#1B669E]"
          value={form.title} onChange={e => set('title', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Category</label>
          <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30"
            value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Classification</label>
          <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30"
            value={form.classification} onChange={e => set('classification', e.target.value)}>
            {CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Description</label>
        <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30"
          value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Doc Date</label>
          <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30"
            value={form.document_date} onChange={e => set('document_date', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Expiry Date</label>
          <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30"
            value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Version</label>
          <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30"
            value={form.version} onChange={e => set('version', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Ref / Doc No.</label>
          <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30"
            value={form.reference_number} onChange={e => set('reference_number', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Tags (comma-separated)</label>
        <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30"
          value={form.tags} onChange={e => set('tags', e.target.value)} />
      </div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 bg-[#1B669E] hover:bg-[#155280] text-white rounded-xl text-sm font-bold cursor-pointer disabled:opacity-60 shadow-sm">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
