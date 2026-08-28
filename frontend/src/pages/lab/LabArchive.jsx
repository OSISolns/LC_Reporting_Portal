import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Archive, Upload, Search, Filter, X, Download, Eye, Pencil, Trash2,
  FileText, FileSpreadsheet, Image, File, RefreshCw, Shield, ShieldAlert,
  ShieldCheck, Lock, ChevronDown, Clock, User, List, LayoutGrid, History
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
  Public:       { color: 'bg-slate-100 text-slate-700 border-slate-300',   icon: <Shield size={11} />,      dot: 'bg-slate-400' },
  Internal:     { color: 'bg-blue-50 text-blue-800 border-blue-200',        icon: <ShieldCheck size={11} />, dot: 'bg-blue-500' },
  Confidential: { color: 'bg-amber-50 text-amber-800 border-amber-200',     icon: <ShieldAlert size={11} />, dot: 'bg-amber-500' },
  Restricted:   { color: 'bg-rose-50 text-rose-800 border-rose-200',        icon: <Lock size={11} />,        dot: 'bg-rose-600' },
};

const FILE_ICONS = {
  pdf:  <FileText size={20} className="text-rose-500" />,
  docx: <FileText size={20} className="text-blue-500" />,
  doc:  <FileText size={20} className="text-blue-500" />,
  xlsx: <FileSpreadsheet size={20} className="text-emerald-500" />,
  xls:  <FileSpreadsheet size={20} className="text-emerald-500" />,
  csv:  <FileSpreadsheet size={20} className="text-teal-500" />,
  png:  <Image size={20} className="text-purple-500" />,
  jpg:  <Image size={20} className="text-purple-500" />,
  jpeg: <Image size={20} className="text-purple-500" />,
};
const getFileIcon = (ext) => FILE_ICONS[(ext || '').toLowerCase()] || <File size={20} className="text-slate-400" />;

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
function UploadModal({ onClose, onUploaded }) {
  const [form, setForm] = useState({ title: '', description: '', category: 'Other', classification: 'Internal', document_date: '', expiry_date: '', version: '', reference_number: '', department: '', tags: '' });
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); if (!form.title) set('title', f.name.replace(/\.[^/.]+$/, '')); }
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); if (!form.title) set('title', f.name.replace(/\.[^/.]+$/, '')); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Please select a file.'); return; }
    if (!form.title.trim()) { toast.error('Title is required.'); return; }
    if (file.size > 25 * 1024 * 1024) { toast.error('File must be under 25 MB.'); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      await uploadDocument(fd);
      toast.success('Document archived successfully.');
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
          <h2 className="font-bold text-blue-950 text-base flex items-center gap-2">
            <Upload size={16} className="text-blue-700" /> Archive Document
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
              dragging ? 'border-blue-400 bg-blue-50' : file ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <input ref={fileRef} type="file" className="hidden" onChange={handleFile}
              accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.png,.jpg,.jpeg" />
            {file ? (
              <div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  {getFileIcon(file.name.split('.').pop())}
                  <span className="font-semibold text-sm text-slate-700">{file.name}</span>
                </div>
                <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                <p className="text-xs text-emerald-600 font-medium mt-1">Click to change file</p>
              </div>
            ) : (
              <>
                <Upload size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-500">Drop file here or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">PDF, DOCX, XLSX, TXT, CSV, PNG, JPG — max 25 MB</p>
              </>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Title *</label>
            <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              placeholder="Document title" value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>

          {/* Category + Classification */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Category</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
                value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Classification</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
                value={form.classification} onChange={e => set('classification', e.target.value)}>
                {CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Description / Notes</label>
            <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
              placeholder="Brief description of document content, purpose, or origin"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {/* Dates + Version + Ref */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Document Date</label>
              <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                value={form.document_date} onChange={e => set('document_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Expiry Date</label>
              <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Version</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                placeholder="e.g. v2.1" value={form.version} onChange={e => set('version', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Ref / Doc No.</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                placeholder="e.g. LC-SOP-2024-003" value={form.reference_number} onChange={e => set('reference_number', e.target.value)} />
            </div>
          </div>

          {/* Department + Tags */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Department</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
                value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">Select…</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Tags (comma-separated)</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                placeholder="e.g. qc, 2024, approved" value={form.tags} onChange={e => set('tags', e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={uploading}
              className="flex-1 py-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
              {uploading ? <><RefreshCw size={13} className="animate-spin" /> Archiving…</> : <><Upload size={13} /> Archive Document</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Detail Side Panel ─────────────────────────────────────────────────────────
function DetailPanel({ docMeta, isManager, onClose, onEdit, onDelete, onDownload }) {
  const [log, setLog] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const cfg = CLASSIFICATION_CONFIG[docMeta.classification] || CLASSIFICATION_CONFIG.Internal;

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const res = await downloadDocument(docMeta.id);
      setPreviewData(res.data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not load preview.');
    } finally { setPreviewing(false); }
  };

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

  const canPreview = ['pdf', 'png', 'jpg', 'jpeg'].includes((docMeta.file_extension || '').toLowerCase());

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-full max-w-sm bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{getFileIcon(docMeta.file_extension)}</div>
            <div>
              <p className="font-bold text-sm text-slate-900 leading-snug">{docMeta.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{docMeta.file_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer flex-shrink-0"><X size={14} /></button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* Classification + Category */}
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${cfg.color}`}>
              {cfg.icon} {docMeta.classification}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {docMeta.category}
            </span>
            {docMeta.version && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {docMeta.version}
              </span>
            )}
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { label: 'Document Date', value: formatDate(docMeta.document_date) },
              { label: 'Expiry Date',   value: formatDate(docMeta.expiry_date) },
              { label: 'Ref / Doc No.', value: docMeta.reference_number },
              { label: 'Department',    value: docMeta.department },
              { label: 'Size',          value: formatBytes(docMeta.file_size_bytes) },
              { label: 'File Type',     value: (docMeta.file_extension || '').toUpperCase() },
              { label: 'Uploaded By',   value: docMeta.uploaded_by_name },
              { label: 'Archived On',   value: formatDate(docMeta.created_at) },
              { label: 'Views',         value: docMeta.view_count },
              { label: 'Downloads',     value: docMeta.download_count },
            ].map(({ label, value }) => value ? (
              <div key={label}>
                <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">{label}</p>
                <p className="text-slate-700 font-medium mt-0.5">{value}</p>
              </div>
            ) : null)}
          </div>

          {docMeta.description && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</p>
              <p className="text-xs text-slate-600 leading-relaxed">{docMeta.description}</p>
            </div>
          )}

          {/* Tags */}
          {docMeta.tags && docMeta.tags !== '[]' && (() => {
            try {
              const tags = typeof docMeta.tags === 'string'
                ? (docMeta.tags.startsWith('[') ? JSON.parse(docMeta.tags) : docMeta.tags.split(',').map(t => t.trim()))
                : docMeta.tags;
              return tags.length > 0 ? (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[11px] font-medium border border-blue-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null;
            } catch { return null; }
          })()}

          {/* OCR text snippet */}
          {docMeta.ocr_text && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Extracted Text (preview)</p>
              <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-2.5 max-h-24 overflow-hidden">
                {docMeta.ocr_text.substring(0, 300)}…
              </p>
            </div>
          )}

          {/* Preview / Access log */}
          {previewData && (
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              {['pdf'].includes((docMeta.file_extension || '').toLowerCase()) ? (
                <iframe
                  src={`data:${previewData.file_type};base64,${previewData.file_base64}`}
                  className="w-full h-64"
                  title="Document preview"
                />
              ) : ['png', 'jpg', 'jpeg'].includes((docMeta.file_extension || '').toLowerCase()) ? (
                <img
                  src={`data:${previewData.file_type};base64,${previewData.file_base64}`}
                  alt={docMeta.title}
                  className="w-full object-contain max-h-64"
                />
              ) : null}
            </div>
          )}

          {/* Access Log */}
          {isManager && showLog && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Access Log</p>
              {log.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No access events recorded.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {log.map(entry => (
                    <div key={entry.id} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        entry.action === 'download' ? 'bg-blue-500' :
                        entry.action === 'delete' ? 'bg-rose-500' :
                        entry.action === 'update' ? 'bg-amber-500' : 'bg-slate-400'
                      }`} />
                      <div>
                        <p className="text-[11px] font-semibold text-slate-700 capitalize">{entry.action}</p>
                        <p className="text-[10px] text-slate-500">{entry.user_name} · {formatDate(entry.accessed_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-100 space-y-2 sticky bottom-0 bg-white">
          <div className="flex gap-2">
            {canPreview && !previewData && (
              <button onClick={handlePreview} disabled={previewing}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-60">
                <Eye size={13} /> {previewing ? 'Loading…' : 'Preview'}
              </button>
            )}
            <button onClick={onDownload}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer">
              <Download size={13} /> Download
            </button>
          </div>
          <div className="flex gap-2">
            {isManager && (
              <>
                <button onClick={onEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={handleLoadLog} disabled={loadingLog}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
                  <History size={13} /> {showLog ? 'Hide Log' : 'Access Log'}
                </button>
                <button onClick={onDelete}
                  className="p-2 border border-rose-200 rounded-xl text-rose-600 hover:bg-rose-50 transition-all cursor-pointer">
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Document Card ─────────────────────────────────────────────────────────────
function DocCard({ doc, onClick }) {
  const cfg = CLASSIFICATION_CONFIG[doc.classification] || CLASSIFICATION_CONFIG.Internal;
  const isExpiring = doc.expiry_date && (() => {
    const d = new Date(doc.expiry_date), n = new Date();
    return (d - n) / (1000 * 60 * 60 * 24) <= 30;
  })();

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group relative"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 group-hover:bg-slate-100 transition-all flex-shrink-0">
          {getFileIcon(doc.file_extension)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-slate-900 truncate leading-snug">{doc.title}</p>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">{doc.category}{doc.department ? ` · ${doc.department}` : ''}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${cfg.color}`}>
          {cfg.icon} {doc.classification}
        </span>
        <span className="text-[10px] text-slate-400">{formatBytes(doc.file_size_bytes)}</span>
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <Clock size={10} /> {formatDate(doc.document_date || doc.created_at)}
        </span>
        {doc.reference_number && (
          <span className="text-[10px] text-slate-500 font-mono truncate max-w-[100px]">{doc.reference_number}</span>
        )}
      </div>

      {isExpiring && (
        <div className="mt-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[10px] font-bold text-amber-700">
          ⚠ Expires {formatDate(doc.expiry_date)}
        </div>
      )}

      <div className="flex items-center gap-3 mt-2">
        <span className="text-[10px] text-slate-400 flex items-center gap-1"><Eye size={10} /> {doc.view_count}</span>
        <span className="text-[10px] text-slate-400 flex items-center gap-1"><Download size={10} /> {doc.download_count}</span>
        {doc.uploaded_by_name && (
          <span className="text-[10px] text-slate-400 flex items-center gap-1 ml-auto truncate"><User size={10} /> {doc.uploaded_by_name}</span>
        )}
      </div>
    </div>
  );
}

// ── Document List Row ─────────────────────────────────────────────────────────
function DocRow({ doc, onClick }) {
  const cfg = CLASSIFICATION_CONFIG[doc.classification] || CLASSIFICATION_CONFIG.Internal;
  return (
    <div onClick={onClick}
      className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer transition-all group">
      <div className="flex-shrink-0">{getFileIcon(doc.file_extension)}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-900 truncate">{doc.title}</p>
        <p className="text-[11px] text-slate-500 truncate">{doc.reference_number ? `${doc.reference_number} · ` : ''}{doc.category}</p>
      </div>
      <div className="hidden sm:flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${cfg.color}`}>
          {cfg.icon} {doc.classification}
        </span>
      </div>
      <div className="hidden md:block text-[11px] text-slate-400 w-24 text-right">{formatDate(doc.document_date || doc.created_at)}</div>
      <div className="hidden lg:block text-[11px] text-slate-400 w-16 text-right">{formatBytes(doc.file_size_bytes)}</div>
      <div className="flex items-center gap-2 text-[11px] text-slate-400 ml-2">
        <Eye size={11} />{doc.view_count}
        <Download size={11} />{doc.download_count}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LabArchive() {
  const { user } = useAuth();
  const userRole = (user?.role || '').toLowerCase();
  const isManager = MANAGER_ROLES.includes(userRole);

  const [docs, setDocs]             = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterCategory, setFCat]   = useState('');
  const [filterClass, setFClass]    = useState('');
  const [filterType, setFType]      = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [viewMode, setViewMode]     = useState('grid'); // 'grid' | 'list'
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDoc, setSelectedDoc]   = useState(null);
  const [detailData, setDetailData]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget]     = useState(null);
  const [filterOpen, setFilterOpen]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, page: 1, limit: 100 };
      if (filterCategory) params.category = filterCategory;
      if (filterClass)    params.classification = filterClass;
      if (filterType)     params.file_type = filterType;
      if (dateFrom)       params.date_from = dateFrom;
      if (dateTo)         params.date_to = dateTo;

      const res = await listDocuments(params);
      setDocs(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch {
      toast.error('Failed to load documents.');
    } finally { setLoading(false); }
  }, [search, filterCategory, filterClass, filterType, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const handleCardClick = async (doc) => {
    try {
      const res = await getDocumentMeta(doc.id);
      setDetailData(res.data.data);
      setSelectedDoc(doc);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Cannot open document.');
    }
  };

  const handleDownload = async (docId, fileName, mimeType) => {
    try {
      const res = await downloadDocument(docId);
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

  const activeFilters = [filterCategory, filterClass, filterType, dateFrom, dateTo].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans antialiased">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 px-6 py-5 border-b border-blue-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-800/70 rounded-xl border border-blue-700">
              <Archive size={20} className="text-blue-100" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Lab Archive</h1>
              <p className="text-xs text-blue-200/80">
                {total} document{total !== 1 ? 's' : ''} · Secure document repository
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 text-blue-200 hover:text-white hover:bg-blue-800 rounded-xl transition-all cursor-pointer border border-blue-800">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-blue-950 font-bold text-xs rounded-xl hover:bg-blue-50 transition-all cursor-pointer">
              <Upload size={13} /> Upload
            </button>
          </div>
        </div>
      </div>

      {/* ── Search + Filter Bar ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              placeholder="Search by title, reference, content, tags…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <button onClick={() => setFilterOpen(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              filterOpen || activeFilters > 0
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}>
            <Filter size={13} /> Filters {activeFilters > 0 && <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilters}</span>}
            <ChevronDown size={12} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={`p-2 cursor-pointer ${viewMode === 'grid' ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:bg-slate-50'}`}><LayoutGrid size={14} /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 cursor-pointer ${viewMode === 'list' ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:bg-slate-50'}`}><List size={14} /></button>
          </div>
        </div>

        {/* Filter Expand Panel */}
        {filterOpen && (
          <div className="max-w-7xl mx-auto mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={filterCategory} onChange={e => setFCat(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={filterClass} onChange={e => setFClass(e.target.value)}>
              <option value="">All Classifications</option>
              {CLASSIFICATIONS.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>
            <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={filterType} onChange={e => setFType(e.target.value)}>
              <option value="">All File Types</option>
              {['pdf', 'docx', 'xlsx', 'txt', 'csv', 'png', 'jpg'].map(t => <option key={t}>{t}</option>)}
            </select>
            <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From date" />
            <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To date" />
            {activeFilters > 0 && (
              <button onClick={() => { setFCat(''); setFClass(''); setFType(''); setDateFrom(''); setDateTo(''); }}
                className="col-span-full text-xs text-rose-600 font-semibold text-left cursor-pointer hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Document Body ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-slate-300" />
              Loading archive…
            </div>
          ) : docs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-20 text-center">
              <Archive size={44} className="mx-auto text-slate-200 mb-3" />
              <p className="font-bold text-slate-400 text-sm">No documents found</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                {search || activeFilters ? 'Try adjusting your search or filters' : 'Upload your first document to get started'}
              </p>
              {!search && !activeFilters && (
                <button onClick={() => setShowUpload(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-950 text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-all cursor-pointer">
                  <Upload size={13} /> Upload Document
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {docs.map(doc => (
                <DocCard key={doc.id} doc={doc} onClick={() => handleCardClick(doc)} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="w-6" />
                <div className="flex-1">Title</div>
                <div className="hidden sm:block w-28">Classification</div>
                <div className="hidden md:block w-24 text-right">Date</div>
                <div className="hidden lg:block w-16 text-right">Size</div>
                <div className="w-16 text-right">Activity</div>
              </div>
              {docs.map(doc => (
                <DocRow key={doc.id} doc={doc} onClick={() => handleCardClick(doc)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onUploaded={load} />
      )}

      {selectedDoc && detailData && (
        <DetailPanel
          docMeta={detailData}
          isManager={isManager}
          onClose={() => { setSelectedDoc(null); setDetailData(null); }}
          onEdit={() => {
            setEditTarget(detailData);
            setSelectedDoc(null); setDetailData(null);
          }}
          onDelete={() => {
            setDeleteTarget(detailData);
            setSelectedDoc(null); setDetailData(null);
          }}
          onDownload={() => handleDownload(detailData.id, detailData.file_name, detailData.file_type)}
        />
      )}

      {/* Edit modal (reuse upload form structure) */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-blue-950 text-sm flex items-center gap-2"><Pencil size={15} className="text-blue-700" /> Edit Document</h2>
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
    category: initial.category || 'Other', classification: initial.classification || 'Internal',
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
        <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          value={form.title} onChange={e => set('title', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Category</label>
          <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Classification</label>
          <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            value={form.classification} onChange={e => set('classification', e.target.value)}>
            {CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Description</label>
        <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Doc Date</label>
          <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            value={form.document_date} onChange={e => set('document_date', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Expiry Date</label>
          <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Version</label>
          <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            value={form.version} onChange={e => set('version', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Ref / Doc No.</label>
          <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            value={form.reference_number} onChange={e => set('reference_number', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Tags (comma-separated)</label>
        <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          value={form.tags} onChange={e => set('tags', e.target.value)} />
      </div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-sm font-bold cursor-pointer disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
