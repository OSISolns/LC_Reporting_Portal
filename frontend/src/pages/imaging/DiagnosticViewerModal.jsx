import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Maximize2,
  Minimize2,
  Layers,
  FileText,
  Share2,
  Download,
  Eye,
  Sliders,
  Ruler,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { getViewerBundle, getShareViewerBundle, reportPdfUrl } from '../../api/imaging';
import { toast } from 'react-hot-toast';

const MODALITY_COLORS = {
  'CT': 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  'MRI': 'bg-sky-500/20 text-sky-400 border-sky-500/40',
  'OPG': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  'X-Ray': 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  'Mammography': 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  'Ultrasound': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  'CBCT': 'bg-teal-500/20 text-teal-400 border-teal-500/40',
  'CEPHALOGRAM': 'bg-[#1C69A0]/20 text-[#60A5FA] border-[#1C69A0]/40',
};

const WL_PRESETS = [
  { id: 'default', label: 'Default', brightness: 100, contrast: 100, invert: false },
  { id: 'bone', label: 'Bone', brightness: 125, contrast: 190, invert: false },
  { id: 'soft_tissue', label: 'Soft Tissue', brightness: 105, contrast: 145, invert: false },
  { id: 'lung', label: 'Lung / Chest', brightness: 140, contrast: 130, invert: false },
  { id: 'high_contrast', label: 'High Contrast', brightness: 100, contrast: 210, invert: false },
  { id: 'invert', label: 'Invert / Negative', brightness: 100, contrast: 110, invert: true },
];

