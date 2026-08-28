import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Download, Eye, FileText, Calendar, User, Tag,
  Clock, Shield, Hash, RefreshCw, Copy, Check, ExternalLink,
  Layers, Lock, AlertOctagon, History
} from 'lucide-react';
import { getDocumentMeta, downloadDocument, getAccessLog } from '../../api/archive';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const CLASSIFICATION_CONFIG = {
  Public:       { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <Shield size={13} /> },
  Internal:     { color: 'bg-blue-50 text-blue-700 border-blue-200',          icon: <Shield size={13} /> },
  Confidential: { color: 'bg-amber-50 text-amber-700 border-amber-200',       icon: <Lock size={13} /> },
  Restricted:   { color: 'bg-rose-50 text-rose-700 border-rose-200',          icon: <Lock size={13} /> },
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const formatDate = (s) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return s; }
};

export default function LabDocumentViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'ocr' | 'logs'
  const [copiedRef, setCopiedRef] = useState(false);

  const userRole = (user?.role || '').toLowerCase();
  const isManager = ['lab_manager', 'quality_manager', 'qm', 'admin', 'deputy_coo', 'coo'].includes(userRole);

  useEffect(() => {
    fetchDocAndPreview();
  }, [id]);

  const fetchDocAndPreview = async () => {
    setLoading(true);
    setLoadingPreview(true);
    try {
      // 1. Fetch metadata (increments view_count on backend)
      const metaRes = await getDocumentMeta(id);
      const meta = metaRes.data.data;
      setDoc(meta);

      // 2. Fetch base64 file preview (mode: preview)
      const prevRes = await downloadDocument(id, { mode: 'preview' });
      setPreviewData(prevRes.data.data);

      // 3. Fetch access logs if manager
      try {
        const logRes = await getAccessLog(id);
        setLogs(logRes.data.data || []);
      } catch { /* non-critical */ }

    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load document.');
    } finally {
      setLoading(false);
      setLoadingPreview(false);
    }
  };

  const handleDownload = async () => {
    if (!doc) return;
    try {
      const res = await downloadDocument(doc.id, { mode: 'download' });
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

      setDoc(prev => prev ? { ...prev, download_count: (prev.download_count || 0) + 1 } : prev);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Download failed.');
    }
  };

  const handleCopyRef = () => {
    if (doc?.reference_number) {
      navigator.clipboard.writeText(doc.reference_number);
      setCopiedRef(true);
      toast.success('Reference number copied!');
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <RefreshCw size={32} className="animate-spin text-[#1B669E] mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading Document Page…</p>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md text-center shadow-lg space-y-4">
          <AlertOctagon size={44} className="text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Document Unavailable</h2>
          <p className="text-sm text-slate-500">The requested document could not be found or you do not have permission to view it.</p>
          <button onClick={() => navigate('/lab/archive')}
            className="px-4 py-2.5 bg-[#1B669E] text-white font-bold rounded-xl text-sm hover:bg-[#155280] transition-all cursor-pointer inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Return to Archive
          </button>
        </div>
      </div>
    );
  }

  const cfg = CLASSIFICATION_CONFIG[doc.classification] || CLASSIFICATION_CONFIG.Internal;
  const ext = (doc.file_extension || '').toLowerCase();
  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg'].includes(ext);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* ── TOP HEADER BAR ────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm px-6 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/lab/archive')}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold">
            <ArrowLeft size={16} /> Archive
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 truncate">
              <h1 className="font-bold text-slate-900 text-base truncate">{doc.title}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg.color}`}>
                {cfg.icon} {doc.classification}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {doc.category}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono flex items-center gap-2 mt-0.5">
              <span>{doc.reference_number || 'No Ref No.'}</span>
              {doc.reference_number && (
                <button onClick={handleCopyRef} className="hover:text-[#1B669E] cursor-pointer" title="Copy Reference Number">
                  {copiedRef ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                </button>
              )}
              <span>· {doc.file_name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-4 text-xs text-slate-500 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="flex items-center gap-1" title="Total Views"><Eye size={14} className="text-[#1B669E]" /> <strong className="text-slate-800">{doc.view_count || 0}</strong> Views</span>
            <span className="flex items-center gap-1" title="Total Downloads"><Download size={14} className="text-emerald-600" /> <strong className="text-slate-800">{doc.download_count || 0}</strong> Downloads</span>
          </div>
          <button onClick={handleDownload}
            className="px-4 py-2 bg-[#1B669E] hover:bg-[#155280] text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm">
            <Download size={14} /> Download Document
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT (SPLIT VIEW) ─────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4 max-w-[1920px] w-full mx-auto">
        {/* LEFT / PREVIEW AREA */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-slate-200 px-4 py-2.5 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'preview' ? 'bg-[#1B669E] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/60'
                }`}>
                <Eye size={14} /> Document Preview
              </button>
              {doc.ocr_text && (
                <button onClick={() => setActiveTab('ocr')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'ocr' ? 'bg-[#1B669E] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/60'
                  }`}>
                  <FileText size={14} /> OCR Extracted Text
                </button>
              )}
              {isManager && (
                <button onClick={() => setActiveTab('logs')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'logs' ? 'bg-[#1B669E] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/60'
                  }`}>
                  <History size={14} /> Access Audit Log ({logs.length})
                </button>
              )}
            </div>
            <span className="text-xs text-slate-400 font-mono uppercase">{ext} format · {formatBytes(doc.file_size_bytes)}</span>
          </div>

          {/* TAB 1: PREVIEW */}
          {activeTab === 'preview' && (
            <div className="flex-1 bg-slate-900/5 relative flex items-center justify-center p-2 overflow-auto min-h-[600px]">
              {loadingPreview ? (
                <div className="text-center py-12">
                  <RefreshCw size={24} className="animate-spin text-[#1B669E] mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Decrypting & Rendering Document…</p>
                </div>
              ) : previewData ? (
                isPdf ? (
                  <iframe
                    src={`data:${previewData.file_type};base64,${previewData.file_base64}#toolbar=1`}
                    className="w-full h-full min-h-[750px] rounded-xl border border-slate-200 bg-white shadow-sm"
                    title={doc.title}
                  />
                ) : isImage ? (
                  <div className="max-w-full max-h-full p-4 flex items-center justify-center">
                    <img
                      src={`data:${previewData.file_type};base64,${previewData.file_base64}`}
                      alt={doc.title}
                      className="max-w-full max-h-[750px] object-contain rounded-xl shadow-md border border-slate-200 bg-white"
                    />
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-lg text-center shadow-sm space-y-4 my-auto">
                    <FileText size={48} className="text-[#1B669E] mx-auto" />
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{doc.file_name}</h3>
                      <p className="text-xs text-slate-500 mt-1">Direct inline preview is available for PDF & Image formats.</p>
                    </div>
                    <button onClick={handleDownload}
                      className="px-5 py-2.5 bg-[#1B669E] hover:bg-[#155280] text-white font-bold rounded-xl text-xs transition-all cursor-pointer inline-flex items-center gap-2 shadow-sm">
                      <Download size={15} /> Download & Open File
                    </button>
                  </div>
                )
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">Preview unavailable.</div>
              )}
            </div>
          )}

          {/* TAB 2: OCR TEXT */}
          {activeTab === 'ocr' && (
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50 font-mono text-xs text-slate-700 leading-relaxed space-y-4">
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800">Indexed OCR Text Search Content</span>
                <button onClick={() => { navigator.clipboard.writeText(doc.ocr_text); toast.success('OCR text copied!'); }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5">
                  <Copy size={13} /> Copy OCR Text
                </button>
              </div>
              <pre className="whitespace-pre-wrap bg-white p-5 rounded-xl border border-slate-200 text-slate-800 font-mono text-xs leading-relaxed shadow-sm">
                {doc.ocr_text}
              </pre>
            </div>
          )}

          {/* TAB 3: AUDIT LOG */}
          {activeTab === 'logs' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-3 bg-slate-50">
              <h4 className="font-bold text-xs text-slate-600 uppercase tracking-wider">Access History ({logs.length} events)</h4>
              {logs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No access events recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map(log => (
                    <div key={log.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          log.action === 'download' ? 'bg-emerald-500' :
                          log.action === 'delete' ? 'bg-rose-500' :
                          log.action === 'update' ? 'bg-amber-500' : 'bg-[#1B669E]'
                        }`} />
                        <div>
                          <p className="font-bold text-slate-800 capitalize">{log.action}</p>
                          <p className="text-slate-500 text-[11px]">{log.user_name || 'Staff User'}</p>
                        </div>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">{formatDate(log.accessed_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR / METADATA PANEL */}
        <div className="w-80 bg-white border border-slate-200 rounded-2xl p-5 space-y-5 overflow-y-auto flex-shrink-0 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider text-xs">Document Metadata</h3>

          <div className="space-y-3.5 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title</p>
              <p className="font-semibold text-slate-800 mt-0.5 leading-snug">{doc.title}</p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reference Number</p>
              <p className="font-mono text-slate-700 mt-0.5">{doc.reference_number || '—'}</p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Classification Level</p>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border mt-1 ${cfg.color}`}>
                {cfg.icon} {doc.classification}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document Date</p>
                <p className="font-medium text-slate-700 mt-0.5">{formatDate(doc.document_date)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expiry Date</p>
                <p className="font-medium text-slate-700 mt-0.5">{formatDate(doc.expiry_date)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-2">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category Folder</p>
                <p className="font-semibold text-[#1B669E] mt-0.5">{doc.category}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Version</p>
                <p className="font-semibold text-slate-700 mt-0.5">{doc.version || 'v1.0'}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Uploaded By</p>
              <p className="font-medium text-slate-700 mt-0.5 flex items-center gap-1.5">
                <User size={13} className="text-slate-400" /> {doc.uploaded_by_name || 'System Staff'}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Archived Date</p>
              <p className="font-medium text-slate-700 mt-0.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" /> {formatDate(doc.created_at)}
              </p>
            </div>

            {doc.description && (
              <div className="border-t border-slate-100 pt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description / Notes</p>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {doc.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
