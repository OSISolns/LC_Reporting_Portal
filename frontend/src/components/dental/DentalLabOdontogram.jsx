import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, CheckCircle2, Clock, AlertCircle, Wrench,
  ChevronDown, ChevronUp, Layers, ShieldCheck, Check, Trash2, Eye,
  PlusCircle, RefreshCw, Loader2, Smile, CheckSquare, Square,
  Users, Edit3, SlidersHorizontal, FileText, Award, Stethoscope
} from 'lucide-react';
import toast from 'react-hot-toast';
import { suggestProstheticReplacement, generateLabChefNote } from '../../api/dental';

// ─── FDI Notation Teeth Definition ─────────────────────────────────────────────
export const PERMANENT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const PERMANENT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const DECIDUOUS_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const DECIDUOUS_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

export const PROSTHETIC_WORK_TYPES = [
  { id: 'Crown (Zirconia)', label: 'Zirconia Crown', category: 'Fixed Prosthetics', color: '#6366f1' },
  { id: 'Crown (PFM)', label: 'PFM Crown (Porcelain-Metal)', category: 'Fixed Prosthetics', color: '#3b82f6' },
  { id: 'Crown (E-Max)', label: 'E-Max / All-Ceramic Crown', category: 'Fixed Prosthetics', color: '#06b6d4' },
  { id: 'Crown (Full Metal/Gold)', label: 'Full Metal / Gold Crown', category: 'Fixed Prosthetics', color: '#eab308' },
  { id: 'Bridge Abutment', label: 'Bridge Abutment Unit', category: 'Fixed Prosthetics', color: '#8b5cf6' },
  { id: 'Bridge Pontic (Replacement)', label: 'Bridge Pontic (Replacement)', category: 'Fixed Prosthetics', color: '#ec4899' },
  { id: 'Declared Missing (To Be Replaced)', label: 'Declared Missing (To Be Replaced)', category: 'Replacement Prep', color: '#f43f5e' },
  { id: 'Implant Crown', label: 'Implant Abutment & Crown', category: 'Implantology', color: '#0284c7' },
  { id: 'Veneer', label: 'Laminate Veneer', category: 'Esthetics', color: '#14b8a6' },
  { id: 'Inlay / Onlay', label: 'Inlay / Onlay Restoration', category: 'Esthetics', color: '#10b981' },
  { id: 'Post & Core', label: 'Cast Post & Core / Fiber Post', category: 'Endo-Prosthetics', color: '#a855f7' },
  { id: 'Partial Denture Unit', label: 'Partial Removable Denture Tooth', category: 'Removable Prosthetics', color: '#f97316' },
  { id: 'Complete Denture Unit', label: 'Full Denture Tooth Unit', category: 'Removable Prosthetics', color: '#ea580c' },
  { id: 'Night Guard / Splint', label: 'Night Guard / Occlusal Appliance', category: 'Appliance', color: '#64748b' },
];

