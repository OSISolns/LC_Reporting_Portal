import React, { useState } from 'react';
import { ClipboardList, Activity, Dumbbell, Lock } from 'lucide-react';
import ConsumablesLog from '../ConsumablesLog';

const PhysioHub = () => {
  const [active, setActive] = useState('consumables');

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Dumbbell className="text-emerald-500" size={24} />
          <span className="text-emerald-600 font-black">KINETIC</span> Physio Hub
        </h1>
        <p className="text-sm text-slate-500">Physical rehabilitation schedules, patient assessments, and inventory logs.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActive('consumables')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            active === 'consumables' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList size={16} /> Consumables Log
        </button>

        <button
          onClick={() => setActive('rehab')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            active === 'rehab' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Dumbbell size={16} /> Rehabilitation Worklist <span className="ml-1 text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-black uppercase">Planning</span>
        </button>

        <button
          onClick={() => setActive('assessments')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            active === 'assessments' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Activity size={16} /> Patient Assessments <span className="ml-1 text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-black uppercase">Planning</span>
        </button>
      </div>

      {/* Tab content */}
      <div>
        {active === 'consumables' && <ConsumablesLog />}

        {active === 'rehab' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center max-w-2xl mx-auto my-8 space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-500 border border-emerald-100">
              <Lock size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800">Rehabilitation & Exercises</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Under development. This dashboard will track patient exercise programs, recovery progress milestones, and daily session schedules for physiotherapy.
            </p>
            <div className="grid grid-cols-2 gap-3 text-left pt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <h5 className="text-xs font-bold text-slate-700">Exercise Builder</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Customize physical recovery programs with video attachments.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <h5 className="text-xs font-bold text-slate-700">Progress Charts</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Track range of motion and pain score metrics over sessions.</p>
              </div>
            </div>
          </div>
        )}

        {active === 'assessments' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center max-w-2xl mx-auto my-8 space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-500 border border-emerald-100">
              <Lock size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800">Physio Assessments</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Standardized initial diagnostic forms, muscle testing indices, and joint mobility checks.
            </p>
            <div className="grid grid-cols-2 gap-3 text-left pt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <h5 className="text-xs font-bold text-slate-700">Initial Assessment</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Guided questionnaire logging primary complaints and history.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <h5 className="text-xs font-bold text-slate-700">Goniometer Logs</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Log anatomical joint flexibility degrees and progress.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhysioHub;
