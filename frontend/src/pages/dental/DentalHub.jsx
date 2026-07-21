import React, { useState, Suspense, lazy } from 'react';
import {
  Stethoscope, ClipboardList, Calendar, Heart,
  BookOpen, FlaskConical, Building2, Loader2,
} from 'lucide-react';
import ConsumablesLog from '../ConsumablesLog';
import DentalCasesLog from './DentalCasesLog';

// Lazy-load the new clinic modules (code-split for performance)
const DentalWorklist  = lazy(() => import('./DentalWorklist'));
const DentalCharting  = lazy(() => import('./DentalCharting'));

// ─── Section definitions ──────────────────────────────────────────────────────
const SECTIONS = [
  {
    key: 'clinic',
    label: 'Dental Clinic',
    icon: Building2,
    description: 'Clinical workflow — patient queue, dental charting, and consumables.',
    tabs: [
      { key: 'worklist',           icon: Calendar,      label: 'Patient Worklist'  },
      { key: 'charting',           icon: Stethoscope,   label: 'Dental Charting'   },
      { key: 'consumables_clinic', icon: ClipboardList, label: 'Consumables Log'   },
    ],
  },
  {
    key: 'lab',
    label: 'Dental Lab',
    icon: FlaskConical,
    description: 'Laboratory workflow — prosthetics cases, work orders, and lab consumables.',
    tabs: [
      { key: 'cases',           icon: BookOpen,      label: 'Cases Log'       },
      { key: 'consumables_lab', icon: ClipboardList, label: 'Consumables Log' },
    ],
  },
];

// ─── Suspense fallback ────────────────────────────────────────────────────────
const TabLoader = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 size={28} className="text-rose-400 animate-spin" />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const DentalHub = () => {
  const [section, setSection]   = useState('clinic');
  const [activeTab, setActiveTab] = useState({ clinic: 'worklist', lab: 'cases' });

  const currentSection = SECTIONS.find((s) => s.key === section);
  const currentTab     = activeTab[section];

  return (
    <div className="p-6">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Heart className="text-rose-500" size={24} />
          Dental Hub
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Odontology records, prosthetics lab workflow, and clinical management.
        </p>
      </div>

      {/* ── Section Switcher ─────────────────────────────────────────────── */}
      <div className="flex items-stretch gap-3 mb-6">
        {SECTIONS.map(({ key, label, icon: Icon, description }) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={`flex-1 flex items-center gap-3 px-5 py-4 rounded-2xl border-2 text-left transition-all ${
              section === key
                ? 'border-rose-500 bg-rose-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                section === key ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-black leading-tight ${section === key ? 'text-rose-700' : 'text-slate-700'}`}>
                {label}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-1">
                {description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Sub-Tabs ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {currentSection.tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab((prev) => ({ ...prev, [section]: key }))}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
              currentTab === key
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <Suspense fallback={<TabLoader />}>
        {currentTab === 'worklist'           && <DentalWorklist />}
        {currentTab === 'charting'           && <DentalCharting />}
        {currentTab === 'consumables_clinic' && <ConsumablesLog />}
        {currentTab === 'cases'              && <DentalCasesLog />}
        {currentTab === 'consumables_lab'    && <ConsumablesLog />}
      </Suspense>
    </div>
  );
};

export default DentalHub;
