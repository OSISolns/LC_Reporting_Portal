import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Archive,
  Upload,
  Search,
  Grid,
  List,
  Folder,
  FolderOpen,
  Tag,
  ChevronRight,
  ChevronDown,
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
  X,
  User,
  Activity,
  HeartPulse,
  Brain,
  Bone,
  Stethoscope,
  Smile,
  Shield,
  Download
} from 'lucide-react';
import { getArchives, uploadArchiveFiles, deleteArchive } from '../../api/imaging';
import PatientAutocomplete from '../../components/PatientAutocomplete';
import { getPatientByPid } from '../../api/patients';
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
  { code: 'CEPHALOGRAM', label: 'Cephalogram', color: 'bg-slate-500/10 text-slate-700 border-slate-300' },
];

const MODALITY_BADGES = {
  'CT': 'bg-amber-100 text-amber-800 border-amber-300',
  'MRI': 'bg-purple-100 text-purple-800 border-purple-300',
  'OPG': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  'X-Ray': 'bg-blue-100 text-blue-800 border-blue-300',
  'Mammography': 'bg-pink-100 text-pink-800 border-pink-300',
  'Ultrasound': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'CBCT': 'bg-teal-100 text-teal-800 border-teal-300',
  'CEPHALOGRAM': 'bg-slate-100 text-slate-800 border-slate-300',
};

