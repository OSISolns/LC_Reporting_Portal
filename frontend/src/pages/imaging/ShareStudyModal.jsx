import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  User,
  AlertTriangle,
  Clock,
  Shield,
  Copy,
  Check,
  Eye,
  FileText,
  Download,
  Search
} from 'lucide-react';
import { getProviders, createShare } from '../../api/imaging';
import { toast } from 'react-hot-toast';

const URGENCY_OPTIONS = [
  { value: 'routine', label: 'Routine', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { value: 'urgent', label: 'Urgent (Priority)', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'stat', label: 'STAT (Immediate)', color: 'bg-rose-100 text-rose-800 border-rose-300' },
];

export default function ShareStudyModal({
  study = null,
  archiveItem = null,
  isOpen,
  onClose,
  onSuccess = null,
}) {
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [providerSearch, setProviderSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);

  const [urgency, setUrgency] = useState('routine');
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');
  const [canViewImages, setCanViewImages] = useState(true);
  const [canViewReport, setCanViewReport] = useState(true);
  const [canDownload, setCanDownload] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState('30');

  const [submitting, setSubmitting] = useState(false);
  const [createdShare, setCreatedShare] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCreatedShare(null);
      setCopied(false);
      return;
    }

    const loadProviders = async () => {
      setLoadingProviders(true);
      try {
        const res = await getProviders();
        setProviders(res.data.data || []);
      } catch {
        toast.error('Failed to load requesting providers.');
      } finally {
        setLoadingProviders(false);
      }
    };

    loadProviders();

    // Auto-fill from study
    if (study) {
      if (study.clinical_indication) setClinicalIndication(study.clinical_indication);
      if (study.priority === 'stat') setUrgency('stat');
      else if (study.priority === 'urgent') setUrgency('urgent');
    }
  }, [isOpen, study]);

  if (!isOpen) return null;

  const filteredProviders = providers.filter((p) => {
    const q = providerSearch.toLowerCase();
    const name = (p.name || '').toLowerCase();
    const spec = (p.specialization || '').toLowerCase();
    const title = (p.title || '').toLowerCase();
    return name.includes(q) || spec.includes(q) || title.includes(q);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProvider) {
      toast.error('Please select a requesting provider.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        studyId: study?.id || null,
        archiveId: archiveItem?.id || null,
        patientId: study?.patient_id || archiveItem?.patient_id || 'UNKNOWN',
        patientName: study?.patient_name || archiveItem?.patient_name || 'Patient',
        modality: study?.modality || archiveItem?.modality || 'X-Ray',
        providerId: selectedProvider.id,
        providerName: selectedProvider.name,
        providerEmail: selectedProvider.email || null,
        urgency,
        clinicalIndication,
        consultationNotes,
        canViewImages,
        canViewReport,
        canDownload,
        expiresInDays: Number(expiresInDays),
      };

      const res = await createShare(payload);
      setCreatedShare(res.data.data);
      toast.success(res.data.message || 'Study shared successfully!');
      if (onSuccess) onSuccess(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to share imaging study.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyShareLink = () => {
    if (!createdShare) return;
    const shareUrl = `${window.location.origin}/imaging?tab=shares&token=${createdShare.share_token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Access link copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const patientName = study?.patient_name || archiveItem?.patient_name || 'Unknown Patient';
  const patientId = study?.patient_id || archiveItem?.patient_id || 'N/A';
  const modality = study?.modality || archiveItem?.modality || 'X-Ray';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1C69A0]/20 text-[#60A5FA] rounded-lg">
              <Share2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Share Imaging Study</h2>
              <p className="text-xs text-slate-300">
                Grant in-portal diagnostic viewing access to requesting doctor or consultant
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Study Summary Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-slate-800 text-sm">{patientName}</div>
              <div className="text-slate-500 font-mono mt-0.5">PID: {patientId}</div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-[#1C69A0]/10 text-[#1C69A0] border border-[#1C69A0]/20">
                {modality}
              </span>
              <div className="text-slate-500 text-[11px] mt-1">
                {study?.body_part || archiveItem?.body_region || 'General Study'}
              </div>
            </div>
          </div>

          {createdShare ? (
            /* Success confirmation screen */
            <div className="space-y-4 py-2">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check size={20} />
                </div>
                <h3 className="font-bold text-emerald-900 text-base">Study Successfully Shared</h3>
                <p className="text-xs text-emerald-700">
                  Shared with <strong>{createdShare.provider_name}</strong> under <strong>{createdShare.modality}</strong>.
                  An in-portal notification has been generated.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Direct In-Lumina Access Link</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/imaging?tab=shares&token=${createdShare.share_token}`}
                    className="flex-1 text-xs font-mono bg-slate-100 border border-slate-300 rounded-lg p-2.5 text-slate-700"
                  />
                  <button
                    onClick={copyShareLink}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#1C69A0] hover:bg-[#16527D] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Share Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Requesting Provider <span className="text-rose-500">*</span>
                </label>

                {selectedProvider ? (
                  <div className="flex items-center justify-between p-3 bg-[#1C69A0]/5 border border-[#1C69A0]/20 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#1C69A0] text-white flex items-center justify-center font-bold text-xs">
                        {selectedProvider.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{selectedProvider.name}</div>
                        <div className="text-[11px] text-[#1C69A0] font-semibold">
                          {selectedProvider.specialization || selectedProvider.title || 'Clinician'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProvider(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1 rounded bg-white border border-slate-200"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search doctor, consultant, or dentist..."
                        value={providerSearch}
                        onChange={(e) => setProviderSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C69A0]"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                      {loadingProviders ? (
                        <div className="p-3 text-center text-xs text-slate-400">Loading providers...</div>
                      ) : filteredProviders.length > 0 ? (
                        filteredProviders.slice(0, 30).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedProvider(p)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-[#1C69A0]/5 transition-colors flex items-center justify-between"
                          >
                            <span className="font-semibold text-slate-800">{p.name}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {p.specialization || 'Provider'}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400">No matching providers found.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Urgency Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {URGENCY_OPTIONS.map((u) => (
                    <button
                      key={u.value}
                      type="button"
                      onClick={() => setUrgency(u.value)}
                      className={`py-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                        urgency === u.value
                          ? `${u.color} ring-2 ring-[#1C69A0]/30 font-bold shadow-sm`
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clinical Indication */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinical Indication / Reason for Imaging
                </label>
                <input
                  type="text"
                  placeholder="e.g., Acute chest pain, r/o pneumonia or fracture..."
                  value={clinicalIndication}
                  onChange={(e) => setClinicalIndication(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C69A0]"
                />
              </div>

              {/* Consultation Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Consultation Notes / Instructions for Provider
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Cross-sectional MRI series attached. Please inspect L4-L5 disc space for nerve impingement..."
                  value={consultationNotes}
                  onChange={(e) => setConsultationNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C69A0]"
                />
              </div>

              {/* Permissions & Expiry */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="text-xs font-semibold text-slate-700">Access Permissions</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canViewImages}
                      onChange={(e) => setCanViewImages(e.target.checked)}
                      className="rounded text-[#1C69A0] focus:ring-[#1C69A0]"
                    />
                    <span className="text-slate-700">View Images</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canViewReport}
                      onChange={(e) => setCanViewReport(e.target.checked)}
                      className="rounded text-[#1C69A0] focus:ring-[#1C69A0]"
                    />
                    <span className="text-slate-700">View Report</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canDownload}
                      onChange={(e) => setCanDownload(e.target.checked)}
                      className="rounded text-[#1C69A0] focus:ring-[#1C69A0]"
                    />
                    <span className="text-slate-700">Download</span>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Access Expiration:</span>
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 font-medium text-slate-700"
                  >
                    <option value="7">7 Days</option>
                    <option value="14">14 Days</option>
                    <option value="30">30 Days (Standard)</option>
                    <option value="90">90 Days</option>
                    <option value="0">Never Expires</option>
                  </select>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedProvider}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#1C69A0] hover:bg-[#16527D] disabled:opacity-50 rounded-lg transition-colors shadow-sm"
                >
                  <Share2 size={14} />
                  {submitting ? 'Sharing...' : 'Share Study'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
