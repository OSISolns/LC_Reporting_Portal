import React, { useMemo, useState } from 'react';
import { FlaskConical, ClipboardList, Activity, FileSpreadsheet, Lock } from 'lucide-react';
import ConsumablesLog from '../ConsumablesLog';

const LabHub = () => {
  const [active, setActive] = useState('consumables');

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FlaskConical className="text-teal-600" size={24} />
          <span className="text-teal-700 font-black">SYNAPSE</span> Laboratory Hub
        </h1>
        <p className="text-sm text-slate-500">Specimen diagnostics, analysis worklist, and department inventory.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActive('consumables')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            active === 'consumables' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList size={16} /> Consumables Log
        </button>

        <button
          onClick={() => setActive('specimen')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            active === 'specimen' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Activity size={16} /> Specimen Tracking <span className="ml-1 text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-black uppercase">Planning</span>
        </button>

        <button
          onClick={() => setActive('analyzers')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            active === 'analyzers' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FlaskConical size={16} /> Analyzer Integration <span className="ml-1 text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-black uppercase">Planning</span>
        </button>
      </div>

      {/* Tab content */}
      <div>
        {active === 'consumables' && <ConsumablesLog />}

        {active === 'specimen' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center max-w-2xl mx-auto my-8 space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto text-teal-600 border border-teal-100">
              <Lock size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800">Specimen Tracking Workspace</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              This module is currently in **Planning & Design**. It will support barcode scanning for blood/tissue specimens, check-in validation, and live tracking of sample lifecycle from collection to disposal.
            </p>
            <div className="grid grid-cols-2 gap-3 text-left pt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <h5 className="text-xs font-bold text-slate-700">Barcode Check-in</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Quick scanning and verification of patient sample IDs.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <h5 className="text-xs font-bold text-slate-700">Audit History</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Chain of custody logging for compliance and safety.</p>
              </div>
            </div>
          </div>
        )}

        {active === 'analyzers' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center max-w-2xl mx-auto my-8 space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto text-teal-600 border border-teal-100">
              <Lock size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800">HL7 Analyzer Integration</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Integrate directly with laboratory hardware (Hematology, Biochemistry analyzers) via HL7 protocols. Automated results ingestion and verification.
            </p>
            <div className="grid grid-cols-2 gap-3 text-left pt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <h5 className="text-xs font-bold text-slate-700">Direct Ingestion</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Pull numerical assays directly from Roche/Sysmex hardware.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <h5 className="text-xs font-bold text-slate-700">Alert Limits</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Auto-flag critical panic values to consulting doctors.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabHub;