export default function DiagnosticViewerModal({
  studyId = null,
  shareToken = null,
  archiveItem = null,
  isOpen,
  onClose,
  onShare = null,
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedSliceIndex, setSelectedSliceIndex] = useState(0);
  const [showReport, setShowReport] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Viewport transforms
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Window/Level
  const [activePreset, setActivePreset] = useState('default');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [invert, setInvert] = useState(false);

  // Caliper Measurement tool
  const [caliperMode, setCaliperMode] = useState(false);
  const [caliperPoints, setCaliperPoints] = useState([]);
  const [measurements, setMeasurements] = useState([]);

  const containerRef = useRef(null);

  // Fetch Viewer Bundle
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      try {
        if (shareToken) {
          const res = await getShareViewerBundle(shareToken);
          setData(res.data.data);
        } else if (studyId) {
          const res = await getViewerBundle(studyId);
          setData(res.data.data);
        } else if (archiveItem) {
          setData({
            study: {
              patient_id: archiveItem.patient_id,
              patient_name: archiveItem.patient_name,
              modality: archiveItem.modality,
              body_part: archiveItem.body_region,
              study_date: archiveItem.created_at,
              accession_number: archiveItem.accession_number || `ARC-${archiveItem.id}`,
            },
            archives: [archiveItem],
            dicoms: [],
            report: null,
          });
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load diagnostic viewer bundle.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    resetViewport();
  }, [isOpen, studyId, shareToken, archiveItem]);

  // Build the list of viewable slices/frames
  const slices = useMemo(() => {
    if (!data) return [];
    const list = [];

    // Archives (direct base64 uploaded files)
    if (data.archives && data.archives.length > 0) {
      data.archives.forEach((arc, i) => {
        let src = '';
        if (arc.file_base64) {
          src = arc.file_base64.startsWith('data:')
            ? arc.file_base64
            : `data:${arc.file_type || 'image/png'};base64,${arc.file_base64}`;
        }
        list.push({
          id: `arc-${arc.id || i}`,
          type: 'archive',
          title: arc.file_name || `Series Slice ${arc.slice_index || i + 1}`,
          series: arc.series_name || 'Standard Series',
          sliceIndex: arc.slice_index || i + 1,
          src,
          modality: arc.modality || data.study?.modality || 'X-Ray',
          notes: arc.clinical_notes,
          sizeBytes: arc.file_size_bytes,
        });
      });
    }

    // DICOM proxy instances if available
    if (data.dicoms && data.dicoms.length > 0) {
      data.dicoms.forEach((d, i) => {
        list.push({
          id: `dcm-${d.id || i}`,
          type: 'dicom',
          title: `DICOM Frame ${i + 1}`,
          series: d.series_instance_uid || 'PACS Series',
          sliceIndex: i + 1,
          src: d.thumbnail_base64 ? `data:image/jpeg;base64,${d.thumbnail_base64}` : null,
          modality: data.study?.modality || 'CT',
        });
      });
    }

    return list;
  }, [data]);

  const currentSlice = slices[selectedSliceIndex] || slices[0];

  const resetViewport = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    applyPreset('default');
    setCaliperPoints([]);
    setMeasurements([]);
    setCaliperMode(false);
  };

  const applyPreset = (presetId) => {
    setActivePreset(presetId);
    const p = WL_PRESETS.find((x) => x.id === presetId);
    if (p) {
      setBrightness(p.brightness);
      setContrast(p.contrast);
      setInvert(p.invert);
    }
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, +(z - 0.25).toFixed(2)));
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey || true) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      setZoom((z) => Math.min(4, Math.max(0.4, +(z + delta).toFixed(2))));
    }
  };

  // Mouse pan controls
  const handleMouseDown = (e) => {
    if (caliperMode) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  // Caliper measurement handler
  const handleViewportClick = (e) => {
    if (!caliperMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    if (caliperPoints.length === 0) {
      setCaliperPoints([{ x, y }]);
    } else if (caliperPoints.length === 1) {
      const p1 = caliperPoints[0];
      const p2 = { x, y };
      const distPx = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      // Calibrate approx 0.264mm per pixel on 96dpi baseline
      const distMm = (distPx * 0.264).toFixed(1);

      setMeasurements((prev) => [
        ...prev,
        { p1, p2, distPx: Math.round(distPx), distMm },
      ]);
      setCaliperPoints([]);
    }
  };

  const study = data?.study || {};
  const report = data?.report;
  const share = data?.share;
  const modality = study.modality || currentSlice?.modality || 'X-Ray';
  const modalityBadgeClass = MODALITY_COLORS[modality] || 'bg-blue-500/20 text-blue-400 border-blue-500/40';

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md transition-all ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4'
      }`}
    >
      <div
        className={`relative flex flex-col bg-slate-950 text-slate-100 border border-slate-800 shadow-2xl overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full rounded-none'
            : 'w-full max-w-7xl h-[94vh] rounded-2xl border-slate-700/60'
        }`}
      >
        {/* ── Top Header Toolbar ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 text-xs font-bold uppercase rounded-md border tracking-wider ${modalityBadgeClass}`}
            >
              {modality}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-wide">
                  {study.patient_name || '—'}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  PID: {study.patient_id || '—'}
                </span>
                {study.accession_number && (
                  <span className="text-xs text-slate-400 font-mono hidden md:inline">
                    Acc: {study.accession_number}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                <span>Region: <strong className="text-slate-200">{study.body_part || study.exam_region || 'General'}</strong></span>
                <span>•</span>
                <span>Study Date: {study.study_date ? new Date(study.study_date).toLocaleDateString() : '—'}</span>
                {study.referring_physician && (
                  <>
                    <span>•</span>
                    <span className="text-[#60A5FA]">Ref: {study.referring_physician}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            {share && (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs">
                <CheckCircle2 size={13} />
                <span>Shared with {share.provider_name}</span>
                <span className="text-emerald-500 font-bold uppercase text-[10px]">({share.urgency})</span>
              </div>
            )}

            {onShare && (
              <button
                onClick={() => onShare(study, currentSlice)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1C69A0] hover:bg-[#16527D] text-white transition-colors"
                title="Share this study with requesting provider"
              >
                <Share2 size={14} /> Share Study
              </button>
            )}

            {currentSlice?.src && (
              <a
                href={currentSlice.src}
                download={`${study.patient_id || 'study'}_${modality}_slice${currentSlice.sliceIndex}.png`}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Download current high-res image"
              >
                <Download size={16} />
              </a>
            )}

            <button
              onClick={() => setShowReport(!showReport)}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                showReport ? 'bg-[#1C69A0]/30 text-[#60A5FA] border border-[#1C69A0]/40' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Toggle Clinical Report Drawer"
            >
              <FileText size={16} />
              <span className="hidden md:inline">Report</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
              title="Close Viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Sub-header: Image Adjustment & Measurement Tools ───────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-xs">
          {/* Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Sliders size={13} /> W/L Presets:
            </span>
            {WL_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  activePreset === p.id
                    ? 'bg-[#1C69A0] text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Manipulation & Caliper Tools */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => setCaliperMode(!caliperMode)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                caliperMode
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Measure distance between two anatomical points"
            >
              <Ruler size={13} /> Caliper {caliperMode ? '(Click 2 pts)' : ''}
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <span className="font-mono text-[11px] text-slate-400 w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <button
              onClick={() => setRotation((r) => (r - 90) % 360)}
              className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="Rotate Left 90°"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="Rotate Right 90°"
            >
              <RotateCw size={14} />
            </button>
            <button
              onClick={() => setFlipH((f) => !f)}
              className={`p-1.5 rounded text-slate-300 hover:bg-slate-700 hover:text-white ${flipH ? 'bg-[#1C69A0]/40 text-[#60A5FA]' : 'bg-slate-800'}`}
              title="Flip Horizontal"
            >
              <FlipHorizontal size={14} />
            </button>
            <button
              onClick={() => setFlipV((f) => !f)}
              className={`p-1.5 rounded text-slate-300 hover:bg-slate-700 hover:text-white ${flipV ? 'bg-[#1C69A0]/40 text-[#60A5FA]' : 'bg-slate-800'}`}
              title="Flip Vertical"
            >
              <FlipVertical size={14} />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <button
              onClick={resetViewport}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white text-[11px]"
              title="Reset Zoom, Pan & Presets"
            >
              <RefreshCw size={12} /> Reset
            </button>
          </div>
        </div>

        {/* ── Main Viewport Area ────────────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Center Image Canvas */}
          <div
            ref={containerRef}
            className="flex-1 relative flex items-center justify-center bg-black overflow-hidden select-none cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleViewportClick}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <RefreshCw size={32} className="animate-spin text-[#1C69A0]" />
                <p className="text-sm">Loading diagnostic series & DICOM data...</p>
              </div>
            ) : currentSlice?.src ? (
              <div
                className="relative transition-transform duration-75"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                  filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? 'invert(100%)' : ''}`,
                }}
              >
                <img
                  src={currentSlice.src}
                  alt={currentSlice.title}
                  className="max-h-[75vh] max-w-[70vw] object-contain pointer-events-none rounded shadow-2xl"
                  draggable={false}
                />

                {/* Caliper Measurement Lines & Markers Overlay */}
                {measurements.map((m, idx) => (
                  <svg
                    key={idx}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ overflow: 'visible' }}
                  >
                    <line
                      x1={m.p1.x}
                      y1={m.p1.y}
                      x2={m.p2.x}
                      y2={m.p2.y}
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                    <circle cx={m.p1.x} cy={m.p1.y} r="4" fill="#f59e0b" />
                    <circle cx={m.p2.x} cy={m.p2.y} r="4" fill="#f59e0b" />
                    <rect
                      x={(m.p1.x + m.p2.x) / 2 - 24}
                      y={(m.p1.y + m.p2.y) / 2 - 12}
                      width="48"
                      height="18"
                      rx="3"
                      fill="#0f172a"
                      stroke="#f59e0b"
                      strokeWidth="1"
                    />
                    <text
                      x={(m.p1.x + m.p2.x) / 2}
                      y={(m.p1.y + m.p2.y) / 2 + 1}
                      fill="#fef3c7"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {m.distMm} mm
                    </text>
                  </svg>
                ))}

                {/* Active caliper start marker */}
                {caliperPoints.length === 1 && (
                  <div
                    className="absolute w-3 h-3 bg-amber-400 rounded-full border-2 border-slate-950 -translate-x-1/2 -translate-y-1/2 animate-ping"
                    style={{ left: caliperPoints[0].x, top: caliperPoints[0].y }}
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-500 p-8 text-center max-w-md">
                <AlertCircle size={40} className="text-slate-600" />
                <h4 className="text-base font-semibold text-slate-300">No Image Frames Uploaded Yet</h4>
                <p className="text-xs text-slate-400">
                  This study is registered under <strong>{modality}</strong>. Radiographers can upload images directly into the Lumina Vault or link via DICOM PACS.
                </p>
              </div>
            )}

            {/* Diagnostic HUD Info Overlays (Radiology Standard Corners) */}
            <div className="absolute top-3 left-3 pointer-events-none text-[11px] font-mono text-cyan-300/80 bg-slate-950/60 p-2 rounded backdrop-blur-sm border border-slate-800/40">
              <div>PT: {study.patient_name || '—'}</div>
              <div>PID: {study.patient_id || '—'}</div>
              <div>MOD: {modality} | {study.body_part || study.exam_region || 'General'}</div>
            </div>

            <div className="absolute top-3 right-3 pointer-events-none text-[11px] font-mono text-cyan-300/80 bg-slate-950/60 p-2 rounded backdrop-blur-sm border border-slate-800/40 text-right">
              <div>SLICE: {selectedSliceIndex + 1} / {slices.length || 1}</div>
              <div>ZOOM: {Math.round(zoom * 100)}%</div>
              <div>W/L: {activePreset.toUpperCase()}</div>
            </div>

            {/* Bottom filmstrip slice controls */}
            {slices.length > 1 && (
              <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2 pointer-events-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSliceIndex((i) => Math.max(0, i - 1));
                  }}
                  disabled={selectedSliceIndex === 0}
                  className="p-1.5 rounded-full bg-slate-900/90 text-white hover:bg-[#1C69A0] disabled:opacity-40 border border-slate-700 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="px-3 py-1 bg-slate-950/80 rounded-full text-xs font-mono border border-slate-800 text-slate-300 backdrop-blur-md">
                  Frame {selectedSliceIndex + 1} of {slices.length}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSliceIndex((i) => Math.min(slices.length - 1, i + 1));
                  }}
                  disabled={selectedSliceIndex === slices.length - 1}
                  className="p-1.5 rounded-full bg-slate-900/90 text-white hover:bg-[#1C69A0] disabled:opacity-40 border border-slate-700 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* ── Right-Side Diagnostic Report Drawer ─────────────────────────── */}
          {showReport && (
            <div className="w-80 md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 overflow-y-auto">
              <div className="p-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText size={16} className="text-[#60A5FA]" /> Diagnostic Report
                </h3>
                {report && (
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      report.status === 'verified'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {report.status}
                  </span>
                )}
              </div>

              <div className="p-4 space-y-4 text-xs text-slate-300">
                {/* Share consultation note alert if opened via share */}
                {share && share.consultation_notes && (
                  <div className="p-3 rounded-lg bg-[#1C69A0]/10 border border-[#1C69A0]/30 text-slate-200">
                    <div className="font-semibold text-[#60A5FA] mb-1 flex items-center gap-1">
                      <Clock size={13} /> Consultation Note from Radiologist:
                    </div>
                    <p className="text-[11px] leading-relaxed">{share.consultation_notes}</p>
                    {share.clinical_indication && (
                      <div className="mt-2 pt-2 border-t border-[#1C69A0]/20 text-[11px]">
                        <strong>Clinical Indication:</strong> {share.clinical_indication}
                      </div>
                    )}
                  </div>
                )}

                {/* Report Content */}
                {report ? (
                  <div className="space-y-3.5">
                    {report.technique && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Technique & Protocol
                        </div>
                        <p className="text-slate-200 bg-slate-950 p-2.5 rounded border border-slate-800/80 leading-relaxed">
                          {report.technique}
                        </p>
                      </div>
                    )}

                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Findings
                      </div>
                      <p className="text-slate-200 bg-slate-950 p-2.5 rounded border border-slate-800/80 leading-relaxed whitespace-pre-wrap">
                        {report.findings || 'No formal findings recorded.'}
                      </p>
                    </div>

                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Impression / Conclusion
                      </div>
                      <p className="text-slate-200 bg-slate-950 p-2.5 rounded border border-slate-800/80 leading-relaxed font-medium">
                        {report.impression || 'Study pending radiologist sign-off.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                      {report.radiologist_name && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <ShieldCheck size={13} className="text-emerald-400" />
                          <span>Reported by: <strong>{report.radiologist_name}</strong></span>
                        </div>
                      )}
                      {report.signed_at && (
                        <div>Signed on: {new Date(report.signed_at).toLocaleString()}</div>
                      )}
                    </div>

                    {study.id && (
                      <a
                        href={reportPdfUrl(study.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors mt-2"
                      >
                        <Download size={14} /> Download Official PDF Report
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <FileText size={32} className="mx-auto text-slate-600 mb-2" />
                    <p className="font-medium text-slate-400">Radiology Report Pending</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      The radiologist has not finalized a formal narrative report for this acquisition yet.
                    </p>
                  </div>
                )}

                {/* Slices / Series Metadata */}
                {currentSlice && currentSlice.notes && (
                  <div className="mt-4 p-3 rounded bg-slate-950 border border-slate-800">
                    <div className="font-semibold text-slate-400 mb-1">Acquisition Slice Notes:</div>
                    <p className="text-slate-300 text-[11px]">{currentSlice.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom Filmstrip Thumbnail Carousel ──────────────────────────── */}
        {slices.length > 0 && (
          <div className="h-24 bg-slate-950 border-t border-slate-800 px-4 py-2 flex items-center gap-3 overflow-x-auto shrink-0 select-none">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Layers size={14} /> Series ({slices.length}):
            </div>
            {slices.map((sl, idx) => (
              <button
                key={sl.id || idx}
                onClick={() => setSelectedSliceIndex(idx)}
                className={`group relative h-20 w-20 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                  selectedSliceIndex === idx
                    ? 'border-[#1C69A0] ring-2 ring-[#1C69A0]/40 scale-105'
                    : 'border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100'
                }`}
              >
                {sl.src ? (
                  <img
                    src={sl.src}
                    alt={sl.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-600 text-[10px] text-center p-1">
                    Frame {idx + 1}
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-white px-1 py-0.5 text-center font-mono truncate">
                  #{sl.sliceIndex || idx + 1}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
