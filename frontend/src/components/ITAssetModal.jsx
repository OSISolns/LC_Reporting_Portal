import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Monitor, X, Hash, Tag, Building2, MapPin, User, Calendar, Check, Plus, Edit2
} from 'lucide-react';

const DEPARTMENT_OPTIONS = [
  'RECEPTION', 'ADMINISTRATION', 'LABORATORY', 'IMAGING', 'NURSING',
  'DENTAL', 'OPERATIONS', 'CALL CENTER', 'IT', 'PEDIATRICS',
  'GYNECOLOGY', 'PHYSIOTHERAPY', 'CARDIOLOGY', 'OUTPATIENT', 'DERMATOLOGY',
  'EXECUTIVE', 'ENT', 'INTERNAL MEDICINE', 'STORES', 'NEUROLOGY',
  'ORTHOPEDICS', 'PHLEBOTOMY', 'UROLOGY', 'VIP LOUNGE', 'GENERAL'
];

const ASSET_TYPE_OPTIONS = [
  { value: 'Workstation', label: 'Workstation / All-in-One' },
  { value: 'Laptop', label: 'Laptop / Notebook' },
  { value: 'Telephone', label: 'Telephone / IP Deskphone' },
  { value: 'Printer', label: 'Printer / Copier / Label Maker' },
  { value: 'Display', label: 'Display / TV Screen / Monitor' },
  { value: 'Network', label: 'Switch / Router / AP' },
  { value: 'Server', label: 'Server / Rack Unit' },
  { value: 'Scanner', label: 'Scanner / Digitizer' },
  { value: 'Storage', label: 'Storage / External Drive' },
  { value: 'Equipment', label: 'Medical IT Equipment' },
  { value: 'Other', label: 'Other Equipment' }
];

export default function ITAssetModal({
  isOpen,
  onClose,
  editingAsset,
  assetForm,
  setAssetForm,
  onSubmit
}) {
  // Prevent background scroll and support Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[99999] flex flex-col justify-start items-center overflow-y-auto"
      onClick={onClose}
    >
      {/* Top Drawer Sheet Panel */}
      <div
        className="w-full max-w-4xl bg-white rounded-b-3xl shadow-2xl border-b border-x border-slate-200/90 overflow-hidden my-0 animate-sheet-down"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Subtle top grab bar */}
        <div className="w-full pt-2.5 pb-1 flex justify-center bg-slate-50/90 border-b border-slate-100">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Drawer Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200/80 bg-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#007B8A] flex items-center justify-center border border-sky-100 flex-shrink-0">
              {editingAsset ? <Edit2 size={18} /> : <Monitor size={18} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">
                  {editingAsset ? 'Edit IT Asset' : 'Add IT Asset'}
                </h2>
                {editingAsset?.asset_tag && (
                  <span className="font-mono text-[10px] font-bold text-[#007B8A] bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                    {editingAsset.asset_tag}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {editingAsset
                  ? 'Update hardware specification, assigned custodian, clinical department, or status.'
                  : 'Register a new clinical workstation, medical terminal, or IT hardware unit.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
            title="Close drawer (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Scrollable Form Body */}
        <form onSubmit={onSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Section 1: Hardware Identification */}
          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Monitor size={14} className="text-[#007B8A]" />
              <span>Hardware & Classification</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Asset Tag / Legacy Code
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input
                    type="text"
                    value={assetForm.asset_tag}
                    onChange={e => setAssetForm({ ...assetForm, asset_tag: e.target.value })}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#007B8A] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Asset Type
                </label>
                <select
                  value={assetForm.asset_type}
                  onChange={e => setAssetForm({ ...assetForm, asset_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#007B8A] cursor-pointer"
                >
                  {ASSET_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Item Description / Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={assetForm.name}
                onChange={e => setAssetForm({ ...assetForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#007B8A] transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Model / Specification
                </label>
                <input
                  type="text"
                  value={assetForm.model}
                  onChange={e => setAssetForm({ ...assetForm, model: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#007B8A] transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Serial Number
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input
                    type="text"
                    value={assetForm.serial_number}
                    onChange={e => setAssetForm({ ...assetForm, serial_number: e.target.value })}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:outline-none focus:border-[#007B8A] transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Placement & Custody */}
          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Building2 size={14} className="text-[#007B8A]" />
              <span>Clinical Department & Custody</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Department
                </label>
                <select
                  value={assetForm.department}
                  onChange={e => setAssetForm({ ...assetForm, department: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#007B8A] cursor-pointer"
                >
                  {DEPARTMENT_OPTIONS.map(d => (
                    <option key={d} value={d}>
                      {d.charAt(0) + d.slice(1).toLowerCase().replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Physical Location / Station Room
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input
                    type="text"
                    value={assetForm.location}
                    onChange={e => setAssetForm({ ...assetForm, location: e.target.value })}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#007B8A] transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Assigned Custodian / Staff
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input
                    type="text"
                    value={assetForm.assigned_to}
                    onChange={e => setAssetForm({ ...assetForm, assigned_to: e.target.value })}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#007B8A] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Operational Status
                </label>
                <select
                  value={assetForm.status}
                  onChange={e => setAssetForm({ ...assetForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#007B8A] cursor-pointer"
                >
                  <option value="Active">🟢 Active (Operational)</option>
                  <option value="Needs Repair">🔴 Needs Repair / Faulty</option>
                  <option value="Inactive">⚪ Inactive / Decommissioned</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Lifecycle & Warranty */}
          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Calendar size={14} className="text-[#007B8A]" />
              <span>Procurement & Warranty Dates</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={assetForm.purchase_date}
                  onChange={e => setAssetForm({ ...assetForm, purchase_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#007B8A] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Warranty Expiry
                </label>
                <input
                  type="date"
                  value={assetForm.warranty_expiry}
                  onChange={e => setAssetForm({ ...assetForm, warranty_expiry: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#007B8A] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex justify-end gap-2.5 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#007B8A] hover:bg-[#00606c] font-bold text-xs text-white shadow-xs transition-colors flex items-center gap-2"
            >
              {editingAsset ? <Check size={14} /> : <Plus size={14} />}
              <span>{editingAsset ? 'Save Asset Changes' : 'Register Asset'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Sheet Down Animation */}
      <style>{`
        @keyframes sheetDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-sheet-down {
          animation: sheetDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
}
