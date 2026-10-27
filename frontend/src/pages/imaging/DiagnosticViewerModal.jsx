import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  CheckCircle2,
  ExternalLink,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  Circle,
  CornerDownRight,
  Crosshair,
  Camera,
  Printer,
  Trash2,
  Undo2,
  EyeOff,
  Sparkles,
  Monitor,
  Move
} from 'lucide-react';
import {
  getViewerBundle,
  getShareViewerBundle,
  reportPdfUrl,
  getArchive,
  getArchives,
  getArchiveFileUrl
} from '../../api/imaging';
import api from '../../api/axios';
import { renderDicomToDataUrl } from '../../utils/dicomHelper';
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
  { id: 'brain', label: 'Brain / Neuro', brightness: 115, contrast: 170, invert: false },
  { id: 'high_contrast', label: 'High Contrast', brightness: 100, contrast: 210, invert: false },
  { id: 'invert', label: 'Invert / Negative', brightness: 100, contrast: 110, invert: true },
  { id: 'angio', label: 'Angio / Vascular', brightness: 120, contrast: 240, invert: false },
];

export default function DiagnosticViewerModal({
  studyId = null,
  shareToken = null,
  archiveItem = null,
  isOpen,
  onClose,
  onShare = null,
  isStandalone = false,
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedSliceIndex, setSelectedSliceIndex] = useState(0);
  const [secondarySliceIndex, setSecondarySliceIndex] = useState(1);
  const [showReport, setShowReport] = useState(!isStandalone);
  const [isFullscreen, setIsFullscreen] = useState(isStandalone);

  // Split-screen comparison (1-Up vs 2-Up)
  const [splitMode, setSplitMode] = useState(1); // 1 = Single, 2 = Dual Side-by-Side

  // Viewport transforms
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Secondary viewport transforms (in 2-Up mode)
  const [secZoom, setSecZoom] = useState(1);
  const [secPan, setSecPan] = useState({ x: 0, y: 0 });
  const [syncTransforms, setSyncTransforms] = useState(false);

  // Window/Level
  const [activePreset, setActivePreset] = useState('default');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [invert, setInvert] = useState(false);
  const [colorFilter, setColorFilter] = useState('none'); // 'none' | 'sepia' | 'heat' | 'cool'
  const [showWlPanel, setShowWlPanel] = useState(false);

  // Active Tool: 'pan' | 'caliper' | 'rect' | 'circle' | 'angle' | 'arrow'
  const [activeTool, setActiveTool] = useState('pan');
  const [activePoints, setActivePoints] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [showHUD, setShowHUD] = useState(true);
  const [showCrosshair, setShowCrosshair] = useState(false);

  // Cine Loop Player
  const [isPlayingCine, setIsPlayingCine] = useState(false);
  const [cineFps, setCineFps] = useState(5);
  const [cineLoopMode, setCineLoopMode] = useState('loop'); // 'loop' | 'bounce'
  const cineDirectionRef = useRef(1);

  // DICOM Rendering State
  const [renderedDicomMap, setRenderedDicomMap] = useState({});
  const [dicomLoading, setDicomLoading] = useState(false);
  const [dicomError, setDicomError] = useState(null);

  const containerRef = useRef(null);
  const imageElementRef = useRef(null);

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
          let fullItem = { ...archiveItem };
          let relatedArchives = [fullItem];

          // Fetch full archive record with base64 if not present
          if (archiveItem.id && !archiveItem.file_base64) {
            try {
              const res = await getArchive(archiveItem.id);
              if (res.data?.data) {
                fullItem = res.data.data;
                relatedArchives = [fullItem];
              }
            } catch (err) {
              console.warn('Could not fetch full archive payload:', err);
            }
          }

          // If linked to a study, also fetch companion archives from the study bundle
          if (archiveItem.study_id) {
            try {
              const bRes = await getViewerBundle(archiveItem.study_id);
              if (bRes.data?.data?.archives?.length > 0) {
                relatedArchives = bRes.data.data.archives.map((a) =>
                  a.id === fullItem.id ? fullItem : a
                );
              }
            } catch { /* ignore */ }
          } else if (archiveItem.patient_id) {
            // Also retrieve companion folder/patient archives for slice navigation
            try {
              const pRes = await getArchives({
                patientId: archiveItem.patient_id,
                folderPath: archiveItem.folder_path || undefined,
                limit: 100,
              });
              if (pRes.data?.data?.archives?.length > 1) {
                relatedArchives = pRes.data.data.archives.map((a) =>
                  a.id === fullItem.id ? fullItem : a
                );
              }
            } catch { /* ignore */ }
          }

          const matchedIdx = relatedArchives.findIndex((a) => a.id === archiveItem.id);
          if (matchedIdx >= 0) setSelectedSliceIndex(matchedIdx);
          if (relatedArchives.length > 1) {
            setSecondarySliceIndex(matchedIdx + 1 < relatedArchives.length ? matchedIdx + 1 : 0);
          }

          setData({
            study: {
              patient_id: fullItem.patient_id,
              patient_name: fullItem.patient_name,
              modality: fullItem.modality,
              body_part: fullItem.body_region,
              study_date: fullItem.created_at,
              accession_number: fullItem.accession_number || `ARC-${fullItem.id}`,
            },
            archives: relatedArchives,
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

    // Archives (direct base64 uploaded files or stream fallback)
    if (data.archives && data.archives.length > 0) {
      data.archives.forEach((arc, i) => {
        let src = '';
        const hasFull = !!arc.file_base64;
        if (arc.file_base64) {
          const clean = arc.file_base64.trim();
          src = clean.startsWith('data:')
            ? clean
            : `data:${arc.file_type || 'image/png'};base64,${clean}`;
        } else if (arc.thumbnail_base64) {
          const clean = arc.thumbnail_base64.trim();
          src = clean.startsWith('data:')
            ? clean
            : `data:${arc.file_type || 'image/png'};base64,${clean}`;
        } else if (arc.id) {
          src = getArchiveFileUrl(arc.id);
        }

        list.push({
          id: `arc-${arc.id || i}`,
          archiveId: arc.id,
          hasFullBase64: hasFull,
          type: 'archive',
          fileType: arc.file_type,
          title: arc.file_name || `Series Slice ${arc.slice_index || i + 1}`,
          series: arc.series_name || 'Diagnostic Vault Series',
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
        let dcmSrc = d.thumbnail_base64 ? `data:image/jpeg;base64,${d.thumbnail_base64}` : null;
        if (!dcmSrc && data.study?.id && d.series_instance_uid && d.sop_instance_uid) {
          dcmSrc = `/api/imaging/studies/${data.study.id}/dicom/rendered?series=${encodeURIComponent(d.series_instance_uid)}&sop=${encodeURIComponent(d.sop_instance_uid)}`;
        }
        list.push({
          id: `dcm-${d.id || i}`,
          type: 'dicom',
          title: `DICOM Frame ${i + 1}`,
          series: d.series_instance_uid || 'PACS Series',
          sliceIndex: i + 1,
          src: dcmSrc,
          modality: data.study?.modality || 'CT',
        });
      });
    }

    return list;
  }, [data]);

  // On demand fetch full file_base64 if selected slice only has thumbnail
  useEffect(() => {
    const cur = slices[selectedSliceIndex];
    if (!cur) return;
    if (cur.type === 'archive' && cur.archiveId && !cur.hasFullBase64) {
      getArchive(cur.archiveId)
        .then((res) => {
          const fresh = res.data?.data;
          if (fresh?.file_base64) {
            setData((prev) => {
              if (!prev || !prev.archives) return prev;
              const nextArchives = prev.archives.map((a) =>
                a.id === fresh.id ? { ...a, file_base64: fresh.file_base64 } : a
              );
              return { ...prev, archives: nextArchives };
            });
          }
        })
        .catch(() => { /* ignore */ });
    }
  }, [selectedSliceIndex, slices]);

  const currentSlice = slices[selectedSliceIndex] || slices[0] || null;
  const secondarySlice = slices[secondarySliceIndex] || slices[1] || currentSlice;

  // Handle DICOM parsing client-side if needed
  useEffect(() => {
    if (!currentSlice) return;
    if (renderedDicomMap[currentSlice.id]) return;

    const isDicom =
      currentSlice.type === 'dicom' ||
      (currentSlice.title && currentSlice.title.toLowerCase().endsWith('.dcm')) ||
      currentSlice.fileType === 'application/dicom';

    if (!isDicom) return;

    let cancelled = false;
    const processDicom = async () => {
      setDicomLoading(true);
      setDicomError(null);
      try {
        let inputData = null;
        if (currentSlice.hasFullBase64 && currentSlice.src) {
          const base64Data = currentSlice.src.includes('base64,')
            ? currentSlice.src.split('base64,')[1]
            : currentSlice.src;
          const binaryStr = atob(base64Data);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          inputData = bytes.buffer;
        } else if (currentSlice.src) {
          const res = await api.get(currentSlice.src, { responseType: 'arraybuffer' });
          inputData = res.data;
        }

        if (!inputData) throw new Error('No DICOM data available.');

        const result = await renderDicomToDataUrl(inputData);
        if (cancelled) return;
        setRenderedDicomMap((prev) => ({
          ...prev,
          [currentSlice.id]: result.dataUrl,
        }));
      } catch (err) {
        if (!cancelled) {
          console.error('DICOM render error:', err);
          setDicomError(err.message || 'Could not parse DICOM image.');
        }
      } finally {
        if (!cancelled) setDicomLoading(false);
      }
    };

    processDicom();
    return () => { cancelled = true; };
  }, [currentSlice?.id, currentSlice?.src, currentSlice?.hasFullBase64, currentSlice?.title, currentSlice?.fileType, renderedDicomMap]);

  const activeDisplaySrc = (currentSlice && renderedDicomMap[currentSlice.id])
    ? renderedDicomMap[currentSlice.id]
    : currentSlice?.src;

  const secondaryDisplaySrc = (secondarySlice && renderedDicomMap[secondarySlice.id])
    ? renderedDicomMap[secondarySlice.id]
    : secondarySlice?.src;

  // Cine loop timer
  useEffect(() => {
    if (!isPlayingCine || slices.length <= 1) return;

    const intervalMs = Math.max(50, Math.round(1000 / cineFps));
    const timer = setInterval(() => {
      setSelectedSliceIndex((prev) => {
        if (cineLoopMode === 'bounce') {
          let next = prev + cineDirectionRef.current;
          if (next >= slices.length) {
            cineDirectionRef.current = -1;
            next = Math.max(0, slices.length - 2);
          } else if (next < 0) {
            cineDirectionRef.current = 1;
            next = Math.min(slices.length - 1, 1);
          }
          return next;
        } else {
          return (prev + 1) % slices.length;
        }
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlayingCine, cineFps, cineLoopMode, slices.length]);

  // Viewport reset
  const resetViewport = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSecZoom(1);
    setSecPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    applyPreset('default');
    setActivePoints([]);
    setActiveTool('pan');
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
  const handleZoomIn = () => {
    setZoom((z) => {
      const next = Math.min(5, +(z + 0.25).toFixed(2));
      if (syncTransforms) setSecZoom(next);
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(0.3, +(z - 0.25).toFixed(2));
      if (syncTransforms) setSecZoom(next);
      return next;
    });
  };

  const handleActualSize = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    if (syncTransforms) {
      setSecZoom(1);
      setSecPan({ x: 0, y: 0 });
    }
  };

  const handleFitScreen = () => {
    setZoom(0.85);
    setPan({ x: 0, y: 0 });
    if (syncTransforms) {
      setSecZoom(0.85);
      setSecPan({ x: 0, y: 0 });
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom((z) => {
      const next = Math.min(5, Math.max(0.3, +(z + delta).toFixed(2)));
      if (syncTransforms) setSecZoom(next);
      return next;
    });
  };

  // Mouse pan controls
  const handleMouseDown = (e) => {
    if (activeTool !== 'pan') return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (isPanning && activeTool === 'pan') {
      const nextX = e.clientX - startPan.x;
      const nextY = e.clientY - startPan.y;
      setPan({ x: nextX, y: nextY });
      if (syncTransforms) setSecPan({ x: nextX, y: nextY });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  // Multi-Tool Click Handler (Caliper, Rectangle, Circle, Angle, Arrow)
  const handleCanvasClick = (e) => {
    if (activeTool === 'pan') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    const pt = { x, y };

    if (activeTool === 'caliper') {
      // 2 points line
      if (activePoints.length === 0) {
        setActivePoints([pt]);
      } else {
        const p1 = activePoints[0];
        const p2 = pt;
        const distPx = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        const distMm = (distPx * 0.264).toFixed(1);

        setMeasurements((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: 'caliper',
            p1,
            p2,
            distPx: Math.round(distPx),
            distMm,
            sliceIndex: selectedSliceIndex,
          },
        ]);
        setActivePoints([]);
        toast.success(`Distance: ${distMm} mm (${Math.round(distPx)} px)`);
      }
    } else if (activeTool === 'rect') {
      // 2 points bounding box
      if (activePoints.length === 0) {
        setActivePoints([pt]);
      } else {
        const p1 = activePoints[0];
        const p2 = pt;
        const widthPx = Math.abs(p2.x - p1.x);
        const heightPx = Math.abs(p2.y - p1.y);
        const widthMm = (widthPx * 0.264).toFixed(1);
        const heightMm = (heightPx * 0.264).toFixed(1);
        const areaMm2 = (widthPx * heightPx * 0.264 * 0.264).toFixed(1);

        setMeasurements((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: 'rect',
            p1,
            p2,
            widthMm,
            heightMm,
            areaMm2,
            sliceIndex: selectedSliceIndex,
          },
        ]);
        setActivePoints([]);
        toast.success(`ROI Area: ${areaMm2} mm² (${widthMm} x ${heightMm} mm)`);
      }
    } else if (activeTool === 'circle') {
      // Center to radius edge
      if (activePoints.length === 0) {
        setActivePoints([pt]);
      } else {
        const center = activePoints[0];
        const radiusPx = Math.sqrt(Math.pow(pt.x - center.x, 2) + Math.pow(pt.y - center.y, 2));
        const radiusMm = (radiusPx * 0.264).toFixed(1);
        const areaMm2 = (Math.PI * Math.pow(radiusPx * 0.264, 2)).toFixed(1);

        setMeasurements((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: 'circle',
            center,
            radiusPx,
            radiusMm,
            areaMm2,
            sliceIndex: selectedSliceIndex,
          },
        ]);
        setActivePoints([]);
        toast.success(`Circular ROI: ${areaMm2} mm² (R: ${radiusMm} mm)`);
      }
    } else if (activeTool === 'angle') {
      // 3 points: P1, Vertex P2, P3
      if (activePoints.length < 2) {
        setActivePoints((prev) => [...prev, pt]);
      } else {
        const p1 = activePoints[0];
        const p2 = activePoints[1]; // Vertex
        const p3 = pt;

        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        const angleDeg = ((Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * 180) / Math.PI).toFixed(1);

        setMeasurements((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: 'angle',
            p1,
            p2,
            p3,
            angleDeg,
            sliceIndex: selectedSliceIndex,
          },
        ]);
        setActivePoints([]);
        toast.success(`Anatomical Angle: ${angleDeg}°`);
      }
    } else if (activeTool === 'arrow') {
      // 1 point pointer label
      const note = window.prompt('Enter marker annotation text (e.g., "Calcification", "Fracture Line", "Lesion"):', 'Focus Area');
      if (note) {
        setMeasurements((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: 'arrow',
            p: pt,
            text: note,
            sliceIndex: selectedSliceIndex,
          },
        ]);
        toast.success(`Marker added: "${note}"`);
      }
      setActivePoints([]);
    }
  };

  // Detach / Pop Out Viewer to Standalone Workstation Window
  const handleDetach = () => {
    const params = new URLSearchParams();
    if (studyId) params.set('studyId', studyId);
    else if (archiveItem?.id) params.set('archiveId', archiveItem.id);
    else if (currentSlice?.archiveId) params.set('archiveId', currentSlice.archiveId);
    if (shareToken) params.set('shareToken', shareToken);
    if (data?.study?.patient_id) params.set('patientId', data.study.patient_id);

    const url = `/imaging/viewer?${params.toString()}`;
    const screenW = window.screen.availWidth || 1600;
    const screenH = window.screen.availHeight || 1000;
    window.open(url, '_blank', `width=${screenW},height=${screenH},menubar=no,toolbar=no,location=no,status=no,resizable=yes`);
    toast.success('Workstation detached to separate monitor window!');
    if (!isStandalone && onClose) onClose();
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSliceIndex((i) => Math.max(0, i - 1));
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSliceIndex((i) => Math.min(slices.length - 1, i + 1));
          break;
        case ' ':
          e.preventDefault();
          setIsPlayingCine((p) => !p);
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          handleZoomOut();
          break;
        case 'r':
        case 'R':
          resetViewport();
          break;
        case 'f':
        case 'F':
          setFlipH((f) => !f);
          break;
        case 'v':
        case 'V':
          setFlipV((f) => !f);
          break;
        case 'i':
        case 'I':
          setInvert((inv) => !inv);
          break;
        case 'p':
        case 'P':
          setActiveTool('pan');
          break;
        case 'c':
        case 'C':
          setActiveTool('caliper');
          break;
        case 'h':
        case 'H':
          setShowHUD((h) => !h);
          break;
        case 'Escape':
          if (activePoints.length > 0) {
            setActivePoints([]);
          } else if (!isStandalone) {
            onClose();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, slices.length, isStandalone, onClose, activePoints.length]);

  // Capture Annotated Canvas Snapshot
  const handleExportSnapshot = () => {
    if (!activeDisplaySrc) {
      toast.error('No active image to snapshot.');
      return;
    }

    const toastId = toast.loading('Generating annotated diagnostic snapshot...');
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1200;
        canvas.height = img.naturalHeight || 900;
        const ctx = canvas.getContext('2d');

        // Apply filters
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) ${invert ? 'invert(100%)' : ''}`;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';

        // Add Watermark Header
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, 0, canvas.width, 48);

        ctx.fillStyle = '#60a5fa';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('LEGACY CLINICS KIGALI — LUMINA DIAGNOSTICS VAULT', 16, 28);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '13px monospace';
        const studyInfo = `PT: ${study.patient_name || '—'} (PID: ${study.patient_id || '—'}) | MOD: ${modality} | DATE: ${study.study_date ? new Date(study.study_date).toLocaleDateString() : '—'}`;
        ctx.fillText(studyInfo, canvas.width - ctx.measureText(studyInfo).width - 16, 28);

        // Download
        const link = document.createElement('a');
        link.download = `Annotated_${study.patient_id || 'study'}_${modality}_slice${selectedSliceIndex + 1}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('Annotated snapshot exported!', { id: toastId });
      };
      img.onerror = () => {
        toast.error('Could not capture image data.', { id: toastId });
      };
      img.src = activeDisplaySrc;
    } catch (err) {
      console.error(err);
      toast.error('Failed to export snapshot.', { id: toastId });
    }
  };

  const study = data?.study || {};
  const report = data?.report;
  const share = data?.share;
  const modality = study.modality || currentSlice?.modality || 'X-Ray';
  const modalityBadgeClass = MODALITY_COLORS[modality] || 'bg-blue-500/20 text-blue-400 border-blue-500/40';

  // CSS Filter string for image
  const filterString = useMemo(() => {
    let s = `brightness(${brightness}%) contrast(${contrast}%)`;
    if (invert) s += ' invert(100%)';
    if (colorFilter === 'sepia') s += ' sepia(70%) hue-rotate(15deg)';
    if (colorFilter === 'heat') s += ' saturate(200%) hue-rotate(180deg)';
    if (colorFilter === 'cool') s += ' saturate(150%) hue-rotate(90deg)';
    return s;
  }, [brightness, contrast, invert, colorFilter]);

  if (!isOpen) return null;

  return (
    <div
      className={
        isStandalone
          ? 'fixed inset-0 w-screen h-screen z-50 flex flex-col bg-slate-950 text-slate-100 overflow-hidden'
          : `fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md transition-all ${
              isFullscreen ? 'p-0' : 'p-2 sm:p-4'
            }`
      }
    >
      <div
        className={
          isStandalone
            ? 'relative flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden'
            : `relative flex flex-col bg-slate-950 text-slate-100 border border-slate-800 shadow-2xl overflow-hidden transition-all duration-200 ${
                isFullscreen
                  ? 'w-full h-full rounded-none'
                  : 'w-full max-w-7xl h-[94vh] rounded-2xl border-slate-700/60'
              }`
        }
      >
        {/* ── Top Header Bar ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
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
                {isStandalone && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-400 font-medium">
                    <Monitor size={12} /> Workstation Mode
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

            {/* 1-Up vs 2-Up Split Screen Selector */}
            {slices.length > 1 && (
              <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
                <button
                  onClick={() => setSplitMode(1)}
                  className={`px-2 py-1 rounded font-medium transition-colors ${
                    splitMode === 1 ? 'bg-[#1C69A0] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Single Viewport (1-Up)"
                >
                  1-Up
                </button>
                <button
                  onClick={() => setSplitMode(2)}
                  className={`px-2 py-1 rounded font-medium transition-colors ${
                    splitMode === 2 ? 'bg-[#1C69A0] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Side-by-Side Comparison (2-Up)"
                >
                  2-Up Split
                </button>
              </div>
            )}

            {/* Detach / Pop Out Window Button */}
            {!isStandalone && (
              <button
                onClick={handleDetach}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-500/30 text-sky-300 transition-colors"
                title="Detach viewer into separate window (Ideal for dual-monitor radiology workstations)"
              >
                <ExternalLink size={14} />
                <span className="hidden md:inline">Detach Viewer</span>
              </button>
            )}

            {onShare && (
              <button
                onClick={() => onShare(study, currentSlice)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1C69A0] hover:bg-[#16527D] text-white transition-colors"
                title="Share this study with requesting provider"
              >
                <Share2 size={14} /> Share
              </button>
            )}

            {/* Snapshot & Export */}
            <button
              onClick={handleExportSnapshot}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Capture & export annotated snapshot (with measurements & watermark)"
            >
              <Camera size={16} />
            </button>

            {currentSlice?.src && (
              <a
                href={currentSlice.src}
                download={`${study.patient_id || 'study'}_${modality}_slice${currentSlice.sliceIndex}.png`}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Download original image file"
              >
                <Download size={16} />
              </a>
            )}

            {/* Report Drawer Toggle */}
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

            {!isStandalone && (
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
              title={isStandalone ? 'Close Workstation' : 'Close Viewer (Esc)'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Diagnostic Toolbar: W/L, Annotation Tools, Transformation ─────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs shrink-0">
          {/* Active Tool Suite */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => { setActiveTool('pan'); setActivePoints([]); }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeTool === 'pan' ? 'bg-[#1C69A0] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Pan & Navigate (Click + Drag to Pan, Scroll to Zoom)"
            >
              <Move size={13} /> Pan (P)
            </button>

            <button
              onClick={() => { setActiveTool('caliper'); setActivePoints([]); }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeTool === 'caliper' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Caliper Line Measurement (Click 2 points)"
            >
              <Ruler size={13} /> Caliper (C)
            </button>

            <button
              onClick={() => { setActiveTool('rect'); setActivePoints([]); }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeTool === 'rect' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Rectangle ROI Area (Click 2 opposite corners)"
            >
              <Square size={13} /> ROI Box
            </button>

            <button
              onClick={() => { setActiveTool('circle'); setActivePoints([]); }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeTool === 'circle' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Circular ROI Area (Click center, then edge)"
            >
              <Circle size={13} /> Circle
            </button>

            <button
              onClick={() => { setActiveTool('angle'); setActivePoints([]); }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeTool === 'angle' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Angle Measurement (Click P1, Vertex P2, and P3)"
            >
              <CornerDownRight size={13} /> Angle (°)
            </button>

            <button
              onClick={() => { setActiveTool('arrow'); setActivePoints([]); }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeTool === 'arrow' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Text Annotation Marker (Click location to label)"
            >
              <CornerDownRight size={13} /> Marker
            </button>
          </div>

          {/* Measurements Actions: Undo, Clear, Hide */}
          {measurements.length > 0 && (
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-amber-400 font-mono px-1.5 py-0.5 bg-amber-950/60 rounded border border-amber-500/30">
                {measurements.length} {measurements.length === 1 ? 'mark' : 'marks'}
              </span>
              <button
                onClick={() => setMeasurements((m) => m.slice(0, -1))}
                className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                title="Undo last annotation"
              >
                <Undo2 size={13} />
              </button>
              <button
                onClick={() => setMeasurements([])}
                className="p-1 rounded bg-slate-800 text-rose-300 hover:bg-rose-900/60"
                title="Clear all annotations"
              >
                <Trash2 size={13} />
              </button>
              <button
                onClick={() => setShowAnnotations((a) => !a)}
                className={`p-1 rounded ${showAnnotations ? 'bg-slate-800 text-slate-300' : 'bg-amber-500/20 text-amber-300'}`}
                title={showAnnotations ? 'Hide annotations' : 'Show annotations'}
              >
                {showAnnotations ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
            </div>
          )}

          {/* W/L Presets Bar */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Sliders size={13} /> Presets:
            </span>
            {WL_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  activePreset === p.id
                    ? 'bg-[#1C69A0] text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}

            <button
              onClick={() => setShowWlPanel(!showWlPanel)}
              className={`p-1.5 rounded transition-colors ${
                showWlPanel ? 'bg-[#1C69A0] text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Custom Precision Window/Level Sliders"
            >
              <Sliders size={13} />
            </button>
          </div>

          {/* Viewport Transforms: Zoom, Rotate, Flip, Reset */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="Zoom In (+)"
            >
              <ZoomIn size={14} />
            </button>
            <span className="font-mono text-[11px] text-slate-400 w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="Zoom Out (-)"
            >
              <ZoomOut size={14} />
            </button>

            <button
              onClick={handleActualSize}
              className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white text-[11px]"
              title="1:1 Actual Pixel Size"
            >
              1:1
            </button>
            <button
              onClick={handleFitScreen}
              className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white text-[11px]"
              title="Fit to Screen"
            >
              Fit
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
              title="Flip Horizontal (F)"
            >
              <FlipHorizontal size={14} />
            </button>
            <button
              onClick={() => setFlipV((f) => !f)}
              className={`p-1.5 rounded text-slate-300 hover:bg-slate-700 hover:text-white ${flipV ? 'bg-[#1C69A0]/40 text-[#60A5FA]' : 'bg-slate-800'}`}
              title="Flip Vertical (V)"
            >
              <FlipVertical size={14} />
            </button>

            <button
              onClick={() => setShowCrosshair((c) => !c)}
              className={`p-1.5 rounded text-slate-300 hover:bg-slate-700 ${showCrosshair ? 'bg-[#1C69A0] text-white' : 'bg-slate-800'}`}
              title="Toggle Alignment Crosshair"
            >
              <Crosshair size={14} />
            </button>

            <button
              onClick={() => setShowHUD((h) => !h)}
              className={`p-1.5 rounded text-slate-300 hover:bg-slate-700 ${showHUD ? 'bg-slate-800' : 'bg-amber-500/20 text-amber-300'}`}
              title="Toggle HUD Metadata (H)"
            >
              <Eye size={14} />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <button
              onClick={resetViewport}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white text-[11px]"
              title="Reset Zoom, Pan & Presets (R)"
            >
              <RefreshCw size={12} /> Reset
            </button>
          </div>
        </div>

        {/* ── Optional Custom Precision W/L Sliders Drawer ────────────────── */}
        {showWlPanel && (
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold w-16">Brightness:</span>
                <input
                  type="range"
                  min="20"
                  max="250"
                  value={brightness}
                  onChange={(e) => {
                    setBrightness(Number(e.target.value));
                    setActivePreset('custom');
                  }}
                  className="w-28 accent-[#1C69A0]"
                />
                <span className="font-mono text-slate-300 w-10">{brightness}%</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold w-16">Contrast:</span>
                <input
                  type="range"
                  min="20"
                  max="300"
                  value={contrast}
                  onChange={(e) => {
                    setContrast(Number(e.target.value));
                    setActivePreset('custom');
                  }}
                  className="w-28 accent-[#1C69A0]"
                />
                <span className="font-mono text-slate-300 w-10">{contrast}%</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-semibold mr-1">Color Map:</span>
                {['none', 'sepia', 'heat', 'cool'].map((cm) => (
                  <button
                    key={cm}
                    onClick={() => setColorFilter(cm)}
                    className={`px-2 py-0.5 rounded text-[11px] capitalize ${
                      colorFilter === cm ? 'bg-[#1C69A0] text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cm}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setInvert((inv) => !inv)}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  invert ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Invert Colors (I)
              </button>

              <button
                onClick={() => applyPreset('default')}
                className="text-[11px] text-slate-400 hover:text-white underline ml-2"
              >
                Reset W/L
              </button>
            </div>
          </div>
        )}

        {/* ── Main Viewport Area ──────────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Primary Viewport Canvas */}
          <div
            ref={containerRef}
            className={`relative flex items-center justify-center bg-black overflow-hidden select-none ${
              activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
            } ${splitMode === 2 ? 'w-1/2 border-r border-slate-800' : 'flex-1'}`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleCanvasClick}
          >
            {(loading || dicomLoading) ? (
              <div className="flex flex-col items-center gap-3 text-slate-300">
                <RefreshCw size={32} className="animate-spin text-[#1C69A0]" />
                <p className="text-sm font-medium">
                  {dicomLoading ? 'Decoding & rendering diagnostic DICOM pixel data...' : 'Loading diagnostic series & DICOM data...'}
                </p>
              </div>
            ) : dicomError ? (
              <div className="flex flex-col items-center gap-2 text-rose-400 p-6 text-center">
                <AlertCircle size={36} />
                <p className="text-sm font-semibold">{dicomError}</p>
                <p className="text-xs text-slate-500">Could not extract diagnostic image frames from this DICOM object.</p>
              </div>
            ) : activeDisplaySrc ? (
              (currentSlice?.fileType === 'application/pdf' || currentSlice?.title?.toLowerCase().endsWith('.pdf')) ? (
                <div className="w-full h-full max-w-5xl max-h-[78vh] bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
                  <iframe
                    src={activeDisplaySrc}
                    title={currentSlice.title}
                    className="w-full h-full border-none rounded-lg"
                  />
                </div>
              ) : (
                <div
                  className="relative transition-transform duration-75"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                    filter: filterString,
                  }}
                >
                  <img
                    ref={imageElementRef}
                    src={activeDisplaySrc}
                    alt={currentSlice?.title}
                    className="max-h-[75vh] max-w-[70vw] object-contain pointer-events-none rounded shadow-2xl"
                    draggable={false}
                  />

                  {/* Annotations & Measurements Overlay */}
                  {showAnnotations && (
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ overflow: 'visible' }}
                    >
                      {measurements
                        .filter((m) => m.sliceIndex === selectedSliceIndex || m.sliceIndex === undefined)
                        .map((m) => {
                          if (m.type === 'caliper') {
                            return (
                              <g key={m.id}>
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
                                  x={(m.p1.x + m.p2.x) / 2 - 28}
                                  y={(m.p1.y + m.p2.y) / 2 - 12}
                                  width="56"
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
                              </g>
                            );
                          } else if (m.type === 'rect') {
                            const minX = Math.min(m.p1.x, m.p2.x);
                            const minY = Math.min(m.p1.y, m.p2.y);
                            const w = Math.abs(m.p2.x - m.p1.x);
                            const h = Math.abs(m.p2.y - m.p1.y);
                            return (
                              <g key={m.id}>
                                <rect
                                  x={minX}
                                  y={minY}
                                  width={w}
                                  height={h}
                                  fill="rgba(245, 158, 11, 0.15)"
                                  stroke="#f59e0b"
                                  strokeWidth="2"
                                  strokeDasharray="4 2"
                                />
                                <rect
                                  x={minX}
                                  y={minY - 18}
                                  width="90"
                                  height="16"
                                  rx="2"
                                  fill="#0f172a"
                                  stroke="#f59e0b"
                                  strokeWidth="1"
                                />
                                <text
                                  x={minX + 45}
                                  y={minY - 9}
                                  fill="#fef3c7"
                                  fontSize="9"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  ROI: {m.areaMm2} mm²
                                </text>
                              </g>
                            );
                          } else if (m.type === 'circle') {
                            return (
                              <g key={m.id}>
                                <circle
                                  cx={m.center.x}
                                  cy={m.center.y}
                                  r={m.radiusPx}
                                  fill="rgba(56, 189, 248, 0.15)"
                                  stroke="#38bdf8"
                                  strokeWidth="2"
                                  strokeDasharray="4 2"
                                />
                                <circle cx={m.center.x} cy={m.center.y} r="3" fill="#38bdf8" />
                                <rect
                                  x={m.center.x - 45}
                                  y={m.center.y - 12}
                                  width="90"
                                  height="18"
                                  rx="3"
                                  fill="#0f172a"
                                  stroke="#38bdf8"
                                  strokeWidth="1"
                                />
                                <text
                                  x={m.center.x}
                                  y={m.center.y}
                                  fill="#e0f2fe"
                                  fontSize="9"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  Area: {m.areaMm2} mm²
                                </text>
                              </g>
                            );
                          } else if (m.type === 'angle') {
                            return (
                              <g key={m.id}>
                                <line x1={m.p1.x} y1={m.p1.y} x2={m.p2.x} y2={m.p2.y} stroke="#10b981" strokeWidth="2" />
                                <line x1={m.p2.x} y1={m.p2.y} x2={m.p3.x} y2={m.p3.y} stroke="#10b981" strokeWidth="2" />
                                <circle cx={m.p2.x} cy={m.p2.y} r="4" fill="#10b981" />
                                <rect
                                  x={m.p2.x - 25}
                                  y={m.p2.y - 20}
                                  width="50"
                                  height="16"
                                  rx="2"
                                  fill="#0f172a"
                                  stroke="#10b981"
                                  strokeWidth="1"
                                />
                                <text
                                  x={m.p2.x}
                                  y={m.p2.y - 11}
                                  fill="#d1fae5"
                                  fontSize="10"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  {m.angleDeg}°
                                </text>
                              </g>
                            );
                          } else if (m.type === 'arrow') {
                            return (
                              <g key={m.id}>
                                <circle cx={m.p.x} cy={m.p.y} r="5" fill="#f43f5e" />
                                <rect
                                  x={m.p.x + 10}
                                  y={m.p.y - 10}
                                  width={m.text.length * 7 + 16}
                                  height="20"
                                  rx="4"
                                  fill="#0f172a"
                                  stroke="#f43f5e"
                                  strokeWidth="1"
                                />
                                <text
                                  x={m.p.x + 18}
                                  y={m.p.y + 4}
                                  fill="#ffe4e6"
                                  fontSize="10"
                                  fontWeight="bold"
                                >
                                  {m.text}
                                </text>
                              </g>
                            );
                          }
                          return null;
                        })}

                      {/* Active in-progress points */}
                      {activePoints.map((pt, i) => (
                        <circle
                          key={i}
                          cx={pt.x}
                          cy={pt.y}
                          r="5"
                          fill="#f59e0b"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className="animate-ping"
                        />
                      ))}
                    </svg>
                  )}
                </div>
              )
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
            {showHUD && (
              <>
                <div className="absolute top-3 left-3 pointer-events-none text-[11px] font-mono text-cyan-300/90 bg-slate-950/70 p-2.5 rounded-lg backdrop-blur-sm border border-slate-800/60 shadow-lg">
                  <div className="font-bold text-white tracking-wide">{study.patient_name || 'PATIENT RECORD'}</div>
                  <div>PID: <span className="text-white font-bold">{study.patient_id || '—'}</span></div>
                  <div>MOD: {modality} | {study.body_part || study.exam_region || 'General'}</div>
                  <div className="text-[10px] text-slate-400">DATE: {study.study_date ? new Date(study.study_date).toLocaleDateString() : '—'}</div>
                </div>

                <div className="absolute top-3 right-3 pointer-events-none text-[11px] font-mono text-cyan-300/90 bg-slate-950/70 p-2.5 rounded-lg backdrop-blur-sm border border-slate-800/60 text-right shadow-lg">
                  <div className="text-[#60A5FA] font-bold">LEGACY CLINICS KIGALI</div>
                  <div>FRAME: {selectedSliceIndex + 1} / {slices.length || 1}</div>
                  <div>ZOOM: {Math.round(zoom * 100)}%</div>
                  <div>W/L: {activePreset.toUpperCase()} (B:{brightness} C:{contrast})</div>
                </div>
              </>
            )}

            {/* Center Crosshair Overlay */}
            {showCrosshair && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-full h-px bg-cyan-400/40" />
                <div className="h-full w-px bg-cyan-400/40 absolute" />
                <div className="w-12 h-12 rounded-full border border-cyan-400/60 absolute" />
              </div>
            )}
          </div>

          {/* Secondary Viewport (in 2-Up Split Screen Comparison Mode) */}
          {splitMode === 2 && (
            <div
              className="relative w-1/2 flex items-center justify-center bg-black overflow-hidden select-none cursor-grab active:cursor-grabbing"
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.15 : 0.15;
                setSecZoom((z) => Math.min(5, Math.max(0.3, +(z + delta).toFixed(2))));
              }}
              onMouseDown={(e) => {
                const sPan = { x: e.clientX - secPan.x, y: e.clientY - secPan.y };
                const moveHandler = (ev) => {
                  setSecPan({ x: ev.clientX - sPan.x, y: ev.clientY - sPan.y });
                };
                const upHandler = () => {
                  window.removeEventListener('mousemove', moveHandler);
                  window.removeEventListener('mouseup', upHandler);
                };
                window.addEventListener('mousemove', moveHandler);
                window.addEventListener('mouseup', upHandler);
              }}
            >
              {secondaryDisplaySrc ? (
                <div
                  className="relative transition-transform duration-75"
                  style={{
                    transform: `translate(${secPan.x}px, ${secPan.y}px) scale(${secZoom}) rotate(${rotation}deg)`,
                    filter: filterString,
                  }}
                >
                  <img
                    src={secondaryDisplaySrc}
                    alt={secondarySlice?.title}
                    className="max-h-[75vh] max-w-[35vw] object-contain pointer-events-none rounded shadow-2xl"
                    draggable={false}
                  />
                </div>
              ) : (
                <div className="text-slate-500 text-xs">No comparison slice selected.</div>
              )}

              {/* Secondary HUD */}
              <div className="absolute top-3 right-3 text-[11px] font-mono text-amber-300/90 bg-slate-950/70 p-2 rounded backdrop-blur-sm border border-slate-800/60">
                <div className="font-bold">COMPARISON FRAME</div>
                <div>Slice: {secondarySliceIndex + 1} / {slices.length}</div>
                <div>Zoom: {Math.round(secZoom * 100)}%</div>
                <select
                  value={secondarySliceIndex}
                  onChange={(e) => setSecondarySliceIndex(Number(e.target.value))}
                  className="mt-1 bg-slate-900 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-[10px]"
                >
                  {slices.map((sl, i) => (
                    <option key={sl.id || i} value={i}>
                      Frame #{sl.sliceIndex || i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ── Right-Side Clinical Report Drawer ─────────────────────────── */}
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

        {/* ── Bottom Filmstrip & Cine Player Bar ──────────────────────────── */}
        {slices.length > 0 && (
          <div className="h-28 bg-slate-950 border-t border-slate-800 px-4 py-2 flex items-center gap-4 overflow-x-auto shrink-0 select-none">
            {/* Cine Loop Player Controls */}
            {slices.length > 1 && (
              <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800 shrink-0">
                <button
                  onClick={() => setIsPlayingCine(!isPlayingCine)}
                  className={`p-2 rounded-lg font-bold transition-colors ${
                    isPlayingCine ? 'bg-amber-500 text-slate-950' : 'bg-[#1C69A0] text-white hover:bg-[#16527D]'
                  }`}
                  title={isPlayingCine ? 'Pause Cine Loop (Space)' : 'Play Cine Loop (Space)'}
                >
                  {isPlayingCine ? <Pause size={15} /> : <Play size={15} />}
                </button>

                <button
                  onClick={() => setSelectedSliceIndex((i) => Math.max(0, i - 1))}
                  disabled={selectedSliceIndex === 0}
                  className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30"
                  title="Previous Frame (Left Arrow)"
                >
                  <SkipBack size={14} />
                </button>

                <div className="text-center min-w-[70px]">
                  <div className="text-[11px] font-mono text-white font-bold">
                    {selectedSliceIndex + 1} / {slices.length}
                  </div>
                  <div className="text-[9px] text-slate-400">FRAME</div>
                </div>

                <button
                  onClick={() => setSelectedSliceIndex((i) => Math.min(slices.length - 1, i + 1))}
                  disabled={selectedSliceIndex === slices.length - 1}
                  className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30"
                  title="Next Frame (Right Arrow)"
                >
                  <SkipForward size={14} />
                </button>

                {/* FPS Selector */}
                <select
                  value={cineFps}
                  onChange={(e) => setCineFps(Number(e.target.value))}
                  className="bg-slate-950 text-slate-200 border border-slate-700 rounded px-1.5 py-1 text-[10px] font-mono"
                  title="Frames Per Second (FPS)"
                >
                  <option value={1}>1 fps</option>
                  <option value={3}>3 fps</option>
                  <option value={5}>5 fps</option>
                  <option value={10}>10 fps</option>
                  <option value={15}>15 fps</option>
                  <option value={20}>20 fps</option>
                </select>
              </div>
            )}

            {/* Thumbnail Filmstrip Carousel */}
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {slices.map((sl, idx) => (
                <button
                  key={sl.id || idx}
                  onClick={() => setSelectedSliceIndex(idx)}
                  className={`group relative h-20 w-20 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                    selectedSliceIndex === idx
                      ? 'border-[#1C69A0] ring-2 ring-[#1C69A0]/50 scale-105 shadow-lg'
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
                  <div className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] text-white px-1 py-0.5 text-center font-mono truncate">
                    #{sl.sliceIndex || idx + 1}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
