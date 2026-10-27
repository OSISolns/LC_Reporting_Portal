import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Link2,
  Loader2,
  ImageOff,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getViewerBundle, getRenderedFrame, linkDicom, getDicomStatus, getArchive } from '../../api/imaging';
import api from '../../api/axios';
import { isDicomFile, renderDicomToDataUrl } from '../../utils/dicomHelper';
import DiagnosticViewerModal from './DiagnosticViewerModal';

/**
 * Diagnostic & DICOM study viewer. Displays both Lumina Vault archive series
 * (CT, MRI, OPG, X-Ray, etc.) and server-rendered PACS DICOM frames.
 * Also provides one-click access to the full Diagnostic Workstation modal.
 *
 * Props: study (with id, study_instance_uid), canLink (bool)
 */
const ImagingStudyViewer = ({ study, canLink }) => {
  const [pacsConfigured, setPacsConfigured] = useState(true);
  const [series, setSeries] = useState([]);
  const [activeSeries, setActiveSeries] = useState(0);
  const [index, setIndex] = useState(0);
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showWorkstation, setShowWorkstation] = useState(false);
  const objectUrlRef = useRef(null);

  useEffect(() => {
    getDicomStatus()
      .then((r) => setPacsConfigured(r.data?.data?.configured ?? true))
      .catch(() => {});
  }, []);

  const loadImages = useCallback(async () => {
    if (!study?.id) return;
    try {
      setLoading(true);
      const res = await getViewerBundle(study.id);
      const bundle = res.data?.data;
      const combinedSeries = [];

      // 1. Process archived uploaded files (CT, MRI, OPG, X-Ray, etc.)
      if (bundle?.archives && bundle.archives.length > 0) {
        const groups = {};
        bundle.archives.forEach((arc) => {
          const sName = arc.series_name || 'Diagnostic Archive';
          if (!groups[sName]) groups[sName] = [];

          let src = '';
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
            src = `/api/imaging/archives/${arc.id}/file`;
          }

          groups[sName].push({
            id: `arc-${arc.id}`,
            archiveId: arc.id,
            type: 'archive',
            title: arc.file_name || `Slice ${arc.slice_index || 1}`,
            fileType: arc.file_type,
            src,
            modality: arc.modality || study.modality || 'Archive',
          });
        });

        Object.keys(groups).forEach((key, idx) => {
          combinedSeries.push({
            id: `series-arc-${idx}`,
            type: 'archive',
            description: key,
            modality: groups[key][0]?.modality || study.modality,
            instances: groups[key],
          });
        });
      }

      // 2. Process DICOM PACS instances if present
      if (bundle?.dicoms && bundle.dicoms.length > 0) {
        const dcmGroups = {};
        bundle.dicoms.forEach((d) => {
          const sUid = d.series_instance_uid || 'PACS DICOM Series';
          if (!dcmGroups[sUid]) dcmGroups[sUid] = [];
          dcmGroups[sUid].push({
            id: `dcm-${d.id}`,
            type: 'dicom',
            series_instance_uid: d.series_instance_uid,
            sop_instance_uid: d.sop_instance_uid,
            thumbnail_base64: d.thumbnail_base64,
          });
        });

        Object.keys(dcmGroups).forEach((key, idx) => {
          combinedSeries.push({
            id: `series-dcm-${idx}`,
            type: 'dicom',
            series_instance_uid: key,
            description: `PACS DICOM (${key.slice(-8)})`,
            modality: study.modality || 'CT',
            instances: dcmGroups[key],
          });
        });
      }

      setSeries(combinedSeries);
      setActiveSeries(0);
      setIndex(0);
    } catch (err) {
      console.warn('Failed to load study images:', err);
    } finally {
      setLoading(false);
    }
  }, [study?.id, study?.modality]);

  useEffect(() => { loadImages(); }, [loadImages]);

  const currentSeries = series[activeSeries];
  const currentInstance = currentSeries?.instances?.[index];

  // Fetch or resolve image frame
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!currentSeries || !currentInstance) {
        setImgUrl(null);
        return;
      }

      if (currentInstance.type === 'archive') {
        if (objectUrlRef.current) window.URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;

        const isDcm = isDicomFile(currentInstance.title, currentInstance.fileType, currentInstance.src);
        if (isDcm) {
          setLoading(true);
          try {
            let inputData = null;
            if (currentInstance.src && currentInstance.src.startsWith('data:')) {
              inputData = currentInstance.src;
            } else if (currentInstance.archiveId) {
              const archRes = await getArchive(currentInstance.archiveId);
              if (archRes.data?.data?.file_base64) {
                inputData = archRes.data.data.file_base64;
              } else {
                const binRes = await api.get(`/imaging/archives/${currentInstance.archiveId}/file`, {
                  responseType: 'arraybuffer',
                });
                inputData = binRes.data;
              }
            } else if (currentInstance.src) {
              const res = await api.get(currentInstance.src, { responseType: 'arraybuffer' });
              inputData = res.data;
            }

            if (inputData) {
              const rendered = await renderDicomToDataUrl(inputData);
              if (!cancelled) setImgUrl(rendered.dataUrl);
            } else {
              if (!cancelled) setImgUrl(currentInstance.src);
            }
          } catch (dErr) {
            console.warn('DICOM preview decode error:', dErr);
            if (!cancelled) setImgUrl(currentInstance.src);
          } finally {
            if (!cancelled) setLoading(false);
          }
          return;
        }

        setImgUrl(currentInstance.src);
        setLoading(false);
        return;
      }

      // DICOM proxy instance
      setLoading(true);
      try {
        if (currentInstance.thumbnail_base64) {
          setImgUrl(`data:image/jpeg;base64,${currentInstance.thumbnail_base64}`);
        } else {
          const res = await getRenderedFrame(study.id, {
            series: currentSeries.series_instance_uid || currentInstance.series_instance_uid,
            sop: currentInstance.sop_instance_uid,
          });
          if (cancelled) return;
          if (objectUrlRef.current) window.URL.revokeObjectURL(objectUrlRef.current);
          const url = window.URL.createObjectURL(res.data);
          objectUrlRef.current = url;
          setImgUrl(url);
        }
      } catch {
        if (!cancelled) setImgUrl(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [study?.id, currentSeries, currentInstance]);

  useEffect(() => () => { if (objectUrlRef.current) window.URL.revokeObjectURL(objectUrlRef.current); }, []);

  const doLink = async () => {
    const uid = study.study_instance_uid || window.prompt('StudyInstanceUID to pull from PACS:');
    if (!uid) return;
    setLinking(true);
    try {
      const res = await linkDicom(study.id, uid);
      toast.success(res.data.message || 'Linked.');
      loadImages();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Link failed.');
    } finally { setLinking(false); }
  };

  const total = currentSeries?.instances?.length || 0;
  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(total - 1, i + 1));

  const LinkButton = () => canLink && (
    <button onClick={doLink} disabled={linking}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-60">
      {linking ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />} Link DICOM
    </button>
  );

  return (
    <>
      <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800 text-slate-200">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Layers size={14} className="text-[#60A5FA]" />
            {series.length > 0 ? (
              <select
                value={activeSeries}
                onChange={(e) => { setActiveSeries(Number(e.target.value)); setIndex(0); }}
                className="bg-slate-700 text-slate-100 rounded px-2 py-0.5 text-xs font-medium border border-slate-600 focus:outline-none"
              >
                {series.map((s, i) => (
                  <option key={s.id || i} value={i}>
                    {s.description || s.modality || 'Series'} ({s.instances?.length || 0} img)
                  </option>
                ))}
              </select>
            ) : <span>Imaging Viewer</span>}
          </div>
          <div className="flex items-center gap-2">
            {series.length > 0 && (
              <>
                <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700" title="Zoom Out">
                  <ZoomOut size={14} />
                </button>
                <button onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700" title="Zoom In">
                  <ZoomIn size={14} />
                </button>
              </>
            )}
            <button
              onClick={() => setShowWorkstation(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1C69A0] text-white hover:bg-[#16527D] text-xs font-semibold transition-colors shadow-sm"
              title="Open full In-Lumina Diagnostic Workstation"
            >
              <Maximize2 size={13} /> Workstation
            </button>
            <LinkButton />
          </div>
        </div>

        <div className="relative flex items-center justify-center bg-black overflow-hidden select-none" style={{ height: 380 }}>
          {loading && <Loader2 size={28} className="animate-spin text-[#1C69A0] absolute z-10" />}
          {imgUrl ? (
            <img
              src={imgUrl}
              alt="Diagnostic slice"
              className="object-contain cursor-pointer transition-transform duration-75"
              style={{ maxHeight: '100%', maxWidth: '100%', transform: `scale(${zoom})` }}
              onClick={() => setShowWorkstation(true)}
              title="Click to open in Diagnostic Workstation"
            />
          ) : (
            !loading && (
              <div className="text-center text-slate-500 px-6">
                <ImageOff size={32} className="mx-auto mb-2 text-slate-600" />
                <p className="text-sm font-medium text-slate-400">
                  {series.length === 0
                    ? 'No images uploaded or linked to this study yet.'
                    : 'Image frame unavailable.'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Upload images in Archive Hub or link DICOM from PACS to view slices.
                </p>
              </div>
            )
          )}

          {total > 1 && (
            <>
              <button
                onClick={prev}
                disabled={index === 0}
                className="absolute left-2.5 p-1 rounded-full bg-slate-900/80 text-white hover:bg-[#1C69A0] disabled:opacity-20 transition-all border border-slate-700"
                title="Previous slice"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                onClick={next}
                disabled={index === total - 1}
                className="absolute right-2.5 p-1 rounded-full bg-slate-900/80 text-white hover:bg-[#1C69A0] disabled:opacity-20 transition-all border border-slate-700"
                title="Next slice"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </div>

        {total > 0 && (
          <div className="px-3 py-1.5 bg-slate-800 text-slate-300 text-[11px] font-mono flex items-center justify-between border-t border-slate-700">
            <span>{currentSeries?.modality || study.modality || ''} · {currentInstance?.title || currentSeries?.description || 'Slice'}</span>
            <span>Slice {index + 1} / {total}</span>
          </div>
        )}
      </div>

      {/* Full Diagnostic Workstation Modal */}
      {showWorkstation && (
        <DiagnosticViewerModal
          studyId={study.id}
          isOpen={showWorkstation}
          onClose={() => setShowWorkstation(false)}
        />
      )}
    </>
  );
};

export default ImagingStudyViewer;
