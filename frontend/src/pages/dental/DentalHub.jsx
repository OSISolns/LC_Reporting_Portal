import React, { useState } from 'react';
import { Stethoscope, ClipboardList, Calendar, Heart, Lock } from 'lucide-react';
import ConsumablesLog from '../ConsumablesLog';

const DentalHub = () => {
  const [active, setActive] = useState('consumables');

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Heart className="text-rose-500" size={24} />
          <span className="text-rose-600 font-black">ORALIS</span> Dental Hub
        </h1>
        <p className="text-sm text-slate-500">Odontology records, prosthetics lab workflow, and consumables log.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActive('consumables')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            active === 'consumables' ? 'border-rose-500 text-rose-500' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList size={16} /> Consumables Log
        </button>

        <button
          onClick={() => setActive('charting')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            active === 'charting' ? 'border-rose-500 text-rose-500' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Stethoscope size={16} /> Dental Charting <span className="ml-1 text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-black uppercase">Planning</span>
        </button>

        <button
          onClick={() => setActive('appointments')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            active === 'appointments' ? 'border-rose-500 text-rose-500' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar size={16} /> Patient Worklist <span className="ml-1 text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-black uppercase">Planning</span>
        </button>
      </div>

      {/* Tab content */}
      <div>
        {active === 'consumables' && <ConsumablesLog />}

        {active === 'charting' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center max-w-2xl mx-auto my-8 space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-500 border border-rose-100">
              <Lock size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800">Odontogram & Charting</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Under development. This dashboard will provide an interactive 3D/2D Odontogram for mapping decay, restorations, extractions, periodontal pockets, and treatment progress plans.
            </p>
            <div className="grid grid-cols-2 gap-3 text-left pt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <h5 className="text-xs font-bold text-slate-700">Universal Tooth Numbering</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Supports both ISO/FDI and Universal numbering conventions.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <h5 className="text-xs font-bold text-slate-700">Periodontal Charts</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Six-point probing depth logging and bleeding indices tracking.</p>
              </div>
            </div>
          </div>
        )}

        {active === 'appointments' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center max-w-2xl mx-auto my-8 space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-500 border border-rose-100">
              <Lock size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800">Dental Patient Worklist</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              A dedicated queue for dental appointments, check-ins, treatment consent sheets, and pre-medication checklist reminders.
            </p>
            <div className="grid grid-cols-2 gap-3 text-left pt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <h5 className="text-xs font-bold text-slate-700">Queue Manager</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Real-time status: Waiting, In Chair, Post-op, or Discharged.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <h5 className="text-xs font-bold text-slate-700">Consent Forms</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Digital signatures for complex surgical extractions or implants.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DentalHub;
