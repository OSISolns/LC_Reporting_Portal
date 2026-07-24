import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Stethoscope, ClipboardList, Calendar, CalendarClock, Heart,
  BookOpen, FlaskConical, Building2, Loader2, Lock, Wrench,
} from 'lucide-react';
import ConsumablesLog from '../ConsumablesLog';
import DentalCasesLog from './DentalCasesLog';
import ClinicCasesLog from './ClinicCasesLog';
import ProstheticsOdontogramWorkspace from './ProstheticsOdontogramWorkspace';
import { useAuth } from '../../context/AuthContext';

// Lazy-load the new clinic modules (code-split for performance)
const DentalWorklist     = lazy(() => import('./DentalWorklist'));
const DentalCharting     = lazy(() => import('./DentalCharting'));
const DentalAppointments = lazy(() => import('./DentalAppointments'));

// ─── Section definitions ──────────────────────────────────────────────────────
const SECTIONS = [
  {
    key: 'clinic',
    label: 'Dental Clinic',
    icon: Building2,
    description: 'Clinical workflow — patient queue, dental charting, and consumables.',
    allowedRoles: ['admin', 'deputy_coo', 'coo', 'medical_director', 'dental', 'dentist', 'dental_hod'],
    tabs: [
      { key: 'worklist',           icon: Calendar,      label: 'Patient Worklist'  },
      { key: 'appointments',       icon: CalendarClock, label: 'Appointments'      },
      { key: 'charting',           icon: Stethoscope,   label: 'Dental Charting'   },
      { key: 'clinic_cases',       icon: BookOpen,      label: 'Clinic Cases'      },
      { key: 'consumables_clinic', icon: ClipboardList, label: 'Consumables Log'   },
    ],
  },
  {
    key: 'lab',
    label: 'Dental Lab',
    icon: FlaskConical,
    description: 'Laboratory workflow — prosthetics cases, work orders, and lab consumables.',
    allowedRoles: ['admin', 'deputy_coo', 'coo', 'medical_director', 'dental_lab_manager', 'dental_tech', 'dental_lab', 'dental_hod'],
    tabs: [
      { key: 'cases',           icon: BookOpen,      label: 'Cases Log'       },
      { key: 'odontogram_lab',  icon: Wrench,        label: 'Prosthetics FDI Odontogram' },
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
const DEFAULT_TABS = { clinic: 'worklist', lab: 'cases' };

const DentalHub = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter sections visible to current user
  const visibleSections = SECTIONS.filter(s => !s.allowedRoles || s.allowedRoles.includes(user?.role));

  const isLabUser = ['dental_lab_manager', 'dental_tech', 'dental_lab'].includes(user?.role);

  // Deep-link support: `/dental?section=clinic&tab=appointments` lands directly on a tab only if authorized.
  const urlSection = searchParams.get('section');
  const urlTab = searchParams.get('tab');

  const initialSection = (urlSection && visibleSections.some(s => s.key === urlSection))
    ? urlSection
    : (visibleSections[0]?.key || (isLabUser ? 'lab' : 'clinic'));

  const [section, setSection] = useState(initialSection);
  const [activeTab, setActiveTab] = useState(() => {
    const sectionDef = visibleSections.find(s => s.key === initialSection) || visibleSections[0];
    if (urlTab && sectionDef?.tabs.some(t => t.key === urlTab)) {
      return { ...DEFAULT_TABS, [initialSection]: urlTab };
    }
    return DEFAULT_TABS;
  });

  const currentSection = visibleSections.find((s) => s.key === section) || visibleSections[0] || SECTIONS[0];
  const currentTab     = activeTab[currentSection.key];

  // Keep the URL in sync so it can always be shared/bookmarked/deep-linked back to.
  useEffect(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('section', currentSection.key);
      next.set('tab', currentTab);
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSection.key, currentTab]);

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

      {/* ── Section Switcher (Only shown if user has access to multiple sections) ── */}
      {visibleSections.length > 1 && (
        <div className="flex gap-2.5 mb-5">
          {visibleSections.map(({ key, label, icon: Icon, description }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`flex-1 max-w-xs flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-left transition-all ${
                section === key
                  ? 'border-rose-500 bg-rose-50/50 shadow-2xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  section === key ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Icon size={14} />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-black leading-none ${section === key ? 'text-rose-700' : 'text-slate-700'}`}>
                  {label}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-none truncate">
                  {description}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Sub-Tabs ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-5 overflow-x-auto">
        {currentSection.tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab((prev) => ({ ...prev, [section]: key }))}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 -mb-px transition-colors whitespace-nowrap ${
              currentTab === key
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <Suspense fallback={<TabLoader />}>
        {currentTab === 'worklist'           && <DentalWorklist />}
        {currentTab === 'appointments'       && <DentalAppointments />}
        {currentTab === 'charting'           && <DentalCharting />}
        {currentTab === 'clinic_cases'       && <ClinicCasesLog />}
        {currentTab === 'consumables_clinic' && <ConsumablesLog defaultDeptName="DENTAL CLINIC" />}
        {currentTab === 'cases'              && <DentalCasesLog />}
        {currentTab === 'odontogram_lab'     && <ProstheticsOdontogramWorkspace />}
        {currentTab === 'consumables_lab'    && <ConsumablesLog defaultDeptName="DENTAL LAB" />}
      </Suspense>
    </div>
  );
};

export default DentalHub;
