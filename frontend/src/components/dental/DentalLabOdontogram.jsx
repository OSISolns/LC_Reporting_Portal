import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, CheckCircle2, Clock, AlertCircle, Wrench,
  ChevronDown, Layers, ShieldCheck, Check, Trash2, Eye,
  PlusCircle, RefreshCw
} from 'lucide-react';

// ─── FDI Notation Teeth Definition ─────────────────────────────────────────────
const PERMANENT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const PERMANENT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const DECIDUOUS_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const DECIDUOUS_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

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

export default function DentalLabOdontogram({
  odontogramData = {},
  onChange,
  readOnly = false,
  patientName = '',
  caseRef = ''
}) {
  const [selectedTooth, setSelectedTooth] = useState('16');
  const [dentitionMode, setDentitionMode] = useState('adult'); // 'adult' | 'pediatric'

  const toothMap = odontogramData || {};

  const upperTeeth = dentitionMode === 'adult' ? PERMANENT_UPPER : DECIDUOUS_UPPER;
  const lowerTeeth = dentitionMode === 'adult' ? PERMANENT_LOWER : DECIDUOUS_LOWER;

  // Active Tooth Data
  const currentToothWork = toothMap[selectedTooth] || null;

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
    onChange(nextMap);
  };

  const handleToggleMissing = (isMissing) => {
    if (readOnly || !onChange) return;
    if (isMissing) {
      handleUpdateTooth({
        is_missing: true,
        work_type: 'Declared Missing (To Be Replaced)',
        replacement_strategy: currentToothWork?.replacement_strategy || 'Bridge Pontic (Suspended Unit)'
      });
    } else {
      handleUpdateTooth({
        is_missing: false,
        work_type: currentToothWork?.work_type === 'Declared Missing (To Be Replaced)' ? 'Crown (Zirconia)' : currentToothWork?.work_type
      });
    }
  };

  const handleRemoveToothWork = (toothNum) => {
    if (readOnly || !onChange) return;
    const nextMap = { ...toothMap };
    delete nextMap[toothNum];
    onChange(nextMap);
  };

  // Stats calculation
  const totalUnits = Object.keys(toothMap).length;
  const missingReplacementUnits = Object.values(toothMap).filter(t => t.is_missing || t.work_type === 'Declared Missing (To Be Replaced)').length;
  const planningUnits = Object.values(toothMap).filter(t => t.status === 'Planning').length;
  const inProgressUnits = Object.values(toothMap).filter(t => t.status === 'In-progress').length;
  const completedUnits = Object.values(toothMap).filter(t => t.status === 'Completed').length;

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
                Dental Lab Prosthetics & Replacement Odontogram (FDI)
              </h3>
              <p className="text-xs text-slate-500 m-0 font-medium">
                {patientName ? `Prosthetic fabrication & edentulous replacement for ${patientName}` : 'Select a tooth on the FDI chart to plan crowns, bridges, dentures & declare missing teeth to replace.'}
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

      {/* SUMMARY STATUS CHIPS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Work Units</span>
            <span className="text-xl font-black text-slate-800">{totalUnits} units</span>
          </div>
          <span className="p-2.5 rounded-xl bg-slate-200/60 text-slate-600 font-black">
            <Layers size={16} />
          </span>
        </div>

        <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block">To Be Replaced</span>
            <span className="text-xl font-black text-rose-900">{missingReplacementUnits}</span>
          </div>
          <span className="p-2.5 rounded-xl bg-rose-100 text-rose-700 font-black">
            <AlertCircle size={16} />
          </span>
        </div>

        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">Planning</span>
            <span className="text-xl font-black text-amber-900">{planningUnits}</span>
          </div>
          <span className="p-2.5 rounded-xl bg-amber-100 text-amber-700 font-black">
            <Clock size={16} />
          </span>
        </div>

        <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block">In Production</span>
            <span className="text-xl font-black text-indigo-900">{inProgressUnits}</span>
          </div>
          <span className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 font-black">
            <Sparkles size={16} />
          </span>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">Completed</span>
            <span className="text-xl font-black text-emerald-900">{completedUnits}</span>
          </div>
          <span className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 font-black">
            <CheckCircle2 size={16} />
          </span>
        </div>
      </div>

      {/* GRAPHICAL FDI ODONTOGRAM CHART (SOLID PROSTHETIC ANATOMICAL UNITS) */}
      <div className="bg-slate-900 rounded-3xl p-6 shadow-inner text-white space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />

        {/* Quadrant Legend */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono pb-2 border-b border-slate-800">
          <span>MAXILLARY (UPPER ARCH)</span>
          <span className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-widest bg-indigo-950/80 px-3 py-1 rounded-full border border-indigo-800">
            Solid Tooth Units (No decay surfaces)
          </span>
        </div>

        {/* UPPER TEETH ROW */}
        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex items-center justify-center gap-1.5 min-w-[650px] mx-auto">
            {upperTeeth.map((num) => {
              const strNum = num.toString();
              const isSelected = selectedTooth === strNum;
              const work = toothMap[strNum];
              const isMissing = work?.is_missing || work?.work_type === 'Declared Missing (To Be Replaced)';
              const isCompleted = work?.status === 'Completed';
              const isInProgress = work?.status === 'In-progress';

              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSelectedTooth(strNum)}
                  className={`relative group flex flex-col items-center p-2 rounded-2xl transition-all cursor-pointer border-2 ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-400 ring-4 ring-indigo-500/30 scale-105 z-20'
                      : work
                      ? isMissing
                        ? 'bg-rose-950/60 border-rose-500/80'
                        : isCompleted
                        ? 'bg-emerald-950/60 border-emerald-500/80'
                        : isInProgress
                        ? 'bg-indigo-950/60 border-indigo-500/80'
                        : 'bg-amber-950/60 border-amber-500/80'
                      : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
                  }`}
                  style={{ width: 54, height: 80 }}
                >
                  <span className="text-[11px] font-mono font-bold text-slate-300 mb-1">{num}</span>

                  {/* Solid Anatomical SVG Tooth Graphic */}
                  <div className="relative flex-1 flex items-center justify-center">
                    <svg width="34" height="42" viewBox="0 0 34 42" className="block">
                      {isMissing ? (
                        /* EDENTULOUS REPLACEMENT GRAPHIC (Dashed pontic space) */
                        <g>
                          <rect x="3" y="10" width="28" height="28" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3,3" rx="6" />
                          <line x1="6" y1="13" x2="28" y2="35" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1="28" y1="13" x2="6" y2="35" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
                        </g>
                      ) : (
                        /* SOLID PROSTHETIC TOOTH CROWN & ROOT (Whole Tooth Unit) */
                        <g>
                          {/* Upper Root */}
                          <path
                            d="M 11 14 C 11 3, 17 1, 17 1 C 17 1, 23 3, 23 14 Z"
                            fill={work ? (isCompleted ? '#10b981' : isInProgress ? '#6366f1' : '#f59e0b') : '#334155'}
                            stroke={work ? '#ffffff' : '#64748b'}
                            strokeWidth="1.2"
                          />
                          {/* Upper Solid Crown Unit */}
                          <rect
                            x="4" y="14" width="26" height="24" rx="5"
                            fill={work ? (isCompleted ? '#059669' : isInProgress ? '#4f46e5' : '#d97706') : '#1e293b'}
                            stroke={isSelected ? '#a5b4fc' : work ? '#ffffff' : '#475569'}
                            strokeWidth="1.5"
                          />
                        </g>
                      )}
                    </svg>

                    {/* Status Badge Tag */}
                    {work && (
                      <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center text-[8px] font-black ${
                        isMissing ? 'bg-rose-600 text-white' : isCompleted ? 'bg-emerald-500 text-white' : isInProgress ? 'bg-indigo-500 text-white animate-pulse' : 'bg-amber-500 text-slate-950'
                      }`}>
                        {isMissing ? 'M' : isCompleted ? '✓' : isInProgress ? 'P' : '!'}
                      </span>
                    )}
                  </div>

                  {work && (
                    <span className="text-[8px] font-black uppercase text-indigo-200 truncate w-full text-center mt-1">
                      {isMissing ? 'REPLACE' : (work.shade || work.work_type?.split(' ')[0])}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* MID ARCH DIVIDER */}
        <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-slate-500 py-1 border-y border-slate-800">
          <span>RIGHT QUADRANTS (Q1 & Q4)</span>
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span>MIDLINE SEPARATION</span>
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span>LEFT QUADRANTS (Q2 & Q3)</span>
        </div>

        {/* LOWER TEETH ROW */}
        <div className="overflow-x-auto pt-1 scrollbar-thin">
          <div className="flex items-center justify-center gap-1.5 min-w-[650px] mx-auto">
            {lowerTeeth.map((num) => {
              const strNum = num.toString();
              const isSelected = selectedTooth === strNum;
              const work = toothMap[strNum];
              const isMissing = work?.is_missing || work?.work_type === 'Declared Missing (To Be Replaced)';
              const isCompleted = work?.status === 'Completed';
              const isInProgress = work?.status === 'In-progress';

              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSelectedTooth(strNum)}
                  className={`relative group flex flex-col items-center p-2 rounded-2xl transition-all cursor-pointer border-2 ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-400 ring-4 ring-indigo-500/30 scale-105 z-20'
                      : work
                      ? isMissing
                        ? 'bg-rose-950/60 border-rose-500/80'
                        : isCompleted
                        ? 'bg-emerald-950/60 border-emerald-500/80'
                        : isInProgress
                        ? 'bg-indigo-950/60 border-indigo-500/80'
                        : 'bg-amber-950/60 border-amber-500/80'
                      : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
                  }`}
                  style={{ width: 54, height: 80 }}
                >
                  {work && (
                    <span className="text-[8px] font-black uppercase text-indigo-200 truncate w-full text-center mb-0.5">
                      {isMissing ? 'REPLACE' : (work.shade || work.work_type?.split(' ')[0])}
                    </span>
                  )}

                  {/* Solid Anatomical SVG Tooth Graphic */}
                  <div className="relative flex-1 flex items-center justify-center">
                    <svg width="34" height="42" viewBox="0 0 34 42" className="block">
                      {isMissing ? (
                        /* EDENTULOUS REPLACEMENT GRAPHIC */
                        <g>
                          <rect x="3" y="4" width="28" height="28" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3,3" rx="6" />
                          <line x1="6" y1="7" x2="28" y2="29" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1="28" y1="7" x2="6" y2="29" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
                        </g>
                      ) : (
                        /* SOLID PROSTHETIC TOOTH CROWN & ROOT */
                        <g>
                          {/* Lower Crown */}
                          <rect
                            x="4" y="4" width="26" height="24" rx="5"
                            fill={work ? (isCompleted ? '#059669' : isInProgress ? '#4f46e5' : '#d97706') : '#1e293b'}
                            stroke={isSelected ? '#a5b4fc' : work ? '#ffffff' : '#475569'}
                            strokeWidth="1.5"
                          />
                          {/* Lower Root */}
                          <path
                            d="M 11 28 C 11 39, 17 41, 17 41 C 17 41, 23 39, 23 28 Z"
                            fill={work ? (isCompleted ? '#10b981' : isInProgress ? '#6366f1' : '#f59e0b') : '#334155'}
                            stroke={work ? '#ffffff' : '#64748b'}
                            strokeWidth="1.2"
                          />
                        </g>
                      )}
                    </svg>

                    {/* Status Badge Tag */}
                    {work && (
                      <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center text-[8px] font-black ${
                        isMissing ? 'bg-rose-600 text-white' : isCompleted ? 'bg-emerald-500 text-white' : isInProgress ? 'bg-indigo-500 text-white animate-pulse' : 'bg-amber-500 text-slate-950'
                      }`}>
                        {isMissing ? 'M' : isCompleted ? '✓' : isInProgress ? 'P' : '!'}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-mono font-bold text-slate-300 mt-1">{num}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-right text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-800">
          MANDIBULAR (LOWER ARCH)
        </div>
      </div>

      {/* WORK EDITOR CONTROL CARD FOR SELECTED TOOTH */}
      <div className="bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 border border-indigo-100 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-mono font-black text-lg shadow-md shadow-indigo-500/20">
              #{selectedTooth}
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 m-0">
                FDI Tooth #{selectedTooth} Prosthetics &amp; Replacement Order
              </h4>
              <p className="text-xs text-slate-500 m-0 font-medium">
                {currentToothWork?.is_missing
                  ? `Declared Missing Tooth — Replacement strategy: ${currentToothWork.replacement_strategy}`
                  : currentToothWork
                  ? `Currently logged: ${currentToothWork.work_type}`
                  : 'No prosthetic work assigned yet to this tooth.'}
              </p>
            </div>
          </div>

          {currentToothWork && !readOnly && (
            <button
              type="button"
              onClick={() => handleRemoveToothWork(selectedTooth)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer self-start sm:self-center"
            >
              <Trash2 size={13} /> Remove Work
            </button>
          )}
        </div>

        {!readOnly && (
          <div className="space-y-4">
            
            {/* MISSING TOOTH DECLARATION TOGGLE */}
            <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={18} className="text-rose-600 shrink-0" />
                <div>
                  <span className="text-xs font-extrabold text-rose-900 block">Declare Edentulous Tooth (Missing to be Replaced)</span>
                  <span className="text-[11px] text-rose-700 font-medium block">
                    Mark tooth #{selectedTooth} as missing and specify replacement pontic, implant, or denture tooth.
                  </span>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-white px-3.5 py-1.5 rounded-xl border border-rose-200 shadow-xs shrink-0">
                <input
                  type="checkbox"
                  checked={!!currentToothWork?.is_missing}
                  onChange={(e) => handleToggleMissing(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-xs font-extrabold text-rose-800">
                  {currentToothWork?.is_missing ? 'Declared Missing' : 'Declare Missing'}
                </span>
              </label>
            </div>

            {/* FORM CONTROLS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Work Type / Replacement Type */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  {currentToothWork?.is_missing ? 'Replacement Strategy' : 'Prosthetic Work Type'}
                </label>
                {currentToothWork?.is_missing ? (
                  <select
                    value={currentToothWork?.replacement_strategy || 'Bridge Pontic (Suspended Unit)'}
                    onChange={(e) => handleUpdateTooth({ replacement_strategy: e.target.value })}
                    className="w-full text-xs font-bold border border-rose-300 rounded-xl px-3 py-2 bg-white text-rose-900 outline-none focus:border-rose-500"
                  >
                    {REPLACEMENT_STRATEGIES.map((rs) => (
                      <option key={rs} value={rs}>
                        {rs}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={currentToothWork?.work_type || 'Crown (Zirconia)'}
                    onChange={(e) => handleUpdateTooth({ work_type: e.target.value })}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 outline-none focus:border-indigo-500"
                  >
                    {PROSTHETIC_WORK_TYPES.map((wt) => (
                      <option key={wt.id} value={wt.id}>
                        {wt.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Manufacturing Status */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Manufacturing Status
                </label>
                <select
                  value={currentToothWork?.status || 'Planning'}
                  onChange={(e) => handleUpdateTooth({ status: e.target.value })}
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
                  value={currentToothWork?.shade || 'A2'}
                  onChange={(e) => handleUpdateTooth({ shade: e.target.value })}
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
                  value={currentToothWork?.notes || ''}
                  placeholder="e.g. Translucent Zirconia, Custom Post..."
                  onChange={(e) => handleUpdateTooth({ notes: e.target.value })}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* LOGGED UNITS LIST TABLE */}
        {Object.keys(toothMap).length > 0 && (
          <div className="pt-2">
            <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center justify-between">
              <span>Prosthetic &amp; Replacement Units ({Object.keys(toothMap).length} units)</span>
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
                  {Object.entries(toothMap).map(([toothNum, data]) => {
                    const st = WORK_STATUSES[data.status] || WORK_STATUSES['Planning'];
                    const isMissing = data.is_missing || data.work_type === 'Declared Missing (To Be Replaced)';
                    return (
                      <tr key={toothNum} className="hover:bg-slate-50/60">
                        <td className="px-3.5 py-2.5 font-mono font-black text-indigo-600">
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
                              onClick={() => handleRemoveToothWork(toothNum)}
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

    </div>
  );
}
