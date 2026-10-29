import React from 'react';
import { Database } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ImagingArchiveHub from './ImagingArchiveHub';

export default function PacsArchivesPage() {
  const { user } = useAuth();

  return (
    <div className="p-4 sm:p-6 lg:p-7 space-y-6">
      {/* ── Lumina Page Header ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1.5">
            <Database size={13} className="text-[#1C69A0]" />
            PACS &amp; Diagnostic Vault
          </span>
          <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            Duty: {user?.role ? user.role.replace(/_/g, ' ').toUpperCase() : 'Imaging Specialist'}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
          PACS and Archives
        </h1>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Hospital PACS diagnostic storage vault, patient studies archive, and classified radiological multi-modality data (CT, MRI, OPG, X-Ray, Mammography, Ultrasound, CBCT, &amp; Cephalogram).
        </p>
      </div>

      {/* ── Standalone PACS and Archives Vault Component ── */}
      <ImagingArchiveHub />
    </div>
  );
}
