import React, { useMemo, useState } from 'react';
import { LayoutGrid, ClipboardList, MonitorPlay, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ImagingDailyBoard from './ImagingDailyBoard';
import ImagingWorklist from './ImagingWorklist';
import ModalityConsole from './ModalityConsole';
import ImagingReporting from './ImagingReporting';

// Tab definitions gated by the imaging permission action they require.
const TABS = [
  { key: 'board',     label: 'Daily Exam Log', icon: LayoutGrid,   perm: 'view',    Component: ImagingDailyBoard },
  { key: 'worklist',  label: 'Worklist',       icon: ClipboardList, perm: 'create', Component: ImagingWorklist },
  { key: 'console',   label: 'Console',        icon: MonitorPlay,   perm: 'acquire', Component: ModalityConsole },
  { key: 'reporting', label: 'Reporting',      icon: FileText,      perm: 'report',  Component: ImagingReporting },
];

const ImagingHub = () => {
  const { user, hasPermission } = useAuth();

  const available = useMemo(
    () => TABS.filter((t) => t.perm === 'view' || hasPermission('imaging', t.perm)),
    // hasPermission is stable per user; recompute when role changes
    [user?.role]
  );

  // Role-aware default landing tab.
  const defaultTab = useMemo(() => {
    if (user?.role === 'radiologist' && available.some((t) => t.key === 'reporting')) return 'reporting';
    if (['radiographer', 'sonographer'].includes(user?.role) && available.some((t) => t.key === 'console')) return 'console';
    if (user?.role === 'imaging_receptionist' && available.some((t) => t.key === 'worklist')) return 'worklist';
    return available[0]?.key || 'board';
  }, [user?.role, available]);

  const [active, setActive] = useState(defaultTab);
  const ActiveComponent = (available.find((t) => t.key === active) || available[0])?.Component || ImagingDailyBoard;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <span className="text-indigo-600">LUMINA</span> Imaging Hub
        </h1>
        <p className="text-sm text-slate-500">Radiology worklist, acquisition and daily exam logging.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
        {available.map((t) => {
          const Icon = t.icon;
          const on = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                on ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      <ActiveComponent />
    </div>
  );
};

export default ImagingHub;