export const WORK_STATUSES = {
  Planning: { label: 'Planning', color: '#f59e0b', bg: 'bg-amber-50 text-amber-800 border-amber-300', dot: 'bg-amber-400' },
  'In-progress': { label: 'In Progress', color: '#6366f1', bg: 'bg-indigo-50 text-indigo-800 border-indigo-300', dot: 'bg-indigo-500 animate-pulse' },
  Completed: { label: 'Completed', color: '#10b981', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
};

export const REPLACEMENT_STRATEGIES = [
  'Bridge Pontic (Suspended Unit)',
  'Implant Crown (Edentulous Replacement)',
  'Acrylic Removable Denture Tooth',
  'Flexible Valplast Denture Unit',
  'Cast Metal Framework Tooth',
  'Space Maintainer Unit'
];

export const CONVENTIONAL_SHADES = [
  // VITA Classical A-D
  'A1', 'A2', 'A3', 'A3.5', 'A4',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4',
  'D2', 'D3', 'D4',
  // VITA Bleach 3D-Master
  'BL1 (Bleach)', 'BL2 (Bleach)', 'BL3 (Bleach)', 'BL4 (Bleach)',
  'OM1 (Ultra Bleach)', 'OM2 (Ultra Bleach)', 'OM3 (Ultra Bleach)',
  // Conventional Resin & Acrylic Shades
  '1A (Conventional Acrylic)', '2A (Conventional Acrylic)', '1C (Conventional Acrylic)',
  '1D (Conventional Acrylic)', '2B (Conventional Acrylic)', '3B (Conventional Acrylic)',
  '4A (Conventional Acrylic)', '4B (Conventional Acrylic)',
  // Gingival & Special Characterization
  'Gingival Light Pink', 'Gingival Dark Pink', 'Translucent Clear', 'Opaque White'
];

export const ORTHO_ARCH_OPTIONS = [
  {
    id: 'upper',
    label: 'Upper Arch',
    sub: 'Maxillary',
    icon: ChevronUp,
    accent: 'blue',
    ring: 'ring-blue-500/25 border-blue-500',
    activeText: 'text-blue-700',
    grad: 'from-blue-500 to-sky-500',
    chip: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'lower',
    label: 'Lower Arch',
    sub: 'Mandibular',
    icon: ChevronDown,
    accent: 'emerald',
    ring: 'ring-emerald-500/25 border-emerald-500',
    activeText: 'text-emerald-700',
    grad: 'from-emerald-500 to-teal-500',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'both',
    label: 'Both Arches',
    sub: 'Full Mouth',
    icon: Smile,
    accent: 'indigo',
    ring: 'ring-indigo-500/25 border-indigo-500',
    activeText: 'text-indigo-700',
    grad: 'from-indigo-500 via-violet-500 to-purple-500',
    chip: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
];

const OrthoArchSelector = ({ value, onChange, readOnly }) => {
  const active = ORTHO_ARCH_OPTIONS.find(o => o.id === value) || null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-fuchsia-50/50 to-white p-5 shadow-xs">
      <div className="absolute -top-8 -right-8 w-40 h-40 bg-violet-300/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-violet-100 text-violet-600">
            <Smile size={18} />
          </span>
          <div>
            <h4 className="text-sm font-extrabold text-slate-800 m-0 flex items-center gap-2">
              Orthodontic Appliance — Treatment Arch
            </h4>
            <p className="text-[11px] text-slate-500 m-0 font-medium">
              {active
                ? <>Appliance targets the <span className={`font-black ${active.activeText}`}>{active.label}</span> ({active.sub}).</>
                : 'Select which arch this removable / functional appliance is fabricated for.'}
            </p>
          </div>
        </div>

        {active && (
          <span className={`inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-xl text-[11px] font-black border ${active.chip}`}>
            <CheckCircle2 size={13} /> {active.label}
          </span>
        )}
      </div>

      <div className={`relative grid grid-cols-3 gap-2.5 ${readOnly ? 'opacity-90' : ''}`}>
        {ORTHO_ARCH_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onChange?.(isActive ? '' : opt.id)}
              className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-4 transition-all ${
                readOnly ? 'cursor-default' : 'cursor-pointer'
              } ${
                isActive
                  ? `bg-white ${opt.ring} ring-4 shadow-md scale-[1.02]`
                  : 'bg-white/70 border-slate-200 hover:border-slate-300 hover:bg-white'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="ortho-arch-active"
                  className={`absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider text-white bg-gradient-to-r ${opt.grad} shadow-sm`}
                >
                  Selected
                </motion.span>
              )}
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${opt.grad} text-white shadow-sm ${
                  isActive ? '' : 'opacity-70'
                }`}
              >
                <Icon size={18} strokeWidth={2.6} />
              </span>
              <span className={`text-xs font-black ${isActive ? opt.activeText : 'text-slate-700'}`}>
                {opt.label}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {opt.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const LuminaProstheticsSuggestion = ({
  tooth, dentitionMode, caseContext, adjacentMissingCount,
  onApplyStrategy, onApplyShade, onApplyMaterialNotes,
}) => {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setSuggestion(null);
    setError(false);
  }, [tooth]);

  const handleAsk = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await suggestProstheticReplacement({
        tooth,
        dentitionType: dentitionMode,
        patientAge: caseContext?.patientAge,
        patientGender: caseContext?.patientGender,
        workDone: caseContext?.workDone,
        clinicOfOrigin: caseContext?.clinicOfOrigin,
        adjacentMissingCount,
      });
      if (data?.success) {
        setSuggestion(data.data);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50/60 to-white border border-indigo-200/80 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">
            <Sparkles size={14} />
          </span>
          <span className="text-xs font-extrabold text-indigo-900">Lumina AI Replacement Suggestion</span>
        </div>
        <button
          type="button"
          onClick={handleAsk}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition disabled:opacity-60 cursor-pointer"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {suggestion ? 'Re-ask Lumina AI' : `Ask Lumina AI for Tooth #${tooth}`}
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-rose-600 font-semibold m-0">
          Lumina AI couldn't generate a suggestion for this tooth — try again.
        </p>
      )}

      {suggestion && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">Suggested strategy:</span>
            <span className="text-xs font-black text-indigo-800 bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
              {suggestion.replacement_strategy}
            </span>
            <button
              type="button"
              onClick={() => onApplyStrategy(suggestion.replacement_strategy)}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              Apply
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">Suggested shade:</span>
            <span className="text-xs font-black text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              Shade {suggestion.shade}
            </span>
            <button
              type="button"
              onClick={() => onApplyShade(suggestion.shade)}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              Apply
            </button>
          </div>

          <div className="bg-white/80 border border-indigo-100 rounded-xl p-3 space-y-1">
            <p className="text-[11px] font-bold text-slate-600 m-0">Suggested Material / Lab Notes</p>
            <p className="text-xs text-slate-700 font-semibold m-0">{suggestion.material}</p>
            <p className="text-[11px] text-slate-500 italic m-0">{suggestion.notes}</p>
            <button
              type="button"
              onClick={() => onApplyMaterialNotes(suggestion.material, suggestion.notes)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer mt-1"
            >
              <Check size={12} /> Use as Material / Lab Notes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const isFdiToothKey = (k) => {
  if (!k || typeof k !== 'string') return false;
  if (k.startsWith('_')) return false;
  if (['treatment_plan', 'dentition_type', 'teeth', 'general_notes', 'chef_note', 'patient_id', 'id'].includes(k.toLowerCase())) return false;
  return /^\d{2}$/.test(k) || (!isNaN(Number(k)) && Number(k) > 0);
};

export const normalizeOdontogramData = (raw) => {
  if (!raw) return {};
  let data = raw;
  if (typeof data === 'string') {
    try { data = JSON.parse(data) || {}; } catch { data = {}; }
  }
  if (typeof data !== 'object' || data === null) return {};

  const map = {};

  // Check if data is wrapped in a nested .teeth container
  const sourceTeeth = (data.teeth && typeof data.teeth === 'object') ? data.teeth : data;

  // Process valid FDI tooth keys directly
  Object.keys(sourceTeeth).forEach(key => {
    if (!isFdiToothKey(key)) return;
    const item = sourceTeeth[key];
    if (!item || typeof item !== 'object') return;

    // Case 1: Tooth already has explicit lab work logged in Dental Lab
    if (item.work_type) {
      map[key] = {
        tooth: key,
        work_type: item.work_type,
        status: item.status || 'Planning',
        shade: item.shade || 'A2',
        notes: item.notes || '',
        is_missing: !!item.is_missing || item.work_type === 'Declared Missing (To Be Replaced)',
        ...item
      };
      return;
    }

    // Case 2: Clinic charted tooth conditions (DentalCharting schema)
    const isMissing = !!item.missing || item.condition === 'Extraction Planned';
    const cond = item.condition;
    const isDiseased = cond && cond !== 'Healthy';

    if (isMissing) {
      map[key] = {
        tooth: key,
        work_type: 'Declared Missing (To Be Replaced)',
        status: 'Planning',
        shade: 'A2',
        notes: item.notes || (cond ? `Clinic: ${cond}` : 'Missing'),
        is_missing: true,
      };
    } else if (isDiseased) {
      let workType = 'Crown (Zirconia)';
      if (cond === 'Root Canal' || cond === 'Root Canal (RCT)') workType = 'Post & Core';
      else if (cond === 'Implant') workType = 'Implant Crown';
      else if (cond === 'Bridge / Pontic' || cond === 'Bridge') workType = 'Bridge Abutment';
      else if (cond === 'Crown / Veneer' || cond === 'Crown') workType = 'Crown (Zirconia)';
      else if (cond === 'Caries / Decay' || cond === 'Caries') workType = 'Crown (Zirconia)';
      else if (cond === 'Fractured' || cond === 'Fractured / Broken') workType = 'Crown (Zirconia)';

      map[key] = {
        tooth: key,
        work_type: workType,
        status: 'Planning',
        shade: 'A2',
        notes: item.notes || `Clinic condition: ${cond}`,
        is_missing: false,
      };
    }
    // Healthy teeth with no missing flag and no explicit work_type ARE NOT ADDED as work units!
  });

  // Case 3: Extract procedures from clinic treatment_plan array if present
  if (Array.isArray(data.treatment_plan)) {
    data.treatment_plan.forEach(tp => {
      if (!tp || !tp.tooth) return;
      const matches = String(tp.tooth).match(/\b(1[1-8]|2[1-8]|3[1-8]|4[1-8]|5[1-5]|6[1-5]|7[1-5]|8[1-5])\b/g);
      if (matches) {
        matches.forEach(tNum => {
          if (!map[tNum]) {
            const proc = (tp.procedure || '').toLowerCase();
            let workType = 'Crown (Zirconia)';
            if (proc.includes('extraction') || proc.includes('missing')) {
              workType = 'Declared Missing (To Be Replaced)';
            } else if (proc.includes('implant')) {
              workType = 'Implant Crown';
            } else if (proc.includes('bridge')) {
              workType = 'Bridge Abutment';
            } else if (proc.includes('denture')) {
              workType = 'Partial Denture Unit';
            } else if (proc.includes('root canal')) {
              workType = 'Post & Core';
            }

            map[tNum] = {
              tooth: tNum,
              work_type: workType,
              status: tp.status === 'Completed' ? 'Completed' : tp.status === 'In Progress' ? 'In-progress' : 'Planning',
              shade: 'A2',
              notes: tp.procedure ? `${tp.procedure}${tp.surface ? ` (${tp.surface})` : ''}` : '',
              is_missing: workType === 'Declared Missing (To Be Replaced)',
            };
          }
        });
      }
    });
  }

  if (data._chef_note) map._chef_note = data._chef_note;
  if (data.chef_note) map._chef_note = data.chef_note;

  return map;
};

export default function DentalLabOdontogram({
  odontogramData = {},
  onChange,
  readOnly = false,
  patientName = '',
  caseRef = '',
  caseContext = null,
  orthoEnabled = false,
  orthoArch = '',
  onOrthoArchChange,
  chefNote = '',
  onChefNoteChange,
}) {
  const [selectedTeeth, setSelectedTeeth] = useState(['16']);
  const [dentitionMode, setDentitionMode] = useState('adult'); // 'adult' | 'pediatric'

  // Batch Form Controls
  const [batchWorkType, setBatchWorkType] = useState('Crown (Zirconia)');
  const [batchStatus, setBatchStatus] = useState('Planning');
  const [batchShade, setBatchShade] = useState('A2');
  const [batchNotes, setBatchNotes] = useState('');
  const [batchStrategy, setBatchStrategy] = useState('Bridge Pontic (Suspended Unit)');

  // Chef Note State
  const initialChefNote = chefNote || odontogramData?._chef_note || odontogramData?.chef_note || '';
  const [chefNoteText, setChefNoteText] = useState(initialChefNote);
  const [luminaLoading, setLuminaLoading] = useState(false);

  useEffect(() => {
    const val = chefNote || odontogramData?._chef_note || odontogramData?.chef_note || '';
    setChefNoteText(val);
  }, [chefNote, odontogramData?._chef_note, odontogramData?.chef_note]);

  const toothMap = useMemo(() => normalizeOdontogramData(odontogramData), [odontogramData]);

  const upperArchActive = orthoEnabled && (orthoArch === 'upper' || orthoArch === 'both');
  const lowerArchActive = orthoEnabled && (orthoArch === 'lower' || orthoArch === 'both');

  const upperTeeth = dentitionMode === 'adult' ? PERMANENT_UPPER : DECIDUOUS_UPPER;
  const lowerTeeth = dentitionMode === 'adult' ? PERMANENT_LOWER : DECIDUOUS_LOWER;

  // Single primary selected tooth for Lumina AI & single-tooth details
  const selectedTooth = selectedTeeth.length > 0 ? selectedTeeth[selectedTeeth.length - 1] : '16';
  const currentToothWork = toothMap[selectedTooth] || null;

  // Tooth selection click handler
  const handleToothClick = (strNum, e) => {
    if (e?.shiftKey || e?.ctrlKey || e?.metaKey) {
      setSelectedTeeth(prev => {
        if (prev.includes(strNum)) {
          const next = prev.filter(t => t !== strNum);
          return next.length > 0 ? next : [strNum];
        }
        return [...prev, strNum];
      });
    } else {
      setSelectedTeeth(prev => {
        if (prev.includes(strNum) && prev.length > 1) {
          return [strNum];
        }
        return [strNum];
      });
    }
  };

  // Quick selection helpers
  const selectUpperArch = () => {
    const teeth = upperTeeth.map(String);
    setSelectedTeeth(teeth);
    toast.success(`Selected Upper Arch (${teeth.length} teeth)`);
  };

  const selectLowerArch = () => {
    const teeth = lowerTeeth.map(String);
    setSelectedTeeth(teeth);
    toast.success(`Selected Lower Arch (${teeth.length} teeth)`);
  };

  const selectAllTeeth = () => {
    const teeth = [...upperTeeth, ...lowerTeeth].map(String);
    setSelectedTeeth(teeth);
    toast.success(`Selected All ${teeth.length} teeth`);
  };

  const selectLoggedTeeth = () => {
    const logged = Object.keys(toothMap).filter(isFdiToothKey);
    if (logged.length === 0) {
      toast('No logged prosthetic work units found.');
      return;
    }
    setSelectedTeeth(logged);
    toast.success(`Selected ${logged.length} logged work units`);
  };

  const clearSelection = () => {
    setSelectedTeeth([]);
  };

  const getAdjacentMissingCount = (toothNum) => {
    const num = Number(toothNum);
    const row = upperTeeth.includes(num) ? upperTeeth : lowerTeeth;
    const idx = row.indexOf(num);
    if (idx === -1) return 0;
    return [row[idx - 1], row[idx + 1]].filter((neighbor) => {
      if (neighbor === undefined) return false;
      const work = toothMap[String(neighbor)];
      return work?.is_missing || work?.work_type === 'Declared Missing (To Be Replaced)';
    }).length;
  };

  // Single-tooth update handler
  const handleUpdateTooth = (updates) => {
    if (readOnly || !onChange) return;
    const existing = toothMap[selectedTooth] || {
      tooth: selectedTooth,
      work_type: 'Crown (Zirconia)',
      is_missing: false,
      replacement_strategy: 'Bridge Pontic (Suspended Unit)',
      status: 'Planning',
      shade: 'A2',
      notes: '',
      material: 'Zirconia HT'
    };
    const updated = { ...existing, ...updates, tooth: selectedTooth };
    const nextMap = { ...toothMap, [selectedTooth]: updated };
    if (chefNoteText) nextMap._chef_note = chefNoteText;
    onChange(nextMap);
  };

  // Batch Apply Prosthetic Work Type & attributes to all selected teeth
  const handleApplyBatchWork = () => {
    if (readOnly || !onChange) return;
    if (selectedTeeth.length === 0) {
      toast.error('Please select at least one tooth first.');
      return;
    }

    const nextMap = { ...toothMap };
    const isMissingType = batchWorkType === 'Declared Missing (To Be Replaced)';

    selectedTeeth.forEach(strNum => {
      const existing = nextMap[strNum] || { tooth: strNum };
      nextMap[strNum] = {
        ...existing,
        tooth: strNum,
        work_type: batchWorkType,
        status: batchStatus,
        shade: batchShade,
        notes: batchNotes || existing.notes || '',
        is_missing: isMissingType,
        replacement_strategy: isMissingType ? batchStrategy : (existing.replacement_strategy || 'Bridge Pontic (Suspended Unit)'),
      };
    });

    if (chefNoteText) nextMap._chef_note = chefNoteText;
    onChange(nextMap);
    toast.success(`Applied "${batchWorkType}" to ${selectedTeeth.length} selected teeth (#${selectedTeeth.join(', #')})!`);
  };

  // Batch declare missing
  const handleBatchDeclareMissing = () => {
    if (readOnly || !onChange) return;
    if (selectedTeeth.length === 0) {
      toast.error('Please select at least one tooth first.');
      return;
    }

    const nextMap = { ...toothMap };
    selectedTeeth.forEach(strNum => {
      const existing = nextMap[strNum] || { tooth: strNum };
      nextMap[strNum] = {
        ...existing,
        tooth: strNum,
        is_missing: true,
        work_type: 'Declared Missing (To Be Replaced)',
        replacement_strategy: batchStrategy || 'Bridge Pontic (Suspended Unit)',
        status: batchStatus,
        shade: batchShade,
      };
    });

    if (chefNoteText) nextMap._chef_note = chefNoteText;
    onChange(nextMap);
    toast.success(`Declared ${selectedTeeth.length} selected teeth missing for replacement!`);
  };

  // Batch remove work
  const handleBatchRemoveWork = () => {
    if (readOnly || !onChange) return;
    if (selectedTeeth.length === 0) return;

    const nextMap = { ...toothMap };
    selectedTeeth.forEach(strNum => {
      delete nextMap[strNum];
    });

    if (chefNoteText) nextMap._chef_note = chefNoteText;
    onChange(nextMap);
    toast.success(`Removed prosthetic work for ${selectedTeeth.length} teeth.`);
  };

  // Single remove work
  const handleRemoveToothWork = (toothNum) => {
    if (readOnly || !onChange) return;
    const nextMap = { ...toothMap };
    delete nextMap[toothNum];
    if (chefNoteText) nextMap._chef_note = chefNoteText;
    onChange(nextMap);
  };

  // Chef Note update
  const handleChefNoteSubmit = (newText) => {
    setChefNoteText(newText);
    if (onChefNoteChange) onChefNoteChange(newText);
    if (!readOnly && onChange) {
      const nextMap = { ...toothMap, _chef_note: newText };
      onChange(nextMap);
    }
  };

  // Double-click declares single tooth missing
  const handleQuickDeclareMissing = (toothNum) => {
    if (readOnly || !onChange) return;
    const strNum = toothNum.toString();
    setSelectedTeeth([strNum]);

    const existing = toothMap[strNum] || { tooth: strNum, work_type: 'Crown (Zirconia)', status: 'Planning', shade: 'A2' };
    if (existing.is_missing || existing.work_type === 'Declared Missing (To Be Replaced)') {
      toast(`Tooth #${strNum} is already declared missing.`);
      return;
    }

    const updated = {
      ...existing,
      is_missing: true,
      work_type: 'Declared Missing (To Be Replaced)',
      replacement_strategy: existing.replacement_strategy || 'Bridge Pontic (Suspended Unit)',
    };
    const nextMap = { ...toothMap, [strNum]: { ...updated, tooth: strNum } };
    if (chefNoteText) nextMap._chef_note = chefNoteText;
    onChange(nextMap);
    toast.success(`Tooth #${strNum} declared missing — right-click to undo.`);
  };

  // Right-click undoes missing
  const handleQuickUndoMissing = (toothNum) => {
    if (readOnly || !onChange) return;
    const strNum = toothNum.toString();
    const existing = toothMap[strNum];
    const isMissing = existing?.is_missing || existing?.work_type === 'Declared Missing (To Be Replaced)';
    if (!isMissing) return;

    setSelectedTeeth([strNum]);
    const updated = {
      ...existing,
      is_missing: false,
      work_type: existing.work_type === 'Declared Missing (To Be Replaced)' ? 'Crown (Zirconia)' : existing.work_type,
    };
    const nextMap = { ...toothMap, [strNum]: { ...updated, tooth: strNum } };
    if (chefNoteText) nextMap._chef_note = chefNoteText;
    onChange(nextMap);
    toast.success(`Tooth #${strNum} restored (no longer missing).`);
  };

  // Stats calculation (filtering valid FDI tooth keys)
  const toothEntries = Object.entries(toothMap).filter(([k]) => isFdiToothKey(k));
  const totalUnits = toothEntries.length;
  const missingReplacementUnits = toothEntries.filter(([, t]) => t.is_missing || t.work_type === 'Declared Missing (To Be Replaced)').length;
  const planningUnits = toothEntries.filter(([, t]) => t.status === 'Planning').length;
  const inProgressUnits = toothEntries.filter(([, t]) => t.status === 'In-progress').length;
  const completedUnits = toothEntries.filter(([, t]) => t.status === 'Completed').length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-6 font-sans">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold">
              <Wrench size={18} />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 tracking-tight m-0">
                Dental Lab Prosthetics &amp; Replacement Odontogram (FDI)
              </h3>
              <p className="text-xs text-slate-500 m-0 font-medium">
                {patientName ? `Prosthetic fabrication & edentulous replacement for ${patientName}` : 'Select one or several teeth to plan crowns, bridges, dentures & declare missing teeth to replace.'}
                {caseRef && <span className="ml-1 text-indigo-600 font-bold">({caseRef})</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          {/* Dentition Selector */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setDentitionMode('adult')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                dentitionMode === 'adult' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Permanent (11-48)
            </button>
            <button
              type="button"
              onClick={() => setDentitionMode('pediatric')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                dentitionMode === 'pediatric' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Primary (51-85)
            </button>
          </div>
        </div>
      </div>

      {/* ─── DENTAL CLINICIAN REFERRAL & INSTRUCTIONS PRIORITY BANNER ─── */}
      {(caseContext?.deliveryNotes || caseContext?.workDoneOther || caseContext?.clinicianName) && (
        <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-cyan-500/10 border-2 border-teal-500/30 rounded-3xl p-5 space-y-3.5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-200/60 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm">
                <Stethoscope size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black text-teal-950 tracking-tight m-0 flex items-center gap-2">
                  Dental Clinician Referral Note &amp; Prosthetic Specifications
                </h4>
                <p className="text-xs text-teal-800 font-semibold m-0 mt-0.5">
                  Issued by <strong className="text-teal-900 font-black">{caseContext.clinicianName ? `Dr. ${caseContext.clinicianName}` : 'Dental Clinician'}</strong> {caseContext.clinicOfOrigin ? `• ${caseContext.clinicOfOrigin}` : ''}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-600 text-white shadow-xs self-start sm:self-center">
              <Sparkles size={11} /> Top Priority Clinician Directive
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {caseContext.deliveryNotes && (
              <div className="bg-white/90 border border-teal-200/70 rounded-2xl p-3.5 space-y-1 shadow-2xs">
                <span className="text-[10px] font-black uppercase text-teal-800 tracking-wider flex items-center gap-1">
                  <FileText size={11} className="text-teal-600" /> Clinician Referral &amp; Case Notes
                </span>
                <p className="text-slate-800 font-bold leading-relaxed whitespace-pre-wrap m-0 text-xs">{caseContext.deliveryNotes}</p>
              </div>
            )}

            {caseContext.workDoneOther && (
              <div className="bg-white/90 border border-teal-200/70 rounded-2xl p-3.5 space-y-1 shadow-2xs">
                <span className="text-[10px] font-black uppercase text-teal-800 tracking-wider flex items-center gap-1">
                  <Wrench size={11} className="text-teal-600" /> Prosthetic Replacement / Appliance Directive
                </span>
                <p className="text-slate-900 font-black leading-relaxed m-0 text-xs">{caseContext.workDoneOther}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUMMARY STATUS CHIPS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Work Units</span>
            <span className="text-xl font-black text-slate-800">{totalUnits} units</span>
          </div>
          <span className="p-2.5 rounded-xl bg-slate-200/60 text-slate-600 font-black">
            <Layers size={16} />
          </span>
        </div>

        <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block">To Be Replaced</span>
            <span className="text-xl font-black text-rose-900">{missingReplacementUnits}</span>
          </div>
          <span className="p-2.5 rounded-xl bg-rose-100 text-rose-700 font-black">
            <AlertCircle size={16} />
          </span>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">Planning</span>
            <span className="text-xl font-black text-amber-900">{planningUnits}</span>
          </div>
          <span className="p-2.5 rounded-xl bg-amber-100 text-amber-700 font-black">
            <Clock size={16} />
          </span>
        </div>

        <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block">In Production</span>
            <span className="text-xl font-black text-indigo-900">{inProgressUnits}</span>
          </div>
          <span className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 font-black">
            <Sparkles size={16} />
          </span>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">Completed</span>
            <span className="text-xl font-black text-emerald-900">{completedUnits}</span>
          </div>
          <span className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 font-black">
            <CheckCircle2 size={16} />
          </span>
        </div>
      </div>

      {/* ORTHODONTIC APPLIANCE — TREATMENT ARCH SELECTOR (ortho cases only) */}
      {orthoEnabled && (
        <OrthoArchSelector
          value={orthoArch}
          onChange={onOrthoArchChange}
          readOnly={readOnly || !onOrthoArchChange}
        />
      )}

      {/* QUICK MULTI-TEETH SELECTION TOOLBAR */}
      {!readOnly && (
        <div className="bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">
              <Users size={15} />
            </span>
            <div>
              <span className="text-xs font-black text-slate-800 block">Multi-Teeth Selection Tool</span>
              <span className="text-[11px] text-slate-500 font-medium">
                {selectedTeeth.length > 0
                  ? <><span className="font-bold text-indigo-600">{selectedTeeth.length} teeth selected</span> (#{selectedTeeth.join(', #')})</>
                  : 'Click teeth on chart or use shortcuts below to select multiple teeth.'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={selectUpperArch}
              className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer"
            >
              Upper Arch
            </button>
            <button
              type="button"
              onClick={selectLowerArch}
              className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer"
            >
              Lower Arch
            </button>
            <button
              type="button"
              onClick={selectAllTeeth}
              className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={selectLoggedTeeth}
              className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition cursor-pointer"
            >
              Logged Units
            </button>
            {selectedTeeth.length > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
              >
                Clear ({selectedTeeth.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* GRAPHICAL FDI ODONTOGRAM CHART */}
      <div className="bg-gradient-to-b from-slate-50/90 via-indigo-50/30 to-purple-50/20 rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-72 h-72 bg-indigo-200/20 rounded-full blur-3xl" />

        {/* Quadrant Legend */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 pb-3 border-b border-slate-200/80">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>MAXILLARY (UPPER ARCH)</span>
          </span>
          {upperArchActive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-blue-500 to-sky-500 shadow-sm">
              <Smile size={12} /> Appliance Arch
            </span>
          )}
        </div>

        {/* UPPER TEETH ROW */}
        <div className={`overflow-x-auto pb-2 scrollbar-thin rounded-2xl transition-all ${
          upperArchActive ? 'ring-2 ring-blue-400/60 bg-blue-50/40 py-2' : ''
        }`}>
          <div className="flex items-center justify-center gap-1.5 min-w-[650px] mx-auto">
            {upperTeeth.map((num) => {
              const strNum = num.toString();
              const isSelected = selectedTeeth.includes(strNum);
              const work = toothMap[strNum];
              const isCompleted = work?.status === 'Completed';
              const isMissing = (work?.is_missing || work?.work_type === 'Declared Missing (To Be Replaced)') && !isCompleted;
              const isInProgress = work?.status === 'In-progress';

              return (
                <button
                  key={num}
                  type="button"
                  onClick={(e) => handleToothClick(strNum, e)}
                  onDoubleClick={() => handleQuickDeclareMissing(strNum)}
                  onContextMenu={(e) => { e.preventDefault(); handleQuickUndoMissing(strNum); }}
                  title={readOnly ? undefined : 'Click to select (Shift/Ctrl for multi-select) • Double-click missing • Right-click undo'}
                  className={`relative group flex flex-col items-center p-2 rounded-2xl transition-all cursor-pointer border-2 ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-600 ring-4 ring-indigo-500/30 scale-105 z-20 shadow-md'
                      : work
                      ? isMissing
                        ? 'bg-rose-50/90 border-rose-500 shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-50/90 border-emerald-500 shadow-xs'
                        : isInProgress
                        ? 'bg-indigo-50/90 border-indigo-500 shadow-xs'
                        : 'bg-amber-50/90 border-amber-500 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-slate-400 hover:shadow-xs'
                  }`}
                  style={{ width: 54, height: 82 }}
                >
                  {/* Selected checkmark indicator */}
                  {isSelected && (
                    <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold shadow-sm z-30">
                      ✓
                    </span>
                  )}

                  <span className={`text-[11px] font-mono font-black mb-1 ${
                    isSelected ? 'text-indigo-700 font-extrabold' : work ? 'text-slate-900' : 'text-slate-600'
                  }`}>
                    {num}
                  </span>

                  {/* Solid Anatomical SVG Tooth Graphic */}
                  <div className="relative flex-1 flex items-center justify-center">
                    <svg width="34" height="42" viewBox="0 0 34 42" className="block">
                      {isMissing ? (
                        <g>
                          <rect x="3" y="10" width="28" height="28" fill="#fff1f2" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3,3" rx="6" />
                          <line x1="7" y1="14" x2="27" y2="34" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1="27" y1="14" x2="7" y2="34" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
                        </g>
                      ) : (
                        <g>
                          <path
                            d="M 11 14 C 11 3, 17 1, 17 1 C 17 1, 23 3, 23 14 Z"
                            fill={work ? (isCompleted ? '#34d399' : isInProgress ? '#818cf8' : '#fbbf24') : '#e2e8f0'}
                            stroke={work ? (isCompleted ? '#059669' : isInProgress ? '#4338ca' : '#d97706') : '#94a3b8'}
                            strokeWidth="1.3"
                          />
                          <rect
                            x="4" y="14" width="26" height="24" rx="5"
                            fill={work ? (isCompleted ? '#10b981' : isInProgress ? '#6366f1' : '#f59e0b') : '#ffffff'}
                            stroke={isSelected ? '#4f46e5' : work ? (isCompleted ? '#047857' : isInProgress ? '#3730a3' : '#b45309') : '#64748b'}
                            strokeWidth="1.8"
                          />
                        </g>
                      )}
                    </svg>

                    {work && (
                      <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black shadow-xs ${
                        isMissing ? 'bg-rose-600 text-white' : isCompleted ? 'bg-emerald-600 text-white' : isInProgress ? 'bg-indigo-600 text-white animate-pulse' : 'bg-amber-500 text-white'
                      }`}>
                        {isMissing ? 'M' : isCompleted ? '✓' : isInProgress ? 'P' : '!'}
                      </span>
                    )}
                  </div>

                  {work && (
                    <span className={`text-[8px] font-black uppercase truncate w-full text-center mt-1 ${
                      isMissing ? 'text-rose-700' : isCompleted ? 'text-emerald-800' : isInProgress ? 'text-indigo-800' : 'text-amber-800'
                    }`}>
                      {isMissing ? 'REPLACE' : (work.shade || work.work_type?.split(' ')[0])}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* MID ARCH DIVIDER */}
        <div className="flex items-center justify-center gap-4 text-[11px] font-extrabold text-slate-500 py-1.5 border-y border-slate-200/80 bg-white/60 rounded-xl">
          <span className="text-blue-700">RIGHT QUADRANTS (Q1 &amp; Q4)</span>
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-slate-700">MIDLINE SEPARATION</span>
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-purple-700">LEFT QUADRANTS (Q2 &amp; Q3)</span>
        </div>

        {/* LOWER TEETH ROW */}
        <div className={`overflow-x-auto pt-1 scrollbar-thin rounded-2xl transition-all ${
          lowerArchActive ? 'ring-2 ring-emerald-400/60 bg-emerald-50/40 py-2' : ''
        }`}>
          <div className="flex items-center justify-center gap-1.5 min-w-[650px] mx-auto">
            {lowerTeeth.map((num) => {
              const strNum = num.toString();
              const isSelected = selectedTeeth.includes(strNum);
              const work = toothMap[strNum];
              const isCompleted = work?.status === 'Completed';
              const isMissing = (work?.is_missing || work?.work_type === 'Declared Missing (To Be Replaced)') && !isCompleted;
              const isInProgress = work?.status === 'In-progress';

              return (
                <button
                  key={num}
                  type="button"
                  onClick={(e) => handleToothClick(strNum, e)}
                  onDoubleClick={() => handleQuickDeclareMissing(strNum)}
                  onContextMenu={(e) => { e.preventDefault(); handleQuickUndoMissing(strNum); }}
                  title={readOnly ? undefined : 'Click to select (Shift/Ctrl for multi-select) • Double-click missing • Right-click undo'}
                  className={`relative group flex flex-col items-center p-2 rounded-2xl transition-all cursor-pointer border-2 ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-600 ring-4 ring-indigo-500/30 scale-105 z-20 shadow-md'
                      : work
                      ? isMissing
                        ? 'bg-rose-50/90 border-rose-500 shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-50/90 border-emerald-500 shadow-xs'
                        : isInProgress
                        ? 'bg-indigo-50/90 border-indigo-500 shadow-xs'
                        : 'bg-amber-50/90 border-amber-500 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-slate-400 hover:shadow-xs'
                  }`}
                  style={{ width: 54, height: 82 }}
                >
                  {/* Selected checkmark indicator */}
                  {isSelected && (
                    <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold shadow-sm z-30">
                      ✓
                    </span>
                  )}

                  {work && (
                    <span className={`text-[8px] font-black uppercase truncate w-full text-center mb-0.5 ${
                      isMissing ? 'text-rose-700' : isCompleted ? 'text-emerald-800' : isInProgress ? 'text-indigo-800' : 'text-amber-800'
                    }`}>
                      {isMissing ? 'REPLACE' : (work.shade || work.work_type?.split(' ')[0])}
                    </span>
                  )}

                  <div className="relative flex-1 flex items-center justify-center">
                    <svg width="34" height="42" viewBox="0 0 34 42" className="block">
                      {isMissing ? (
                        <g>
                          <rect x="3" y="4" width="28" height="28" fill="#fff1f2" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3,3" rx="6" />
                          <line x1="7" y1="8" x2="27" y2="28" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1="27" y1="8" x2="7" y2="28" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
                        </g>
                      ) : (
                        <g>
                          <rect
                            x="4" y="4" width="26" height="24" rx="5"
                            fill={work ? (isCompleted ? '#10b981' : isInProgress ? '#6366f1' : '#f59e0b') : '#ffffff'}
                            stroke={isSelected ? '#4f46e5' : work ? (isCompleted ? '#047857' : isInProgress ? '#3730a3' : '#b45309') : '#64748b'}
                            strokeWidth="1.8"
                          />
                          <path
                            d="M 11 28 C 11 39, 17 41, 17 41 C 17 41, 23 39, 23 28 Z"
                            fill={work ? (isCompleted ? '#34d399' : isInProgress ? '#818cf8' : '#fbbf24') : '#e2e8f0'}
                            stroke={work ? (isCompleted ? '#059669' : isInProgress ? '#4338ca' : '#d97706') : '#94a3b8'}
                            strokeWidth="1.3"
                          />
                        </g>
                      )}
                    </svg>

                    {work && (
                      <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black shadow-xs ${
                        isMissing ? 'bg-rose-600 text-white' : isCompleted ? 'bg-emerald-600 text-white' : isInProgress ? 'bg-indigo-600 text-white animate-pulse' : 'bg-amber-500 text-white'
                      }`}>
                        {isMissing ? 'M' : isCompleted ? '✓' : isInProgress ? 'P' : '!'}
                      </span>
                    )}
                  </div>

                  <span className={`text-[11px] font-mono font-black mt-1 ${
                    isSelected ? 'text-indigo-700 font-extrabold' : work ? 'text-slate-900' : 'text-slate-600'
                  }`}>
                    {num}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-slate-600 pt-2 border-t border-slate-200/80">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>MANDIBULAR (LOWER ARCH)</span>
            {lowerArchActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm">
                <Smile size={12} /> Appliance Arch
              </span>
            )}
          </span>
          <span className="text-[10px] text-slate-500 font-extrabold uppercase">
            {readOnly ? 'Click teeth to view details' : 'Click/Shift+Click to select multiple teeth • Double-click missing • Right-click undo'}
          </span>
        </div>
      </div>

      {/* BATCH PROSTHETIC WORK TYPE EDITOR & SINGLE-TOOTH CONTROL CARD */}
      <div className="bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 border border-indigo-200/80 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-mono font-black text-sm shadow-md shadow-indigo-500/20">
              {selectedTeeth.length > 1 ? `${selectedTeeth.length}T` : `#${selectedTooth}`}
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 m-0 flex items-center gap-2">
                {selectedTeeth.length > 1
                  ? `Batch Apply Prosthetic Work Type (${selectedTeeth.length} Teeth Selected)`
                  : `Tooth #${selectedTooth} Prosthetics Order & Specification`}
              </h4>
              <p className="text-xs text-slate-500 m-0 font-medium">
                {selectedTeeth.length > 1
                  ? `Target teeth: #${selectedTeeth.join(', #')} — Pick Prosthetic Work Type below to apply to all selected teeth at once.`
                  : currentToothWork?.is_missing
                  ? `Declared Missing Tooth — Replacement strategy: ${currentToothWork.replacement_strategy}`
                  : currentToothWork
                  ? `Currently logged: ${currentToothWork.work_type}`
                  : 'No prosthetic work assigned yet to this tooth.'}
              </p>
            </div>
          </div>

          {selectedTeeth.length > 0 && !readOnly && (
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={handleBatchRemoveWork}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
              >
                <Trash2 size={13} /> Clear Work ({selectedTeeth.length})
              </button>
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="space-y-4">

            {/* LUMINA AI REPLACEMENT SUGGESTION (when missing single tooth active) */}
            {selectedTeeth.length === 1 && currentToothWork?.is_missing && (
              <LuminaProstheticsSuggestion
                tooth={selectedTooth}
                dentitionMode={dentitionMode}
                caseContext={caseContext}
                adjacentMissingCount={getAdjacentMissingCount(selectedTooth)}
                onApplyStrategy={(strategy) => handleUpdateTooth({ replacement_strategy: strategy })}
                onApplyShade={(shade) => handleUpdateTooth({ shade })}
                onApplyMaterialNotes={(material, notes) => handleUpdateTooth({ notes: `${material} — ${notes}` })}
              />
            )}

            {/* FORM CONTROLS & BATCH WORK TYPE SELECTOR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Work Type / Replacement Type */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block mb-1 flex items-center justify-between">
                  <span>Prosthetic Work Type</span>
                  {selectedTeeth.length > 1 && (
                    <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full font-bold">
                      Batch ({selectedTeeth.length})
                    </span>
                  )}
                </label>
                <select
                  value={selectedTeeth.length === 1 ? (currentToothWork?.work_type || batchWorkType) : batchWorkType}
                  onChange={(e) => {
                    setBatchWorkType(e.target.value);
                    if (selectedTeeth.length === 1) {
                      handleUpdateTooth({ work_type: e.target.value, is_missing: e.target.value === 'Declared Missing (To Be Replaced)' });
                    }
                  }}
                  className="w-full text-xs font-extrabold border border-indigo-200 rounded-xl px-3 py-2 bg-white text-indigo-900 outline-none focus:border-indigo-500 shadow-xs"
                >
                  {PROSTHETIC_WORK_TYPES.map((wt) => (
                    <option key={wt.id} value={wt.id}>
                      {wt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Manufacturing Status */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Manufacturing Status
                </label>
                <select
                  value={selectedTeeth.length === 1 ? (currentToothWork?.status || batchStatus) : batchStatus}
                  onChange={(e) => {
                    setBatchStatus(e.target.value);
                    if (selectedTeeth.length === 1) handleUpdateTooth({ status: e.target.value });
                  }}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="Planning">Planning (Queue)</option>
                  <option value="In-progress">In-progress (Milling / Waxing)</option>
                  <option value="Completed">Completed (Ready)</option>
                </select>
              </div>

              {/* Conventional & VITA Tooth Shade */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Conventional &amp; VITA Shade
                </label>
                <select
                  value={selectedTeeth.length === 1 ? (currentToothWork?.shade || batchShade) : batchShade}
                  onChange={(e) => {
                    setBatchShade(e.target.value);
                    if (selectedTeeth.length === 1) handleUpdateTooth({ shade: e.target.value });
                  }}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 outline-none focus:border-indigo-500"
                >
                  {CONVENTIONAL_SHADES.map((s) => (
                    <option key={s} value={s}>
                      Shade {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Material & Remarks */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Material / Lab Notes
                </label>
                <input
                  type="text"
                  value={selectedTeeth.length === 1 ? (currentToothWork?.notes || batchNotes) : batchNotes}
                  placeholder="e.g. Translucent Zirconia, Custom Post..."
                  onChange={(e) => {
                    setBatchNotes(e.target.value);
                    if (selectedTeeth.length === 1) handleUpdateTooth({ notes: e.target.value });
                  }}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* BATCH ACTION BUTTONS */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-indigo-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyBatchWork}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Wrench size={14} /> Apply Work Type to Selected ({selectedTeeth.length})
                </button>

                <button
                  type="button"
                  onClick={handleBatchDeclareMissing}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
                >
                  <AlertCircle size={14} /> Declare Selected Missing ({selectedTeeth.length})
                </button>
              </div>

              <span className="text-[11px] text-slate-400 font-medium italic">
                Tip: Click teeth on chart to customize selection before applying.
              </span>
            </div>

          </div>
        )}
      </div>

      {/* ─── CHEF NOTE FOR WHOLE PROSTHETIC WORK DONE ─── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 text-slate-500 flex-shrink-0">
              <FileText size={14} />
            </span>
            <div>
              <h4 className="text-xs font-semibold text-slate-800 m-0 tracking-tight">
                Chief Technologist Master Note — Whole Prosthetic Work Done
              </h4>
              <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                Master clinical lab instructions, occlusion findings, articulation, or QC notes for this case.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 self-start sm:self-center whitespace-nowrap">
            Master Case Note
          </span>
        </div>

        {readOnly ? (
          <div className="border border-slate-200 rounded-lg p-3.5 text-xs text-slate-700 whitespace-pre-wrap bg-slate-50">
            {chefNoteText || <span className="italic text-slate-400">No master note recorded for this prosthetic restoration.</span>}
          </div>
        ) : (
          <div className="space-y-2.5">
            <textarea
              rows={3}
              value={chefNoteText}
              onChange={(e) => handleChefNoteSubmit(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-3 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-slate-300 resize-y transition"
            />

            {/* Lumina Suggestion */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={luminaLoading}
                onClick={async () => {
                  setLuminaLoading(true);
                  try {
                    const res = await generateLabChefNote({
                      odontogramData: toothMap,
                      patientName: patientName || '',
                      caseRef: caseRef || '',
                      dentist: caseContext?.clinicianName || '',
                      clinicianNote: caseContext?.deliveryNotes || '',
                      treatmentDirective: caseContext?.workDoneOther || '',
                    });
                    const note = res?.data?.data?.note;
                    if (note) {
                      handleChefNoteSubmit(note);
                      toast.success('Lumina AI generated full master chef note incorporating clinician notes.');
                    }
                  } catch {
                    toast.error('Failed to generate Lumina master note.');
                  } finally { setLuminaLoading(false); }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-slate-400 hover:text-slate-600 border border-slate-200 hover:border-slate-300 rounded-md bg-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {luminaLoading
                  ? <Loader2 size={11} className="animate-spin" />
                  : <Sparkles size={11} />}
                <span>Suggest with Lumina</span>
              </button>
              <span className="text-[10px] text-slate-300">optional</span>
            </div>
          </div>
        )}
      </div>

      {/* LOGGED UNITS LIST TABLE */}
      {toothEntries.length > 0 && (
        <div className="pt-2">
          <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center justify-between">
            <span>Prosthetic &amp; Replacement Units ({toothEntries.length} units)</span>
          </h5>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] font-extrabold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5">FDI Tooth #</th>
                  <th className="px-3.5 py-2.5">Work / Replacement Type</th>
                  <th className="px-3.5 py-2.5">Conventional Shade</th>
                  <th className="px-3.5 py-2.5">Notes</th>
                  <th className="px-3.5 py-2.5 text-center">Status</th>
                  {!readOnly && <th className="px-3.5 py-2.5 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {toothEntries.map(([toothNum, data]) => {
                  const st = WORK_STATUSES[data.status] || WORK_STATUSES['Planning'];
                  const isMissing = data.is_missing || data.work_type === 'Declared Missing (To Be Replaced)';
                  const isSelected = selectedTeeth.includes(toothNum);
                  return (
                    <tr
                      key={toothNum}
                      onClick={(e) => handleToothClick(toothNum, e)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50/80 font-bold' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="px-3.5 py-2.5 font-mono font-black text-indigo-600 flex items-center gap-1.5">
                        {isSelected && <span className="text-indigo-600 text-xs">✓</span>}
                        #{toothNum}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-900 font-bold">
                        {isMissing ? (
                          <span className="text-rose-600 flex items-center gap-1 font-extrabold">
                            <AlertCircle size={13} /> {data.replacement_strategy || 'Missing (To Be Replaced)'}
                          </span>
                        ) : (
                          data.work_type
                        )}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] font-bold text-slate-700">
                          {data.shade || 'A2'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-500 text-[11px]">
                        {data.notes || '—'}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${st.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      {!readOnly && (
                        <td className="px-3.5 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRemoveToothWork(toothNum); }}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer p-1 rounded hover:bg-rose-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