const CATEGORIES = [
  { id: 'Dental & Maxillofacial', label: 'Dental & Maxillofacial', icon: Smile, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { id: 'Neuroradiology & Head/Neck', label: 'Neuroradiology & Head/Neck', icon: Brain, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'Spine & Musculoskeletal', label: 'Spine & Musculoskeletal', icon: Bone, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'Thoracic & Pulmonary', label: 'Thoracic & Pulmonary (Chest)', icon: Activity, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'Abdomen & Pelvis', label: 'Abdomen & Pelvis', icon: Stethoscope, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: "Women's Health & Breast", label: "Women's Health & Breast", icon: HeartPulse, color: 'text-pink-600 bg-pink-50 border-pink-200' },
  { id: 'Cardiovascular & Vascular', label: 'Cardiovascular & Vascular', icon: HeartPulse, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { id: 'General Clinical', label: 'General Clinical', icon: Shield, color: 'text-slate-600 bg-slate-50 border-slate-200' },
];

export default function ImagingArchiveHub() {
  const [archives, setArchives] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ modalities: {}, categories: {}, patientFolders: [] });
  const [loading, setLoading] = useState(false);

  // View & classification modes: 'folders' | 'categories' | 'modalities' | 'list' | 'grid'
  const [viewMode, setViewMode] = useState('list');
  const [activeModality, setActiveModality] = useState('ALL');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [search, setSearch] = useState('');

  // Folder navigation state
  const [selectedFolderPatientId, setSelectedFolderPatientId] = useState(null);

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState(null);
  const [shareItem, setShareItem] = useState(null);

  // Upload Form State
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadModality, setUploadModality] = useState('CT');
  const [uploadCategory, setUploadCategory] = useState('Dental & Maxillofacial');
  const [uploadPatientId, setUploadPatientId] = useState('');
  const [uploadPatientName, setUploadPatientName] = useState('');
  const [uploadBodyRegion, setUploadBodyRegion] = useState('');
  const [uploadSeriesName, setUploadSeriesName] = useState('Diagnostic Series');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sukraaPatient, setSukraaPatient] = useState(null);
  const [pullingFromSukraa, setPullingFromSukraa] = useState(false);

  const handleSukraaPatientSelect = (p) => {
    if (!p) return;
    setUploadPatientId(p.pid || p.patient_id || '');
    setUploadPatientName(p.full_name || p.name || '');
    setSukraaPatient(p);
    toast.success(`Patient selected from Sukraa: ${p.full_name || p.pid}`);
  };

  const handlePullFromSukraa = async () => {
    const pid = (uploadPatientId || '').trim();
    if (!pid) {
      toast.error('Enter a Patient ID (PID) to pull from Sukraa.');
      return;
    }
    setPullingFromSukraa(true);
    try {
      const res = await getPatientByPid(pid);
      if (res.data?.success && res.data?.data) {
        const p = res.data.data;
        setUploadPatientId(p.pid || pid);
        setUploadPatientName(p.full_name || p.name || '');
        setSukraaPatient(p);
        toast.success(`Patient details pulled from Sukraa: ${p.full_name || pid}`);
      } else {
        toast.error(`Patient with PID "${pid}" not found in Sukraa.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to pull PID "${pid}" from Sukraa.`);
    } finally {
      setPullingFromSukraa(false);
    }
  };

  const fetchArchives = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: 150,
        offset: 0,
        search: search.trim() || undefined,
        modality: activeModality !== 'ALL' ? activeModality : undefined,
        category: activeCategory !== 'ALL' ? activeCategory : undefined,
        patientId: selectedFolderPatientId || undefined,
      };
      const res = await getArchives(params);
      setArchives(res.data.data || []);
      setTotal(res.data.total || 0);
      if (res.data.stats) setStats(res.data.stats);
    } catch {
      toast.error('Failed to load imaging archives.');
    } finally {
      setLoading(false);
    }
  }, [activeModality, activeCategory, search, selectedFolderPatientId]);

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

  const filesInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFilesSelect = (e) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setUploadFiles((prev) => [...prev, ...filesArr]);
      if (filesInputRef.current) filesInputRef.current.value = '';
    }
  };

  const handleFolderSelect = (e) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      if (filesArr.length > 0) {
        const firstRel = filesArr[0].webkitRelativePath || '';
        if (firstRel && firstRel.includes('/')) {
          const topFolder = firstRel.split('/')[0];
          if (!uploadSeriesName || uploadSeriesName === 'Diagnostic Series') {
            setUploadSeriesName(topFolder.replace(/[_-]/g, ' '));
          }
        }
        setUploadFiles((prev) => [...prev, ...filesArr]);
        toast.success(`Loaded ${filesArr.length} file(s) from folder.`);
      }
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const collectedFiles = [];

      const readEntry = async (entry, path = '') => {
        if (entry.isFile) {
          return new Promise((resolve) => {
            entry.file((file) => {
              Object.defineProperty(file, 'relativePath', {
                value: path + file.name,
                writable: true,
              });
              collectedFiles.push(file);
              resolve();
            });
          });
        } else if (entry.isDirectory) {
          const dirReader = entry.createReader();
          return new Promise((resolve) => {
            const readEntries = () => {
              dirReader.readEntries(async (entries) => {
                if (entries.length === 0) {
                  resolve();
                } else {
                  for (const ent of entries) {
                    await readEntry(ent, path + entry.name + '/');
                  }
                  readEntries();
                }
              });
            };
            readEntries();
          });
        }
      };

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry) await readEntry(entry);
        } else {
          const file = item.getAsFile();
          if (file) collectedFiles.push(file);
        }
      }

      if (collectedFiles.length > 0) {
        setUploadFiles((prev) => [...prev, ...collectedFiles]);
        toast.success(`Added ${collectedFiles.length} file(s) from drop.`);
      }
    } else if (e.dataTransfer.files) {
      const filesArr = Array.from(e.dataTransfer.files);
      setUploadFiles((prev) => [...prev, ...filesArr]);
    }
  };

  const uploadStats = useMemo(() => {
    const totalBytes = uploadFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    const folderSet = new Set();
    uploadFiles.forEach((f) => {
      const rel = f.webkitRelativePath || f.relativePath || '';
      if (rel && rel.includes('/')) {
        folderSet.add(rel.substring(0, rel.lastIndexOf('/')));
      }
    });
    return {
      count: uploadFiles.length,
      totalBytes,
      folderCount: folderSet.size,
      folders: Array.from(folderSet),
    };
  }, [uploadFiles]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      toast.error('Please select at least one image file or folder.');
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
      formData.append('category', uploadCategory);
      formData.append('body_region', uploadBodyRegion.trim() || 'General');
      formData.append('series_name', uploadSeriesName.trim() || 'Diagnostic Series');
      formData.append('clinical_notes', uploadNotes.trim() || '');

      uploadFiles.forEach((f) => {
        formData.append('files', f);
      });

      const relativePaths = uploadFiles.map((f) => f.webkitRelativePath || f.relativePath || f.name);
      formData.append('relative_paths', JSON.stringify(relativePaths));

      const res = await uploadArchiveFiles(formData);
      toast.success(res.data.message || 'Archived successfully!');
      setUploadModalOpen(false);
      setUploadFiles([]);
      setUploadNotes('');
      setSukraaPatient(null);
      fetchArchives();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // Group archives by Patient Folders
  const patientFolderGroups = useMemo(() => {
    const groups = {};
    archives.forEach((item) => {
      const pid = item.patient_id || 'UNKNOWN';
      if (!groups[pid]) {
        groups[pid] = {
          patientId: pid,
          patientName: item.patient_name || (pid !== 'UNKNOWN' ? pid : '—'),
          files: [],
          modalities: new Set(),
          categories: new Set(),
          lastUpdated: item.created_at,
        };
      }
      groups[pid].files.push(item);
      if (item.modality) groups[pid].modalities.add(item.modality);
      if (item.category) groups[pid].categories.add(item.category);
    });
    return Object.values(groups);
  }, [archives]);

  // Group archives by Categories
  const categoryGroups = useMemo(() => {
    const groups = {};
    CATEGORIES.forEach((c) => {
      groups[c.id] = { ...c, files: [] };
    });
    archives.forEach((item) => {
      const cat = item.category || 'General Clinical';
      if (!groups[cat]) {
        groups[cat] = { id: cat, label: cat, icon: Shield, color: 'text-slate-600 bg-slate-50 border-slate-200', files: [] };
      }
      groups[cat].files.push(item);
    });
    return groups;
  }, [archives]);

  // Group archives by Modalities
  const modalityGroups = useMemo(() => {
    const groups = {};
    MODALITIES.filter((m) => m.code !== 'ALL').forEach((m) => {
      groups[m.code] = { ...m, files: [] };
    });
    archives.forEach((item) => {
      const m = item.modality || 'X-Ray';
      if (!groups[m]) {
        groups[m] = { code: m, label: m, files: [] };
      }
      groups[m].files.push(item);
    });
    return groups;
  }, [archives]);

  const totalStorageMb = useMemo(() => {
    const mods = stats.modalities || {};
    const bytes = Object.values(mods).reduce((acc, curr) => acc + (curr.bytes || 0), 0);
    return (bytes / (1024 * 1024)).toFixed(1);
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* ── Summary Stats Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Archived Images & Slices</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{total}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Organized in classified vaults</div>
          </div>
          <div className="p-3 bg-[#1C69A0]/10 text-[#1C69A0] rounded-xl">
            <Archive size={22} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Patient Folders</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{patientFolderGroups.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Individual patient records</div>
          </div>
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl">
            <Folder size={22} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Clinical Categories</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{CATEGORIES.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Specialties & anatomical domains</div>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <Tag size={22} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Imaging Modalities</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">8 Supported</div>
            <div className="text-[11px] text-slate-400 mt-0.5">CT, MRI, OPG, X-Ray, etc. ({totalStorageMb} MB)</div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Layers size={22} />
          </div>
        </div>
      </div>

      {/* ── View Classification Toolbar & Filter Bar ──────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Classification & View Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => { setViewMode('folders'); setSelectedFolderPatientId(null); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                viewMode === 'folders' ? 'bg-white text-[#1C69A0] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Folder size={14} /> Folders View
            </button>
            <button
              onClick={() => { setViewMode('categories'); setSelectedFolderPatientId(null); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                viewMode === 'categories' ? 'bg-white text-[#1C69A0] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag size={14} /> Categories View
            </button>
            <button
              onClick={() => { setViewMode('modalities'); setSelectedFolderPatientId(null); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                viewMode === 'modalities' ? 'bg-white text-[#1C69A0] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={14} /> Modalities View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                viewMode === 'list' ? 'bg-white text-[#1C69A0] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List size={14} /> Detailed List View
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                viewMode === 'grid' ? 'bg-white text-[#1C69A0] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid size={14} /> Grid Cards
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchArchives}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="Refresh Archives"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1C69A0] hover:bg-[#16527D] rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
              <Upload size={14} /> Upload & Archive
            </button>
          </div>
        </div>

        {/* Search & Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
            <div className="relative w-full">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Patient PID, Name, Category, Modality, Body Region..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C69A0]/20 focus:border-[#1C69A0]"
              />
            </div>
          </div>

          {/* Folder Breadcrumb when a folder is selected */}
          {selectedFolderPatientId && (
            <div className="flex items-center gap-1.5 text-xs bg-[#1C69A0]/10 text-[#1C69A0] px-3 py-1 rounded-lg border border-[#1C69A0]/20">
              <button
                onClick={() => setSelectedFolderPatientId(null)}
                className="font-semibold hover:underline"
              >
                📁 All Folders
              </button>
              <ChevronRight size={13} />
              <span className="font-bold">Patient Folder: {selectedFolderPatientId}</span>
              <button
                onClick={() => setSelectedFolderPatientId(null)}
                className="ml-2 text-[#1C69A0] hover:text-[#16527D]"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Modality & Category Quick Selectors */}
          <div className="flex items-center gap-2 text-xs">
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>

            <select
              value={activeModality}
              onChange={(e) => setActiveModality(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
            >
              {MODALITIES.map((m) => (
                <option key={m.code} value={m.code}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Main View Content ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <RefreshCw size={24} className="animate-spin text-[#1C69A0] mx-auto mb-2" />
          <p className="text-xs">Loading classified medical imaging archives...</p>
        </div>
      ) : archives.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 space-y-3">
          <Archive size={40} className="mx-auto text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">No Archives Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No diagnostic images archived under this folder, category, or modality.
          </p>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#1C69A0] bg-[#1C69A0]/10 hover:bg-[#1C69A0]/20 rounded-lg transition-colors"
          >
            <Plus size={14} /> Upload First Study
          </button>
        </div>
      ) : viewMode === 'folders' ? (
        /* ── 1. FOLDERS VIEW (Hierarchical Patient Directory) ─────────────── */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patientFolderGroups.map((folder) => {
              const isOpen = selectedFolderPatientId === folder.patientId;
              return (
                <div
                  key={folder.patientId}
                  className={`bg-white rounded-xl border transition-all p-4 flex flex-col justify-between cursor-pointer ${
                    isOpen
                      ? 'border-[#1C69A0] ring-2 ring-[#1C69A0]/20 shadow-md'
                      : 'border-slate-200 hover:border-[#1C69A0] hover:shadow-sm'
                  }`}
                  onClick={() => setSelectedFolderPatientId(isOpen ? null : folder.patientId)}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1C69A0]/10 text-[#1C69A0] flex items-center justify-center">
                          {isOpen ? <FolderOpen size={22} /> : <Folder size={22} />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{folder.patientName}</h4>
                          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            PID: {folder.patientId}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#1C69A0] bg-[#1C69A0]/10 px-2 py-0.5 rounded-full">
                        {folder.files.length} file(s)
                      </span>
                    </div>

                    {/* Modality Badges Inside Folder */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {Array.from(folder.modalities).map((mod) => (
                        <span
                          key={mod}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                            MODALITY_BADGES[mod] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {mod}
                        </span>
                      ))}
                    </div>

                    {/* Categories Inside Folder */}
                    <div className="mt-2 text-[11px] text-slate-500 flex flex-wrap gap-1">
                      {Array.from(folder.categories).map((cat) => (
                        <span key={cat} className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Updated: {new Date(folder.lastUpdated).toLocaleDateString()}</span>
                    <span className="text-[#1C69A0] font-semibold flex items-center gap-1">
                      {isOpen ? 'Close Folder' : 'Open Folder'} <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expanded Selected Patient Folder's Files */}
          {selectedFolderPatientId && (
            <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-[#1C69A0]/30 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <FolderOpen size={16} className="text-[#1C69A0]" />
                  Files inside folder: <span className="font-mono text-[#1C69A0]">{selectedFolderPatientId}</span>
                </h3>
                <span className="text-xs text-slate-500">
                  {archives.length} diagnostic file(s) found
                </span>
              </div>

              {/* Render the detailed table for the opened folder */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Slice</th>
                      <th className="py-2.5 px-3">Modality</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Body Region / Series</th>
                      <th className="py-2.5 px-3">File Name</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {archives.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">
                          #{item.slice_index || 1}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${MODALITY_BADGES[item.modality]}`}>
                            {item.modality}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-700">
                          {item.category || 'General Clinical'}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-slate-800">{item.body_region || 'General'}</span>
                          <span className="text-slate-400 text-[11px] ml-1">({item.series_name})</span>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500 truncate max-w-[140px]">
                          {item.file_name}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setViewerItem(item)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-[#1C69A0] text-white hover:bg-[#16527D] transition-colors"
                            >
                              View in Lumina
                            </button>
                            <button
                              onClick={() => setShareItem(item)}
                              className="p-1 rounded text-slate-600 hover:text-[#1C69A0] hover:bg-slate-100 transition-colors"
                              title="Share"
                            >
                              <Share2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'categories' ? (
        /* ── 2. CATEGORIES VIEW (Clinical Anatomical Specialty Folders) ───── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => {
            const grp = categoryGroups[cat.id] || { files: [] };
            const Icon = cat.icon;
            const isFilterActive = activeCategory === cat.id;

            return (
              <div
                key={cat.id}
                onClick={() => {
                  setActiveCategory(isFilterActive ? 'ALL' : cat.id);
                  setViewMode('list');
                }}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all flex flex-col justify-between ${
                  isFilterActive
                    ? 'border-[#1C69A0] ring-2 ring-[#1C69A0]/20 shadow-md'
                    : 'border-slate-200 hover:border-[#1C69A0] hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl border ${cat.color}`}>
                      <Icon size={22} />
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {grp.files.length} Studies
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-3">{cat.label}</h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Classified clinical imaging studies, dental scans, and organ systems.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#1C69A0]">
                  <span>Browse Category</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'modalities' ? (
        /* ── 3. MODALITIES VIEW (The 8 Clinical Imaging Modalities) ────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MODALITIES.filter((m) => m.code !== 'ALL').map((mod) => {
            const grp = modalityGroups[mod.code] || { files: [] };
            const isFilterActive = activeModality === mod.code;
            const badgeClass = MODALITY_BADGES[mod.code] || 'bg-slate-100 text-slate-800';

            return (
              <div
                key={mod.code}
                onClick={() => {
                  setActiveModality(isFilterActive ? 'ALL' : mod.code);
                  setViewMode('list');
                }}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all flex flex-col justify-between ${
                  isFilterActive
                    ? 'border-[#1C69A0] ring-2 ring-[#1C69A0]/20 shadow-md'
                    : 'border-slate-200 hover:border-[#1C69A0] hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${badgeClass}`}>
                      {mod.code}
                    </span>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      {grp.files.length} Studies
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-3">{mod.label}</h3>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">
                    Folder: /{mod.code}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#1C69A0]">
                  <span>Open Modality Archive</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'list' ? (
        /* ── 4. DETAILED LIST VIEW (Classified Table List) ─────────────────── */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Preview</th>
                <th className="py-3 px-4">Patient Folder (PID)</th>
                <th className="py-3 px-4">Modality</th>
                <th className="py-3 px-4">Clinical Category</th>
                <th className="py-3 px-4">Body Region & Series</th>
                <th className="py-3 px-4">File Name & Size</th>
                <th className="py-3 px-4">Archived On</th>
                <th className="py-3 px-4 text-right">In-Lumina Viewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {archives.map((item) => {
                const modBadge = MODALITY_BADGES[item.modality] || 'bg-slate-100 text-slate-800';
                const imgSrc = item.thumbnail_base64
                  ? (item.thumbnail_base64.startsWith('data:') ? item.thumbnail_base64 : `data:${item.file_type || 'image/png'};base64,${item.thumbnail_base64}`)
                  : (item.file_base64 ? `data:${item.file_type || 'image/png'};base64,${item.file_base64}` : null);

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4">
                      <div
                        onClick={() => setViewerItem(item)}
                        className="w-11 h-11 rounded-lg bg-slate-900 overflow-hidden cursor-pointer border border-slate-200 shrink-0 relative group"
                      >
                        {imgSrc ? (
                          <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500">
                            <Archive size={16} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <Eye size={14} />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Folder size={13} className="text-[#1C69A0] shrink-0" />
                        {item.patient_name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        PID: {item.patient_id}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${modBadge}`}>
                        {item.modality}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1">
                        <Tag size={11} className="text-slate-500" />
                        {item.category || 'General Clinical'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-800">{item.body_region || 'General'}</div>
                      <div className="text-[11px] text-slate-400">{item.series_name} (Slice #{item.slice_index || 1})</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-mono text-slate-600 truncate max-w-[130px]">{item.file_name}</div>
                      <div className="text-[10px] text-slate-400">{Math.round((item.file_size_bytes || 0) / 1024)} KB</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setViewerItem(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1C69A0] hover:bg-[#16527D] text-white transition-colors shadow-sm"
                        >
                          <Eye size={13} /> View in Lumina
                        </button>
                        <button
                          onClick={() => setShareItem(item)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-[#1C69A0] hover:bg-slate-100 transition-colors"
                          title="Share with Provider"
                        >
                          <Share2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.file_name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Archive"
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
      ) : (
        /* ── 5. GRID CARDS VIEW ───────────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {archives.map((item) => {
            const badgeClass = MODALITY_BADGES[item.modality] || 'bg-slate-100 text-slate-800 border-slate-200';
            const imgSrc = item.thumbnail_base64
              ? (item.thumbnail_base64.startsWith('data:') ? item.thumbnail_base64 : `data:${item.file_type || 'image/png'};base64,${item.thumbnail_base64}`)
              : (item.file_base64 ? `data:${item.file_type || 'image/png'};base64,${item.file_base64}` : null);

            return (
              <div
                key={item.id}
                className="group bg-white rounded-xl border border-slate-200 hover:border-[#1C69A0] shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
              >
                {/* Thumbnail Preview */}
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

                  <span
                    className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shadow-sm ${badgeClass}`}
                  >
                    {item.modality}
                  </span>

                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/70 text-white">
                    Slice #{item.slice_index || 1}
                  </span>

                  <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1C69A0] text-xs font-semibold shadow-lg">
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

                    <div className="mt-1 text-[11px] text-slate-600 flex items-center gap-1">
                      <Tag size={11} className="text-[#1C69A0]" />
                      <span className="font-medium truncate">{item.category || 'General Clinical'}</span>
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

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShareItem(item)}
                        className="p-1.5 rounded text-[#1C69A0] hover:bg-[#1C69A0]/10 transition-colors"
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
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#1C69A0]/20 text-[#5C93BB] rounded-lg border border-[#1C69A0]/30">
                  <Upload size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Archive Clinical Imaging</h2>
                  <p className="text-xs text-slate-300">
                    Pull patient details from Sukraa and classify by folders, categories, & modalities
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setUploadModalOpen(false);
                  setSukraaPatient(null);
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Modality Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  1. Clinical Modality <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {MODALITIES.filter((m) => m.code !== 'ALL').map((m) => (
                    <button
                      key={m.code}
                      type="button"
                      onClick={() => setUploadModality(m.code)}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        uploadModality === m.code
                          ? 'border-[#1C69A0] bg-[#1C69A0]/10 text-[#1C69A0] font-bold ring-2 ring-[#1C69A0]/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m.code}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  2. Clinical Anatomical Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C69A0]/20 focus:border-[#1C69A0] text-xs font-medium text-slate-700"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Sukraa Patient Direct Pull & Search */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Search size={14} className="text-[#1C69A0]" />
                    3. Patient Details (Search & Pull from Sukraa) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-medium text-[#1C69A0] bg-[#1C69A0]/10 px-2 py-0.5 rounded">
                    Sukraa HIMS
                  </span>
                </div>

                <PatientAutocomplete
                  value={uploadPatientName}
                  onChange={(val) => setUploadPatientName(val)}
                  onPatientSelect={handleSukraaPatientSelect}
                  placeholder="Search patient by name or PID in Sukraa HIMS..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1C69A0]/20 focus:border-[#1C69A0]"
                  inputStyle={{ height: '38px' }}
                />

                {sukraaPatient && (
                  <div className="flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      <span className="font-bold">{sukraaPatient.full_name}</span>
                      <span className="font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded text-[11px]">
                        PID: {sukraaPatient.pid || sukraaPatient.patient_id}
                      </span>
                      {sukraaPatient.gender && <span>• {sukraaPatient.gender}</span>}
                      {sukraaPatient.age && <span>• {sukraaPatient.age} yrs</span>}
                      {sukraaPatient.insurance && (
                        <span className="text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-[11px]">
                          {sukraaPatient.insurance}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSukraaPatient(null)}
                      className="text-emerald-700 hover:text-emerald-900 font-semibold text-[11px] underline ml-2"
                    >
                      Clear
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Patient ID (PID) <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        placeholder="e.g. 24027899"
                        value={uploadPatientId}
                        onChange={(e) => setUploadPatientId(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C69A0]/20 focus:border-[#1C69A0] font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={handlePullFromSukraa}
                        disabled={pullingFromSukraa || !uploadPatientId.trim()}
                        className="px-3 py-2 rounded-lg bg-[#1C69A0] hover:bg-[#16527D] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap shadow-sm"
                        title="Directly pull patient details from Sukraa using this PID"
                      >
                        <RefreshCw size={12} className={pullingFromSukraa ? 'animate-spin' : ''} />
                        Pull
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Patient Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={uploadPatientName}
                      onChange={(e) => setUploadPatientName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C69A0]/20 focus:border-[#1C69A0] text-xs font-medium text-slate-800"
                    />
                  </div>
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
                    placeholder="e.g. Mandible, Brain, Chest, Knee"
                    value={uploadBodyRegion}
                    onChange={(e) => setUploadBodyRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C69A0]/20 focus:border-[#1C69A0]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Series / Protocol Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Panoramic Arch, Axial C+"
                    value={uploadSeriesName}
                    onChange={(e) => setUploadSeriesName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C69A0]/20 focus:border-[#1C69A0]"
                  />
                </div>
              </div>

              {/* Clinical Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinical & Acquisition Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. High resolution diagnostic acquisition..."
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C69A0]/20 focus:border-[#1C69A0]"
                />
              </div>

              {/* File & Folder Dropzone */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700">
                    Diagnostic Images & Folders <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Supports individual files, multiple files, & full folder trees
                  </span>
                </div>

                {/* Hidden Inputs */}
                <input
                  ref={filesInputRef}
                  type="file"
                  multiple
                  accept="image/*,.dcm,.dicom"
                  id="archive-files-input"
                  onChange={handleFilesSelect}
                  className="hidden"
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  id="archive-folder-input"
                  onChange={handleFolderSelect}
                  className="hidden"
                />

                {/* Dropzone Container */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                    isDragging
                      ? 'border-[#1C69A0] bg-[#1C69A0]/10 ring-4 ring-[#1C69A0]/20 scale-[1.01]'
                      : 'border-slate-300 bg-slate-50 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="w-11 h-11 rounded-full bg-[#1C69A0]/10 text-[#1C69A0] flex items-center justify-center mx-auto shadow-sm">
                      <Upload size={22} />
                    </div>
                    <div>
                      <div className="text-slate-800 font-bold text-xs sm:text-sm">
                        Drag & drop files or full folders here
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        PNG, JPEG, WebP, and DICOM series up to 50MB per file
                      </div>
                    </div>

                    {/* Dual Action Buttons */}
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => filesInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 shadow-sm transition-colors"
                      >
                        <FileText size={13} className="text-[#1C69A0]" />
                        Select Files
                      </button>
                      <button
                        type="button"
                        onClick={() => folderInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1C69A0]/10 border border-[#1C69A0]/30 text-[#1C69A0] hover:bg-[#1C69A0]/20 shadow-sm transition-colors"
                      >
                        <FolderOpen size={13} className="text-[#1C69A0]" />
                        Select Entire Folder
                      </button>
                    </div>
                  </div>
                </div>

                {/* Selected Files & Folders Summary */}
                {uploadFiles.length > 0 && (
                  <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    {/* Stats Header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          {uploadStats.count} {uploadStats.count === 1 ? 'file' : 'files'} selected
                        </span>
                        {uploadStats.folderCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1C69A0]/10 text-[#1C69A0] border border-[#1C69A0]/20 flex items-center gap-1">
                            <Folder size={10} />
                            {uploadStats.folderCount} {uploadStats.folderCount === 1 ? 'folder' : 'folders'}
                          </span>
                        )}
                        <span className="text-slate-400 text-[11px]">
                          ({(uploadStats.totalBytes / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadFiles([])}
                        className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold"
                      >
                        Clear All
                      </button>
                    </div>

                    {/* Scrollable File List */}
                    <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 p-1">
                      {uploadFiles.map((f, i) => {
                        const rel = f.webkitRelativePath || f.relativePath || '';
                        const hasFolder = rel && rel.includes('/');
                        const folderName = hasFolder ? rel.substring(0, rel.lastIndexOf('/')) : null;

                        return (
                          <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 hover:bg-slate-50 rounded transition-colors">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              {hasFolder ? (
                                <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] truncate max-w-[120px]" title={folderName}>
                                  📁 {folderName}
                                </span>
                              ) : (
                                <FileText size={13} className="text-slate-400 shrink-0" />
                              )}
                              <span className="font-mono text-slate-800 truncate" title={f.name}>
                                {f.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-slate-400 font-mono">
                                {(f.size / 1024).toFixed(0)} KB
                              </span>
                              <button
                                type="button"
                                onClick={() => setUploadFiles((prev) => prev.filter((_, idx) => idx !== i))}
                                className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
                                title="Remove file"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setUploadModalOpen(false);
                    setSukraaPatient(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || uploadFiles.length === 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#1C69A0] hover:bg-[#16527D] disabled:opacity-50 rounded-lg shadow-sm transition-colors"
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
