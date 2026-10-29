import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, ClipboardList, MonitorPlay, FileText, Archive, Share2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ImagingDailyBoard from './ImagingDailyBoard';
import ImagingWorklist from './ImagingWorklist';
import ModalityConsole from './ModalityConsole';
import ImagingReporting from './ImagingReporting';
import ImagingArchiveHub from './ImagingArchiveHub';
import ImagingProviderShares from './ImagingProviderShares';

// Tab definitions gated by the imaging permission action they require.
const TABS = [
  { key: 'board',       label: 'Daily Exam Log',              icon: LayoutGrid,    perm: 'view',    Component: ImagingDailyBoard },
  { key: 'worklist',    label: 'Worklist',                    icon: ClipboardList, perm: 'create',  Component: ImagingWorklist },
  { key: 'archive',     label: 'PACS and Archives',           icon: Archive,       perm: 'view',    Component: ImagingArchiveHub },
  { key: 'shares',      label: 'Shared with Providers',       icon: Share2,        perm: 'view',    Component: ImagingProviderShares },
  { key: 'console',     label: 'Console',                     icon: MonitorPlay,   perm: 'acquire', Component: ModalityConsole },
  { key: 'reporting',   label: 'Reporting',                   icon: FileText,      perm: 'report',  Component: ImagingReporting },
];

const ImagingHub = () => {
  const { user, hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get('tab');
  const queryToken = searchParams.get('token');

  const available = useMemo(
    () => TABS.filter((t) => t.perm === 'view' || hasPermission('imaging', t.perm)),
    // hasPermission is stable per user; recompute when role changes
    [user?.role]
  );

  // Role-aware default landing tab. Requesting providers land directly on 'shares'.
  const defaultTab = useMemo(() => {
    if (queryTab && available.some((t) => t.key === queryTab)) return queryTab;
    if (['doctor', 'consultant', 'dentist', 'dental_hod'].includes(user?.role)) return 'shares';
    if (user?.role === 'imaging_tech' && available.some((t) => t.key === 'console')) return 'console';
    return available[0]?.key || 'board';
  }, [user?.role, available, queryTab]);

  const [active, setActive] = useState(defaultTab);

  useEffect(() => {
    if (queryTab && available.some((t) => t.key === queryTab)) {
      setActive(queryTab);
    }
  }, [queryTab, available]);

  const ActiveComponent = (available.find((t) => t.key === active) || available[0])?.Component || ImagingDailyBoard;

  return (
    <div className="p-6">
      <div className="mb-6 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            Radiology &amp; Medical Imaging Hub
          </span>
          <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            Duty: {user?.role ? user.role.replace(/_/g, ' ').toUpperCase() : 'Imaging Specialist'}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
          {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}, {user?.fullName?.split(' ')[0] || user?.fullName || 'Colleague'} 👋
        </h1>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Radiology worklist, diagnostic storage vault, and provider sharing for CT, MRI, OPG, X-Ray, Mammography, Ultrasound, CBCT, &amp; Cephalogram.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {available.map((t) => {
          const Icon = t.icon;
          const on = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                on ? 'border-[#1C69A0] text-[#1C69A0]' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {ActiveComponent === ImagingProviderShares ? (
        <ImagingProviderShares initialToken={queryToken} />
      ) : (
        <ActiveComponent />
      )}
    </div>
  );
};

export default ImagingHub;
