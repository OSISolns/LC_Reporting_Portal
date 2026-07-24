import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Stethoscope, AlertTriangle, Check, Copy, Loader2,
  ShieldAlert, Pill, FileText, X, Plus, ChevronRight
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const CLINICAL_PRESETS = [
  { id: 'pulpitis', label: 'Acute Pulpitis / Endodontic Pain', desc: 'Severe toothache, irreversible pulpitis, thermal sensitivity' },
  { id: 'abscess', label: 'Odontogenic Abscess & Infection', desc: 'Periapical abscess, facial swelling, purulent exudate' },
  { id: 'post_op', label: 'Post-Extraction & Implant Surgery', desc: 'Post-surgical pain management, bone grafting, soft tissue prep' },
  { id: 'pericoronitis', label: 'Pericoronitis / Wisdom Tooth', desc: 'Operculum inflammation around erupting 3rd molar' },
  { id: 'stomatitis', label: 'Denture Stomatitis / Oral Candidiasis', desc: 'Erythematous mucosal inflammation under removable prosthetics' },
];

export default function LuminaDentalAiPrescriber({
  isOpen,
  onClose,
  onApplyPrescription,
  initialCondition = '',
  patientName = '',
}) {
  const [condition, setCondition] = useState(initialCondition || 'Acute Pulpitis / Endodontic Pain');
  const [procedure, setProcedure] = useState('');
  const [severity, setSeverity] = useState('Moderate');
  const [penicillinAllergy, setPenicillinAllergy] = useState(false);
  const [nsaidAllergy, setNsaidAllergy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const allergies = [];
      if (penicillinAllergy) allergies.push('Penicillin Allergy');
      if (nsaidAllergy) allergies.push('NSAID Allergy / GI Ulcer');

      const res = await api.post('/ai/clinical/dental-medications', {
        condition,
        procedure,
        severity,
        allergies,
      });

      if (res.data?.success) {
        setResult(res.data.data);
        toast.success('Lumina AI Dental Prescription generated!');
      }
    } catch (err) {
      toast.error('Failed to generate Lumina AI dental prescriptions.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAll = () => {
    if (!result?.recommendations?.length) return;
    if (onApplyPrescription) {
      onApplyPrescription(result.recommendations);
      toast.success('Applied AI medication recommendations to prescription!');
      if (onClose) onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-purple-800 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-200">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight m-0 flex items-center gap-2">
                Lumina AI Dental Prescriber
              </h3>
              <p className="text-xs text-indigo-200 m-0 font-medium">
                {patientName ? `Evidence-based dental medication protocols for ${patientName}` : 'AI Dental Pharmacology & Evidence-based Protocols'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 font-sans">
          
          {/* CONDITION PRESETS */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">
              Select Clinical Condition / Diagnosis
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CLINICAL_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setCondition(preset.label)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    condition === preset.label
                      ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <span className="text-xs font-black text-slate-800 block">{preset.label}</span>
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5 line-clamp-1">{preset.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* INPUT FORM & ALLERGY CHECK */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Custom Clinical Details / Procedure
              </label>
              <input
                type="text"
                value={procedure}
                onChange={(e) => setProcedure(e.target.value)}
                placeholder="e.g. Surgical extraction tooth #48, sinus lift..."
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Pain / Infection Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 outline-none focus:border-indigo-500"
              >
                <option value="Mild">Mild</option>
                <option value="Moderate">Moderate</option>
                <option value="Severe">Severe</option>
              </select>
            </div>

            {/* Safety & Allergy Checks */}
            <div className="sm:col-span-3 pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-4">
              <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                <ShieldAlert size={15} className="text-rose-500" /> Patient Safety Alerts:
              </span>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={penicillinAllergy}
                  onChange={(e) => setPenicillinAllergy(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className={penicillinAllergy ? 'text-rose-600 font-extrabold' : ''}>
                  Penicillin / Amoxicillin Allergy
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nsaidAllergy}
                  onChange={(e) => setNsaidAllergy(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className={nsaidAllergy ? 'text-rose-600 font-extrabold' : ''}>
                  NSAID Intolerance / Peptic Ulcer
                </span>
              </label>
            </div>
          </div>

          {/* GENERATE BUTTON */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>Generate Lumina AI Dental Prescription Protocol</span>
          </button>

          {/* AI RESULTS CONTAINER */}
          {result && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              {/* WARNINGS ALERT BOX */}
              {result.warnings?.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs">
                    <AlertTriangle size={16} />
                    <span>Clinical Contraindication Warning</span>
                  </div>
                  {result.warnings.map((w, idx) => (
                    <p key={idx} className="text-xs text-rose-700 font-semibold m-0 leading-relaxed">
                      • {w}
                    </p>
                  ))}
                </div>
              )}

              {/* RECOMMENDED DRUGS LIST */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 m-0 flex items-center gap-1.5">
                    <Pill size={16} className="text-indigo-600" />
                    Recommended Medication Regimen ({result.recommendations.length} items)
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {result.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-indigo-300 transition-colors space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="text-sm font-black text-slate-900">{rec.drug}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                            {rec.category}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                          {rec.dose} • {rec.route} • {rec.frequency}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span>Duration: <strong className="text-slate-800">{rec.duration}</strong></span>
                        <span className="text-slate-500 italic">{rec.notes}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            Close
          </button>

          {result?.recommendations?.length > 0 && onApplyPrescription && (
            <button
              type="button"
              onClick={handleApplyAll}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Check size={16} />
              <span>Apply Prescriptions to Patient</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
