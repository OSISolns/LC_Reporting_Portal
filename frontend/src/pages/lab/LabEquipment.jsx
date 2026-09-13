import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wrench, Plus, Search, RefreshCw, Filter, Download, Pencil, Trash2, X,
  CheckCircle, AlertTriangle, Clock, ShieldAlert, ShieldCheck, Building,
  Layers, Calendar, ChevronRight, FileSpreadsheet, Eye, Tag, MapPin, Activity,
  FlaskConical, Settings, FolderArchive, BarChart2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { getEquipment, createEquipment, updateEquipment, deleteEquipment } from '../../api/lab';

// ── FALLBACK 2026 PPM DATASET ──────────────────────────────────────────────────
const FALLBACK_EQUIPMENT = [
  { id: 1, sn: 1, name: 'WATER BATH', model: 'SISCO', serial_number: '74093', manufacturer: 'YORK Scientific', asset_code: 'LEG/PATHLAB/EQP-39', criticicity_factor: 'Non-Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'YORK Scientific', status: 'Operational', location_room: 'Main Lab' },
  { id: 2, sn: 2, name: 'Microscope', model: 'CH20iBIMF', serial_number: '15H0132', manufacturer: 'OLYMPUS', asset_code: 'LEG/PATHLAB/EQP-293', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'OLYMPUS', status: 'Operational', location_room: 'Microbiology' },
  { id: 3, sn: 3, name: 'Microscope', model: 'CH20iBIMF', serial_number: '15H0624', manufacturer: 'OLYMPUS', asset_code: 'LEG/PATHLAB/EQP-297', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'OLYMPUS', status: 'Operational', location_room: 'Hematology' },
  { id: 4, sn: 4, name: 'Microscope', model: 'CH20iBIMF', serial_number: '15H0158', manufacturer: 'OLYMPUS', asset_code: 'LEG/PATHLAB/EQP-298', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'OLYMPUS', status: 'Operational', location_room: 'Parasitology' },
  { id: 5, sn: 5, name: 'Autoclave 1', model: 'YSI-403EX', serial_number: '15L2608', manufacturer: 'YORK Scientific', asset_code: 'LEG/PATHLAB/EQP-38', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'YORK Scientific', status: 'Operational', location_room: 'Sterilization Room' },
  { id: 6, sn: 6, name: 'Autoclave 2', model: 'YSI-402EX', serial_number: '15L2611', manufacturer: 'YORK Scientific', asset_code: 'LEG/PATHLAB/EQP-38', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'YORK Scientific', status: 'Operational', location_room: 'Sterilization Room' },
  { id: 7, sn: 7, name: 'Centrifuge 2', model: 'R-8CBL', serial_number: 'ZBJN-29049', manufacturer: 'REMI', asset_code: 'LEG/PATHLAB/EQP-26', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'REMI', status: 'Operational', location_room: 'Main Lab' },
  { id: 8, sn: 8, name: 'Centrifuge', model: 'R-8CBL', serial_number: 'ZLKN37815', manufacturer: 'REMI', asset_code: 'LEG/PATHLAB/EQP-27', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'REMI', status: 'Operational', location_room: 'Main Lab' },
  { id: 9, sn: 9, name: 'Centrifuge 3', model: 'R-8CBL', serial_number: 'ZBJN-29048', manufacturer: 'REMI', asset_code: 'LEG/PATHLAB/EQP-319', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'REMI', status: 'Operational', location_room: 'Biochemistry' },
  { id: 10, sn: 10, name: 'Biochemical analyser', model: 'COBAS e411', serial_number: '16J1-01', manufacturer: 'Roche HITACHI', asset_code: 'LEG/PATHLAB/EQP-08', criticicity_factor: 'Critical', pm_date_1: 'MEDISELL', pm_date_2: 'MEDISELL', pm_date_3: 'MEDISELL', pm_date_4: 'MEDISELL', service_provider: 'MEDISELL', status: 'Operational', location_room: 'Biochemistry' },
  { id: 11, sn: 11, name: 'BIO RAD Reader', model: 'PR4100', serial_number: '1509007506', manufacturer: 'BIO_RAD', asset_code: 'LEG/PATHLAB/EQP-24', criticicity_factor: 'Non-Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'BIO_RAD', status: 'Operational', location_room: 'Serology' },
  { id: 12, sn: 19, name: 'Biochemistry Analyser', model: 'Cobas e311', serial_number: '17H9-02', manufacturer: 'Roche HITACHI', asset_code: 'LEG/PATHLAB/EQP-07', criticicity_factor: 'Critical', pm_date_1: 'MEDISELL', pm_date_2: 'MEDISELL', pm_date_3: 'MEDISELL', pm_date_4: 'MEDISELL', service_provider: 'MEDISELL', status: 'Operational', location_room: 'Biochemistry' },
  { id: 13, sn: 20, name: 'Reverse Osmosis (RO)', model: 'EVOQUA', serial_number: '311091570786-05', manufacturer: 'Evoqua', asset_code: 'LEG/PATHLAB/EQP-17', criticicity_factor: 'Non-Critical', pm_date_1: 'MEDISELL', pm_date_2: 'MEDISELL', pm_date_3: 'MEDISELL', pm_date_4: 'MEDISELL', service_provider: 'MEDISELL', status: 'Operational', location_room: 'Water Plant' },
  { id: 14, sn: 21, name: 'Rotator', model: 'RS-12R', serial_number: 'ZBJS-28859', manufacturer: 'REMI', asset_code: 'LEG/PATHLAB/EQP-23', criticicity_factor: 'Non-Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'REMI', status: 'Operational', location_room: 'Serology' },
  { id: 15, sn: 22, name: 'Incubator', model: 'BTI-25FR', serial_number: '74093', manufacturer: 'BIOTECHNICS', asset_code: 'LEG/PATHLAB/EQP-36', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'BIOTECHNICS', status: 'Operational', location_room: 'Microbiology' },
  { id: 16, sn: 23, name: 'Blood Analyzer', model: 'XS-500i', serial_number: '18477', manufacturer: 'Sysmex', asset_code: 'LEG/PATHLAB/EQP-05', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'Sysmex', status: 'Operational', location_room: 'Hematology' },
  { id: 17, sn: 24, name: 'Urine analyser', model: 'BC5300', serial_number: '1009-03-61', manufacturer: 'Mindray', asset_code: 'LEG/PATHLAB/EQP-319', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'Mindray', status: 'Operational', location_room: 'Urinalysis' },
  { id: 18, sn: 25, name: 'Microscope', model: 'CX23LEDFS1', serial_number: '7G88103', manufacturer: 'OLYMPUS', asset_code: 'LEG/PATHLAB/EQP-296', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'OLYMPUS', status: 'Operational', location_room: 'Microbiology' },
  { id: 19, sn: 26, name: 'Incubator', model: 'BTI-25', serial_number: '74094', manufacturer: 'BIOTECHNICS', asset_code: 'LEG/PATHLAB/EQP-35', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'BIOTECHNICS', status: 'Operational', location_room: 'Microbiology' },
  { id: 20, sn: 27, name: 'Hot Air Oven', model: 'BTI-25', serial_number: '74455', manufacturer: 'BIOTECHNICS', asset_code: 'LEG/PATHLAB/EQP-32', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'BIOTECHNICS', status: 'Operational', location_room: 'Sterilization Room' },
  { id: 21, sn: 28, name: 'Electronic scale', model: 'Standard', serial_number: '110953', manufacturer: 'Precision', asset_code: 'LEG/PATHLAB/EQP-321', criticicity_factor: 'Non-Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'In-House', status: 'Operational', location_room: 'Main Lab' },
  { id: 22, sn: 29, name: 'Electronic scale', model: 'Standard', serial_number: 'SCALE-0029', manufacturer: 'Precision', asset_code: 'LEG/PATHLAB/EQP-322', criticicity_factor: 'Non-Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'In-House', status: 'Operational', location_room: 'Main Lab' },
  { id: 23, sn: 30, name: 'Centrifuge', model: 'R-8CBL', serial_number: 'ZBJN-29041', manufacturer: 'REMI', asset_code: 'LEG/PATHLAB/EQP-25', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'REMI', status: 'Operational', location_room: 'Main Lab' },
  { id: 24, sn: 31, name: 'Biosafety Cabinet', model: 'CLASS II A2', serial_number: 'BSC-II-A2', manufacturer: 'Laminar Flow Systems', asset_code: 'LEG/PATHLAB/EQP-34', criticicity_factor: 'Critical', pm_date_1: 'Eng. Ronald Rudakubana', pm_date_2: 'Eng. Ronald Rudakubana', pm_date_3: 'Eng. Ronald Rudakubana', pm_date_4: 'Eng. Ronald Rudakubana', service_provider: 'Eng. Ronald Rudakubana', status: 'Operational', location_room: 'Safety Bay' },
  { id: 25, sn: 32, name: 'Biosafety Cabinet', model: 'CLASS I', serial_number: 'BSC-I-01', manufacturer: 'Laminar Flow Systems', asset_code: 'LEG/PATHLAB/EQP-33', criticicity_factor: 'Critical', pm_date_1: 'Eng. Ronald Rudakubana', pm_date_2: 'Eng. Ronald Rudakubana', pm_date_3: 'Eng. Ronald Rudakubana', pm_date_4: 'Eng. Ronald Rudakubana', service_provider: 'Eng. Ronald Rudakubana', status: 'Operational', location_room: 'Safety Bay' },
  { id: 26, sn: 33, name: 'Blood Mixer', model: 'BM-200', serial_number: 'BM-2026-33', manufacturer: 'Lab Line', asset_code: 'LEG/PATHLAB/EQP-348', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'Lab Line', status: 'Operational', location_room: 'Hematology' },
  { id: 27, sn: 34, name: 'Microscope', model: 'CX23LEDFS1', serial_number: '8D86810', manufacturer: 'OLYMPUS', asset_code: 'LEG/PATHLAB/EQP-294', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'OLYMPUS', status: 'Operational', location_room: 'Microbiology' },
  { id: 28, sn: 35, name: 'Microscope', model: 'CX23LEDFS1', serial_number: '8D8679', manufacturer: 'OLYMPUS', asset_code: 'LEG/PATHLAB/EQP-295', criticicity_factor: 'Critical', pm_date_1: 'Feb/02/2026', pm_date_2: 'May/19/2026', pm_date_3: 'Aug/19/2026', pm_date_4: 'Nov/19/2026', service_provider: 'OLYMPUS', status: 'Operational', location_room: 'Parasitology' },
];

const EMPTY_FORM = {
  name: '',
  model: '',
  serial_number: '',
  manufacturer: '',
  asset_code: '',
  criticicity_factor: 'Critical',
  pm_date_1: 'Feb/02/2026',
  pm_date_2: 'May/19/2026',
  pm_date_3: 'Aug/19/2026',
  pm_date_4: 'Nov/19/2026',
  service_provider: '',
  department: 'Laboratory',
  location_room: 'Main Lab',
  status: 'Operational',
  notes: ''
};

// ── Equipment Form Modal ───────────────────────────────────────────────────────
function EquipmentModal({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Equipment name is required.');
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Wrench size={18} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                {initial?.id ? 'Edit Equipment & Maintenance' : 'Add Medical Equipment'}
              </h2>
              <p className="text-xs text-slate-500">Asset Tracking & Preventive Maintenance Schedule</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-all cursor-pointer text-slate-400 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Row 1: Name & Asset Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Equipment Name *</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                placeholder="e.g. Biochemical analyser"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Asset Code</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                placeholder="e.g. LEG/PATHLAB/EQP-08"
                value={form.asset_code}
                onChange={e => set('asset_code', e.target.value)}
              />
            </div>
          </div>

          {/* Row 2: Model & Serial Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Model</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                placeholder="e.g. COBAS e411"
                value={form.model}
                onChange={e => set('model', e.target.value)}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Serial Number</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                placeholder="e.g. 16J1-01"
                value={form.serial_number}
                onChange={e => set('serial_number', e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: Manufacturer & Service Provider */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Manufacturer</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                placeholder="e.g. Roche HITACHI / OLYMPUS"
                value={form.manufacturer}
                onChange={e => set('manufacturer', e.target.value)}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Service Provider / Vendor</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                placeholder="e.g. MEDISELL / Eng. Ronald Rudakubana"
                value={form.service_provider}
                onChange={e => set('service_provider', e.target.value)}
              />
            </div>
          </div>

          {/* Row 4: Criticality & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Criticicity Factor</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                value={form.criticicity_factor}
                onChange={e => set('criticicity_factor', e.target.value)}
              >
                <option value="Critical">Critical</option>
                <option value="Non-Critical">Non-Critical</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Operational Status</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                value={form.status}
                onChange={e => set('status', e.target.value)}
              >
                <option value="Operational">Operational</option>
                <option value="Maintenance Due">Maintenance Due</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Out of Service">Out of Service</option>
              </select>
            </div>
          </div>

          {/* Planned Maintenance Dates (4 Quarters) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block flex items-center gap-1.5">
              <Calendar size={14} className="text-emerald-600" />
              2026 Planned Preventive Maintenance (PPM) Schedule
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">1st PM (Q1 Feb)</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 bg-white"
                  value={form.pm_date_1}
                  onChange={e => set('pm_date_1', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">2nd PM (Q2 May)</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 bg-white"
                  value={form.pm_date_2}
                  onChange={e => set('pm_date_2', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">3rd PM (Q3 Aug)</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 bg-white"
                  value={form.pm_date_3}
                  onChange={e => set('pm_date_3', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">4th PM (Q4 Nov)</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 bg-white"
                  value={form.pm_date_4}
                  onChange={e => set('pm_date_4', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Notes & Maintenance Details</label>
            <textarea
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              placeholder="Add technical comments or calibration history..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Wrench size={14} />}
              {initial?.id ? 'Save Changes' : 'Register Equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── MAIN LAB EQUIPMENT COMPONENT ───────────────────────────────────────────────
export default function LabEquipment() {
  const navigate = useNavigate();

  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [criticicityFilter, setCriticicityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' (PPM Schedule Grid) or 'table' (Details)

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch Equipment
  const fetchEquipmentList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEquipment();
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setEquipmentList(res.data.data);
      } else {
        setEquipmentList(FALLBACK_EQUIPMENT);
      }
    } catch (err) {
      console.warn('Backend API unavailable, using fallback 2026 PPM dataset:', err);
      setEquipmentList(FALLBACK_EQUIPMENT);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipmentList();
  }, [fetchEquipmentList]);

  // Handle Create/Update
  const handleSaveEquipment = async (formData) => {
    setSaving(true);
    try {
      if (editingItem?.id) {
        await updateEquipment(editingItem.id, formData);
        toast.success('Equipment record updated.');
      } else {
        await createEquipment(formData);
        toast.success('Equipment registered.');
      }
      setShowModal(false);
      setEditingItem(null);
      fetchEquipmentList();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save equipment record.');
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from equipment registry?`)) return;
    try {
      await deleteEquipment(id);
      toast.success('Equipment removed.');
      fetchEquipmentList();
    } catch {
      toast.error('Failed to delete equipment.');
    }
  };

  // Filtered Equipment List
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.model?.toLowerCase().includes(q) ||
        item.serial_number?.toLowerCase().includes(q) ||
        item.asset_code?.toLowerCase().includes(q) ||
        item.manufacturer?.toLowerCase().includes(q) ||
        item.service_provider?.toLowerCase().includes(q);

      const matchesCriticicity =
        criticicityFilter === 'all' ||
        item.criticicity_factor?.toLowerCase() === criticicityFilter.toLowerCase();

      const matchesStatus =
        statusFilter === 'all' ||
        item.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesQuery && matchesCriticicity && matchesStatus;
    });
  }, [equipmentList, searchQuery, criticicityFilter, statusFilter]);

  // Metrics
  const stats = useMemo(() => {
    const total = equipmentList.length;
    const critical = equipmentList.filter((i) => i.criticicity_factor === 'Critical').length;
    const nonCritical = total - critical;
    const vendorServiced = equipmentList.filter(
      (i) => i.pm_date_1 === 'MEDISELL' || i.pm_date_1?.includes('Eng.')
    ).length;
    return { total, critical, nonCritical, vendorServiced };
  }, [equipmentList]);

  // Export Excel Spreadsheet
  const handleExportExcel = () => {
    try {
      const exportRows = filteredEquipment.map((eq) => ({
        'SN': eq.sn || eq.id,
        'Name of Equipment': eq.name,
        'Model': eq.model || '',
        'Serial Number': eq.serial_number || '',
        'Manufacturer': eq.manufacturer || '',
        'Asset Code': eq.asset_code || '',
        'Criticicity Factor': eq.criticicity_factor || 'Critical',
        '1st PM Date (Q1 Feb)': eq.pm_date_1 || '',
        '2nd PM Date (Q2 May)': eq.pm_date_2 || '',
        '3rd PM Date (Q3 Aug)': eq.pm_date_3 || '',
        '4th PM Date (Q4 Nov)': eq.pm_date_4 || '',
        'Service Provider / Vendor': eq.service_provider || '',
        'Status': eq.status || 'Operational',
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '2026 PPM Equipment');
      XLSX.writeFile(wb, `Laboratory_2026_Equipment_PPM_Schedule.xlsx`);
      toast.success('PPM Equipment schedule exported to Excel!');
    } catch (err) {
      console.error('Excel Export Error:', err);
      toast.error('Failed to export Excel spreadsheet.');
    }
  };

  const getVendorBadgeClass = (val) => {
    if (!val) return 'bg-slate-100 text-slate-600 border-slate-200';
    if (val === 'MEDISELL') return 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
    if (val.includes('Eng.')) return 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-900 antialiased">
      {/* ── SUB-MODULE TOP NAVIGATION BAR ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 scrollbar-none">
        <button
          onClick={() => navigate('/lab')}
          className="px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-white/60"
        >
          <FlaskConical size={14} /> Specimens & Diagnostics
        </button>
        <button
          onClick={() => navigate('/lab/equipment')}
          className="px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer bg-white text-emerald-700 shadow-xs border border-slate-200/60"
        >
          <Wrench size={14} className="text-emerald-600" /> Equipment & PPM
        </button>
        <button
          onClick={() => navigate('/lab/analyzers')}
          className="px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-white/60"
        >
          <Settings size={14} /> Analyzers & QC
        </button>
        <button
          onClick={() => navigate('/lab/archive')}
          className="px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-white/60"
        >
          <FolderArchive size={14} /> Document Archive
        </button>
        <button
          onClick={() => navigate('/lab-manager')}
          className="px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-white/60 ml-auto"
        >
          <BarChart2 size={14} /> Manager Dashboard
        </button>
      </div>

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wrench className="text-emerald-600" size={22} /> Laboratory Equipment & PPM Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-normal">
            2026 Planned Preventive Maintenance (PPM) & Asset Registry
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet size={15} /> Export Schedule (.xlsx)
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} /> Add Equipment
          </button>
          <button
            onClick={fetchEquipmentList}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
            title="Refresh List"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── METRICS DASHBOARD ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Medical Equipment</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{stats.total} Units</span>
            <Activity className="text-emerald-500" size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Critical Assets</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-600">{stats.critical}</span>
            <ShieldAlert className="text-rose-400" size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Non-Critical Assets</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-blue-600">{stats.nonCritical}</span>
            <ShieldCheck className="text-blue-400" size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Specialized Vendor Managed</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-purple-600">{stats.vendorServiced}</span>
            <Building className="text-purple-400" size={20} />
          </div>
        </div>
      </div>

      {/* ── CONTROLS & FILTER BAR ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search equipment, serial, asset code..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter dropdowns & View Mode toggle */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto">
          <select
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            value={criticicityFilter}
            onChange={(e) => setCriticicityFilter(e.target.value)}
          >
            <option value="all">All Criticalities</option>
            <option value="Critical">Critical Only</option>
            <option value="Non-Critical">Non-Critical Only</option>
          </select>

          <select
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="Operational">Operational</option>
            <option value="Maintenance Due">Maintenance Due</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Out of Service">Out of Service</option>
          </select>

          {/* View Mode Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              PPM Matrix
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Asset Details
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw size={24} className="animate-spin text-emerald-600" />
            <p className="text-xs font-semibold">Loading Medical Equipment Registry...</p>
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Wrench size={32} className="text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No equipment found matching criteria</p>
            <p className="text-xs text-slate-500">Try adjusting your search or filters.</p>
          </div>
        ) : viewMode === 'matrix' ? (
          /* ── 2026 PLANNED PREVENTIVE MAINTENANCE (PPM) MATRIX ── */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 font-bold text-slate-500 uppercase text-[10px] w-10 text-center">SN</th>
                  <th className="py-3 px-3 font-bold text-slate-700 uppercase text-[10px]">Equipment Name</th>
                  <th className="py-3 px-3 font-bold text-slate-700 uppercase text-[10px]">Model</th>
                  <th className="py-3 px-3 font-bold text-slate-700 uppercase text-[10px]">Serial Number</th>
                  <th className="py-3 px-3 font-bold text-slate-700 uppercase text-[10px]">Manufacturer</th>
                  <th className="py-3 px-3 font-bold text-slate-700 uppercase text-[10px]">Asset Code</th>
                  <th className="py-3 px-3 font-bold text-slate-700 uppercase text-[10px]">Criticality</th>
                  <th className="py-3 px-3 font-bold text-emerald-800 uppercase text-[10px] bg-emerald-50/70 border-l border-slate-200">1st PM (Feb)</th>
                  <th className="py-3 px-3 font-bold text-emerald-800 uppercase text-[10px] bg-emerald-50/70">2nd PM (May)</th>
                  <th className="py-3 px-3 font-bold text-emerald-800 uppercase text-[10px] bg-emerald-50/70">3rd PM (Aug)</th>
                  <th className="py-3 px-3 font-bold text-emerald-800 uppercase text-[10px] bg-emerald-50/70">4th PM (Nov)</th>
                  <th className="py-3 px-3 font-bold text-slate-700 uppercase text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEquipment.map((eq, idx) => (
                  <tr key={eq.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-400 text-center text-[11px]">
                      {eq.sn || idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{eq.name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">{eq.model || '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">{eq.serial_number || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">{eq.manufacturer || '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600">{eq.asset_code || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          eq.criticicity_factor === 'Critical'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        {eq.criticicity_factor === 'Critical' ? <ShieldAlert size={10} /> : <ShieldCheck size={10} />}
                        {eq.criticicity_factor}
                      </span>
                    </td>

                    {/* Quarterly PM Columns */}
                    <td className="py-2.5 px-3 border-l border-slate-200">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${getVendorBadgeClass(eq.pm_date_1)}`}>
                        {eq.pm_date_1 || 'Feb/02/2026'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${getVendorBadgeClass(eq.pm_date_2)}`}>
                        {eq.pm_date_2 || 'May/19/2026'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${getVendorBadgeClass(eq.pm_date_3)}`}>
                        {eq.pm_date_3 || 'Aug/19/2026'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${getVendorBadgeClass(eq.pm_date_4)}`}>
                        {eq.pm_date_4 || 'Nov/19/2026'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingItem(eq);
                            setShowModal(true);
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                          title="Edit Equipment"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(eq.id, eq.name)}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── ASSET DETAILS TABLE ── */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 font-bold text-slate-500 uppercase text-[10px] w-10 text-center">SN</th>
                  <th className="py-3 px-3 font-bold text-slate-700 uppercase text-[10px]">Equipment / Model</th>
                  <th className="py-3 px-3 font-bold text-slate-700 uppercase text-[10px]">Asset Code</th>
                  <th className="py-3 px-3 font-bold text-slate-700 uppercase text-[10px]">Serial Number</th>
                  <th className="py-3 px-3 font-bold text-slate-700 uppercase text-[10px]">Service Partner</th>
                  <th className="py-3 px-3 font-bold text-slate-700 uppercase text-[10px]">Room / Dept</th>
                  <th className="py-3 px-3 font-bold text-slate-700 uppercase text-[10px]">Status</th>
                  <th className="py-3 px-3 font-bold text-slate-700 uppercase text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEquipment.map((eq, idx) => (
                  <tr key={eq.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-400 text-center text-[11px]">
                      {eq.sn || idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{eq.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{eq.manufacturer} • {eq.model}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700">{eq.asset_code || '—'}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{eq.serial_number || '—'}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${getVendorBadgeClass(eq.service_provider)}`}>
                        {eq.service_provider || eq.manufacturer || 'In-House'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <MapPin size={11} className="text-slate-400" />
                        {eq.location_room || 'Main Lab'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle size={10} />
                        {eq.status || 'Operational'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingItem(eq);
                            setShowModal(true);
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                          title="Edit Equipment"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(eq.id, eq.name)}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL ── */}
      {showModal && (
        <EquipmentModal
          initial={editingItem}
          onSave={handleSaveEquipment}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          saving={saving}
        />
      )}
    </div>
  );
}
