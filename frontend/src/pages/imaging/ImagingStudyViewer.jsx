import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Link2, Loader2, ImageOff, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getDicomImages, getRenderedFrame, linkDicom, getDicomStatus } from '../../api/imaging';

/**
 * Lightweight DICOM viewer. Reads series/instances mirrored from the PACS and
 * displays server-rendered frames (WADO-RS /rendered) fetched through the
 * authenticated backend proxy — no PACS credentials in the browser, no heavy
 * WebGL loader. Degrades gracefully when no PACS is configured or no images are
 * linked yet.
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
  const objectUrlRef = useRef(null);

  useEffect(() => {
    getDicomStatus().then((r) => setPacsConfigured(r.data.data.configured)).catch(() => {});
  }, []);

  const loadImages = useCallback(async () => {
    if (!study?.id) return;
    try {
      const res = await getDicomImages(study.id);
      setSeries(res.data.data.series || []);
      setActiveSeries(0);
      setIndex(0);
    } catch { /* ignore */ }
  }, [study?.id]);

  useEffect(() => { loadImages(); }, [loadImages]);

  const currentSeries = series[activeSeries];
  const currentInstance = currentSeries?.instances?.[index];

  // Fetch the rendered frame for the current instance through the proxy.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!currentSeries || !currentInstance) { setImgUrl(null); return; }
      setLoading(true);
      try {
        const res = await getRenderedFrame(study.id, {
          series: currentSeries.series_instance_uid,
          sop: currentInstance.sop_instance_uid,
        });
        if (cancelled) return;
        if (objectUrlRef.current) window.URL.revokeObjectURL(objectUrlRef.current);
        const url = window.URL.createObjectURL(res.data);
        objectUrlRef.current = url;
        setImgUrl(url);
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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-60">
      {linking ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Link DICOM
    </button>
  );

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-200">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 text-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Layers size={14} />
          {series.length > 0 ? (
            <select value={activeSeries} onChange={(e) => { setActiveSeries(Number(e.target.value)); setIndex(0); }}
              className="bg-slate-700 text-slate-100 rounded px-2 py-0.5 text-xs">
              {series.map((s, i) => (
                <option key={s.id} value={i}>{s.description || s.modality || 'Series'} ({s.instances?.length || 0})</option>
              ))}
            </select>
          ) : <span>Imaging</span>}
        </div>
        <div className="flex items-center gap-2">
          {series.length > 0 && (
            <>
              <button onClick={() => setZoom((z) => Math.max(1, z - 0.25))} className="text-slate-300 hover:text-white"><ZoomOut size={15} /></button>
              <button onClick={() => setZoom((z) => Math.min(4, z + 0.25))} className="text-slate-300 hover:text-white"><ZoomIn size={15} /></button>
            </>
          )}
          <LinkButton />
        </div>
      </div>

      <div className="relative flex items-center justify-center bg-black" style={{ height: 380 }}>
        {loading && <Loader2 size={26} className="animate-spin text-slate-500 absolute" />}
        {imgUrl ? (
          <img src={imgUrl} alt="DICOM frame" style={{ maxHeight: '100%', maxWidth: '100%', transform: `scale(${zoom})`, transition: 'transform 0.1s' }} />
        ) : (
          !loading && (
            <div className="text-center text-slate-500 px-6">
              <ImageOff size={30} className="mx-auto mb-2" />
              <p className="text-sm">
                {!pacsConfigured
                  ? 'No PACS configured (set ORTHANC_DICOMWEB_URL).'
                  : series.length === 0
                    ? 'No images linked to this study yet.'
                    : 'Frame unavailable.'}
              </p>
              {pacsConfigured && series.length === 0 && canLink && <p className="text-xs mt-1">Use “Link DICOM” to pull images from the PACS.</p>}
            </div>
          )
        )}

        {total > 1 && (
          <>
            <button onClick={prev} disabled={index === 0} className="absolute left-2 text-slate-300 hover:text-white disabled:opacity-30"><ChevronLeft size={26} /></button>
            <button onClick={next} disabled={index === total - 1} className="absolute right-2 text-slate-300 hover:text-white disabled:opacity-30"><ChevronRight size={26} /></button>
          </>
        )}
      </div>

      {total > 0 && (
        <div className="px-3 py-1.5 bg-slate-800 text-slate-300 text-[11px] flex items-center justify-between">
          <span>{currentSeries?.modality || ''} · {currentSeries?.series_instance_uid?.slice(-12)}</span>
          <span>Image {index + 1} / {total}</span>
        </div>
      )}
    </div>
  );
};

export default ImagingStudyViewer;
