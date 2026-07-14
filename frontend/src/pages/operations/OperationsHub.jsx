import React, { useState } from 'react';
import { ClipboardList, Activity, Settings, Lock } from 'lucide-react';
import ConsumablesLog from '../ConsumablesLog';

const OperationsHub = () => {
  const [active, setActive] = useState('consumables');

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="text-blue-500" size={24} />
          <span className="text-blue-600 font-black">CORE</span> Operations Hub
        </h1>
        <p className="text-sm text-slate-500">Facility logistics, staff scheduling, and operations inventory logging.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActive('consumables')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            active === 'consumables' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList size={16} /> Consumables Log
        </button>

        <button
          onClick={() => setActive('rostering')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            active === 'rostering' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Activity size={16} /> Staff Roster Management <span className="ml-1 text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-black uppercase">Planning</span>
        </button>

        <button
          onClick={() => setActive('facility')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            active === 'facility' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Settings size={16} /> Facility Checklists <span className="ml-1 text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-black uppercase">Planning</span>
        </button>
      </div>

      {/* Tab content */}
      <div>
        {active === 'consumables' && <ConsumablesLog />}

        {active === 'rostering' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center max-w-2xl mx-auto my-8 space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-blue-500 border border-blue-100">
              <Lock size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800">Operations Staff Rostering</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Plan and coordinate shift rosters, staff swap approvals, and attendance reports across all Legacy Clinic branches.
            </p>
            <div className="grid grid-cols-2 gap-3 text-left pt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <h5 className="text-xs font-bold text-slate-700">Roster Builder</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Drag-and-drop calendar for planning medical/nursing staff schedules.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <h5 className="text-xs font-bold text-slate-700">Attendance Sync</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Connect shift logs with fingerprint/card attendance devices.</p>
              </div>
            </div>
          </div>
        )}

        {active === 'facility' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center max-w-2xl mx-auto my-8 space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-blue-500 border border-blue-100">
              <Lock size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800">Facility Operations</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Standardized checklists for operations staff, branch inspections, cleaning schedules, and maintenance requests.
            </p>
            <div className="grid grid-cols-2 gap-3 text-left pt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <h5 className="text-xs font-bold text-slate-700">Audit Logs</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Track safety checklists completed by facility managers.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <h5 className="text-xs font-bold text-slate-700">Maintenance Tickets</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Direct link to IT/Facilities helpdesk for repairs.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OperationsHub;
