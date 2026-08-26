import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertOctagon, TrendingUp, Clock, AlertTriangle, ListChecks,
  Search, FilePlus2, RefreshCw, Pencil, Trash2, X, CheckCircle2,
  Shield, CheckCircle as CheckCircleIcon, Save
} from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

export default function NCRManagement() {
  // ── STATE ──────────────────────────────────────────────────────────────────
  const [ncrList, setNcrList] = useState([]);
  const [ncrKpi, setNcrKpi] = useState({
    totalThisMonth: 0,
    closedThisMonth: 0,
    pctCompleted: 0,
    openCount: 0,
    inProgressCount: 0,
    overdueCount: 0,
    totalAllTime: 0
  });
  const [ncrLoading, setNcrLoading] = useState(false);
  const [ncrView, setNcrView] = useState('list'); // 'list' | 'new' | 'edit'
  const [ncrSelected, setNcrSelected] = useState(null);
  const [ncrStatusFilter, setNcrStatusFilter] = useState('all');
  const [ncrSearch, setNcrSearch] = useState('');
  const [ncrSubmitting, setNcrSubmitting] = useState(false);

  // Form blank template
  const NCR_BLANK = {
    occurred_at: new Date().toISOString().slice(0, 16),
    recorded_by: '',
    unit: 'Hematology',
    nc_category: 'Pre-analytical',
    description: '',
    rca_method: [],
    rca_results: '',
    immediate_action: '',
    significance: 'minor',
    extent: '',
    assigned_to_name: '',
    assigned_to_position: 'Head Manager',
    corrective_actions: '',
    target_completion: '',
    monitoring_notes: '',
    staff_name: '',
    reviewed_by_qm: '',
    verified_by_lab_manager: '',
    status: 'open',
  };
  const [ncrForm, setNcrForm] = useState({ ...NCR_BLANK });

  // Fetch NCR records & KPIs
  const fetchNCRs = async () => {
    setNcrLoading(true);
    try {
      const res = await api.get('/lab/ncr');
      if (res.data?.success) {
        setNcrList(res.data.data || []);
        setNcrKpi(res.data.kpi || {});
      }
    } catch (err) {
      console.warn('NCR fetch failed:', err);
      toast.error('Failed to load NCR records.');
    } finally {
      setNcrLoading(false);
    }
  };

  useEffect(() => {
    fetchNCRs();
  }, []);

  // ── HANDLERS ───────────────────────────────────────────────────────────────
  const handleNCRFieldChange = (field, value) => {
    setNcrForm(prev => ({ ...prev, [field]: value }));
  };

  const handleNCRRcaToggle = (method) => {
    setNcrForm(prev => {
      const current = Array.isArray(prev.rca_method) ? prev.rca_method : [];
      return {
        ...prev,
        rca_method: current.includes(method)
          ? current.filter(m => m !== method)
          : [...current, method]
      };
    });
  };

  const handleNCRSubmit = async (e) => {
    e.preventDefault();
    setNcrSubmitting(true);
    try {
      const payload = {
        ...ncrForm,
        rca_method: Array.isArray(ncrForm.rca_method) ? ncrForm.rca_method.join(', ') : ncrForm.rca_method,
      };
      if (ncrView === 'edit' && ncrSelected?.id) {
        await api.put(`/lab/ncr/${ncrSelected.id}`, payload);
        toast.success('NCR updated successfully.');
      } else {
        const res = await api.post('/lab/ncr', payload);
        toast.success(`${res.data.ncr_number} created successfully.`);
      }
      await fetchNCRs();
      setNcrView('list');
      setNcrSelected(null);
      setNcrForm({ ...NCR_BLANK });
    } catch (err) {
      console.error(err);
      toast.error('Failed to save NCR.');
    } finally {
      setNcrSubmitting(false);
    }
  };

  const handleNCREdit = (ncr) => {
    setNcrSelected(ncr);
    setNcrForm({
      occurred_at: ncr.occurred_at || new Date().toISOString().slice(0, 16),
      recorded_by: ncr.recorded_by || '',
      unit: ncr.unit || 'Hematology',
      nc_category: ncr.nc_category || 'Pre-analytical',
      description: ncr.description || '',
      rca_method: ncr.rca_method ? ncr.rca_method.split(', ').filter(Boolean) : [],
      rca_results: ncr.rca_results || '',
      immediate_action: ncr.immediate_action || '',
      significance: ncr.significance || 'minor',
      extent: ncr.extent || '',
      assigned_to_name: ncr.assigned_to_name || '',
      assigned_to_position: ncr.assigned_to_position || 'Head Manager',
      corrective_actions: ncr.corrective_actions || '',
      target_completion: ncr.target_completion || '',
      monitoring_notes: ncr.monitoring_notes || '',
      staff_name: ncr.staff_name || '',
      reviewed_by_qm: ncr.reviewed_by_qm || '',
      verified_by_lab_manager: ncr.verified_by_lab_manager || '',
      status: ncr.status || 'open',
    });
    setNcrView('edit');
  };

  const handleNCRDelete = async (id, ncrNumber) => {
    if (!window.confirm(`Permanently delete NCR ${ncrNumber}? This cannot be undone.`)) return;
    try {
      await api.delete(`/lab/ncr/${id}`);
      toast.success(`NCR ${ncrNumber} deleted.`);
      fetchNCRs();
    } catch (err) {
      toast.error('Failed to delete NCR.');
    }
  };

  const filteredNCRs = useMemo(() => {
    return ncrList.filter(ncr => {
      const matchesStatus = ncrStatusFilter === 'all' || ncr.status === ncrStatusFilter;
      const q = ncrSearch.toLowerCase();
      const matchesSearch = !q.trim() ||
        ncr.ncr_number?.toLowerCase().includes(q) ||
        ncr.recorded_by?.toLowerCase().includes(q) ||
        ncr.unit?.toLowerCase().includes(q) ||
        ncr.description?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [ncrList, ncrStatusFilter, ncrSearch]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-900 antialiased">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertOctagon className="text-amber-500" size={22} /> Non-Conformance Management (NCR)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-normal">
            ISO 15189:2022 Compliant Non-Conformance Reporting & Quality Audit Tracking (LEG/PATHLAB/MSD/FM-12-VERS-004)
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {ncrView === 'list' ? (
            <button
              onClick={() => { setNcrForm({ ...NCR_BLANK }); setNcrSelected(null); setNcrView('new'); }}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FilePlus2 size={15} /> New NCR Report
            </button>
          ) : (
            <button
              onClick={() => { setNcrView('list'); setNcrForm({ ...NCR_BLANK }); }}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <ListChecks size={15} /> View Register
            </button>
          )}
          <button
            onClick={fetchNCRs}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
            title="Refresh"
          >
            <RefreshCw size={15} className={ncrLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'NCRs This Month',
            value: ncrKpi.totalThisMonth ?? 0,
            sub: `${ncrKpi.totalAllTime ?? 0} all-time`,
            icon: <AlertOctagon size={17} className="text-amber-500" />,
            accent: 'border-l-amber-400',
          },
          {
            label: '% Completed (ISO KPI)',
            value: `${ncrKpi.pctCompleted ?? 0}%`,
            sub: `${ncrKpi.closedThisMonth ?? 0} closed this month`,
            icon: <TrendingUp size={17} className="text-emerald-500" />,
            accent: 'border-l-emerald-400',
          },
          {
            label: 'Open NCRs',
            value: ncrKpi.openCount ?? 0,
            sub: `${ncrKpi.inProgressCount ?? 0} in progress`,
            icon: <Clock size={17} className="text-sky-500" />,
            accent: 'border-l-sky-400',
          },
          {
            label: 'Overdue (>30 days)',
            value: ncrKpi.overdueCount ?? 0,
            sub: 'Require urgent attention',
            icon: <AlertTriangle size={17} className="text-rose-500" />,
            accent: 'border-l-rose-400',
          },
        ].map((k, i) => (
          <div key={i} className={`bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4 border-l-4 ${k.accent} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{k.label}</span>
              {k.icon}
            </div>
            <p className="text-2xl font-bold text-slate-900">{k.value}</p>
            <p className="text-[10px] text-slate-400">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* NCR Register Table View */}
      {ncrView === 'list' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ListChecks size={15} className="text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900">NCR Register</h2>
              <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 font-medium">{filteredNCRs.length} records</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <div className="flex items-center gap-1">
                {['all','open','in_progress','closed'].map(s => (
                  <button
                    key={s}
                    onClick={() => setNcrStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold capitalize cursor-pointer transition-colors ${
                      ncrStatusFilter === s ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {s.replace('_',' ')}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  value={ncrSearch}
                  onChange={e => setNcrSearch(e.target.value)}
                  placeholder="Search NCR..."
                  className="pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">NCR Number</th>
                  <th className="py-2.5 px-4">Date / Time</th>
                  <th className="py-2.5 px-4">Unit</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Significance</th>
                  <th className="py-2.5 px-4">Recorded By</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ncrLoading ? (
                  <tr><td colSpan="8" className="py-10 text-center text-slate-400 text-xs">Loading NCRs…</td></tr>
                ) : filteredNCRs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center">
                      <AlertOctagon size={28} className="mx-auto text-slate-200 mb-2" />
                      <p className="text-slate-400 font-medium text-xs">No NCRs found. Click "New NCR Report" to log a non-conformance.</p>
                    </td>
                  </tr>
                ) : filteredNCRs.map(ncr => {
                  const statusCfg = {
                    open:        { label: 'Open',        cls: 'bg-amber-100 text-amber-800' },
                    in_progress: { label: 'In Progress', cls: 'bg-sky-100 text-sky-800' },
                    closed:      { label: 'Closed',      cls: 'bg-emerald-100 text-emerald-800' },
                    overdue:     { label: 'Overdue',     cls: 'bg-rose-100 text-rose-800' },
                  }[ncr.status] || { label: ncr.status, cls: 'bg-slate-100 text-slate-600' };
                  return (
                    <tr key={ncr.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">{ncr.ncr_number}</td>
                      <td className="py-2.5 px-4 text-slate-500">{ncr.occurred_at ? new Date(ncr.occurred_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                      <td className="py-2.5 px-4">{ncr.unit}</td>
                      <td className="py-2.5 px-4 text-slate-500">{ncr.nc_category || '—'}</td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${ncr.significance === 'major' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                          {ncr.significance === 'major' ? <AlertTriangle size={10} /> : <Shield size={10} />}
                          {ncr.significance}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">{ncr.recorded_by}</td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusCfg.cls}`}>{statusCfg.label}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleNCREdit(ncr)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                            title="Edit NCR"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleNCRDelete(ncr.id, ncr.ncr_number)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Delete NCR"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NCR FORM (New / Edit) — Digital replica of LEG/PATHLAB/MSD/FM-12-VERS-004 */}
      {(ncrView === 'new' || ncrView === 'edit') && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
          {/* Form Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-900 rounded-t-2xl">
            <div>
              <div className="flex items-center gap-2">
                <AlertOctagon size={16} className="text-amber-400" />
                <h2 className="text-sm font-bold text-white">
                  {ncrView === 'edit' ? `Edit NCR — ${ncrSelected?.ncr_number}` : 'New Non-Conformance Report'}
                </h2>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Form Ref: LEG/PATHLAB/MSD/FM-12-VERS-004 | ISO 15189:2022</p>
            </div>
            <button
              onClick={() => { setNcrView('list'); setNcrForm({ ...NCR_BLANK }); }}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleNCRSubmit} className="p-5 space-y-6 text-xs">
            {/* ── PAGE 1 ──────────────────────────────────────────────── */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Page 1 — Non-Conformance Identification & Root Cause Analysis</p>
              </div>
              <div className="p-4 space-y-4">

                {/* Row 1: NCR Number + Date/Time */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Non-Conformance Number</label>
                    <input
                      type="text"
                      readOnly
                      value={ncrView === 'edit' ? ncrSelected?.ncr_number : 'Auto-generated on save'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 font-mono cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Date & Time of NC <span className="text-rose-500">*</span></label>
                    <input
                      type="datetime-local"
                      required
                      value={ncrForm.occurred_at}
                      onChange={e => handleNCRFieldChange('occurred_at', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 font-medium text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Staff Member Recording <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Full name of staff recording"
                      value={ncrForm.recorded_by}
                      onChange={e => handleNCRFieldChange('recorded_by', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                    />
                  </div>
                </div>

                {/* Row 2: Unit + Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Unit where Identified <span className="text-rose-500">*</span></label>
                    <select
                      required
                      value={ncrForm.unit}
                      onChange={e => handleNCRFieldChange('unit', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                    >
                      {['Hematology','Biochemistry','Microbiology','Serology / Immunology','Molecular / PCR','Coagulation','Urinalysis','Blood Bank','Reception / Pre-Analytical','Quality Control','General Laboratory','Administration'].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">NC Category</label>
                    <select
                      value={ncrForm.nc_category}
                      onChange={e => handleNCRFieldChange('nc_category', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                    >
                      {['Pre-analytical','Analytical','Post-analytical','Administrative','Equipment / Instrumentation','Reagent / Consumable','Personnel','Facility / Environment'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Detailed Description of Non-Conformance</label>
                  <textarea
                    rows={3}
                    placeholder="Describe the non-conformance in detail…"
                    value={ncrForm.description}
                    onChange={e => handleNCRFieldChange('description', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 resize-none"
                  />
                </div>

                {/* RCA Method */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Root Cause Analysis Method Used</label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { id: 'Fish-bone Diagram', label: 'Fish-bone Diagram' },
                      { id: '5 Whys Analysis', label: '5 Whys Analysis' },
                      { id: 'Brainstorming Session', label: 'Brainstorming Session' },
                      { id: 'Pareto Analysis', label: 'Pareto Analysis' },
                    ].map(m => {
                      const selected = Array.isArray(ncrForm.rca_method) && ncrForm.rca_method.includes(m.id);
                      return (
                        <label key={m.id} className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors select-none ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={selected}
                            onChange={() => handleNCRRcaToggle(m.id)}
                          />
                          <CheckCircle2 size={12} className={selected ? 'text-white' : 'text-slate-300'} />
                          {m.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* RCA Results */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Root Cause Analysis Results</label>
                  <textarea
                    rows={3}
                    placeholder="Document the root causes identified…"
                    value={ncrForm.rca_results}
                    onChange={e => handleNCRFieldChange('rca_results', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 resize-none"
                  />
                </div>

                {/* Immediate Action */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Immediate Action Taken</label>
                  <textarea
                    rows={2}
                    placeholder="What was done immediately to contain the non-conformance…"
                    value={ncrForm.immediate_action}
                    onChange={e => handleNCRFieldChange('immediate_action', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 resize-none"
                  />
                </div>

                {/* Significance + Extent */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Medical Significance of the NC</label>
                    <div className="flex gap-3">
                      {['major','minor'].map(sig => (
                        <label key={sig} className={`flex-1 flex items-center justify-center gap-2 py-2.5 border rounded-lg cursor-pointer transition-colors capitalize font-semibold select-none ${ncrForm.significance === sig ? (sig === 'major' ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-900 bg-slate-900 text-white') : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                          <input type="radio" name="significance" className="sr-only" value={sig} checked={ncrForm.significance === sig} onChange={() => handleNCRFieldChange('significance', sig)} />
                          {sig === 'major' ? <AlertTriangle size={13} /> : <Shield size={13} />} {sig}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Extent of NC</label>
                    <textarea
                      rows={2}
                      placeholder="Scope and extent of the non-conformance…"
                      value={ncrForm.extent}
                      onChange={e => handleNCRFieldChange('extent', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── PAGE 2 ──────────────────────────────────────────────── */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Page 2 — Corrective Actions, Monitoring & Verification</p>
              </div>
              <div className="p-4 space-y-4">

                {/* Assigned To */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Investigation & Monitoring Assigned To</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Name</label>
                      <input
                        type="text"
                        placeholder="Investigator name"
                        value={ncrForm.assigned_to_name}
                        onChange={e => handleNCRFieldChange('assigned_to_name', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Position</label>
                      <input
                        type="text"
                        placeholder="e.g. Head Manager, QM"
                        value={ncrForm.assigned_to_position}
                        onChange={e => handleNCRFieldChange('assigned_to_position', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Corrective Actions */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Corrective Action(s) Taken</label>
                  <textarea
                    rows={3}
                    placeholder="List all corrective actions implemented…"
                    value={ncrForm.corrective_actions}
                    onChange={e => handleNCRFieldChange('corrective_actions', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 resize-none"
                  />
                </div>

                {/* Target Completion Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Target Completion Date</label>
                    <input
                      type="date"
                      value={ncrForm.target_completion}
                      onChange={e => handleNCRFieldChange('target_completion', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                    <select
                      value={ncrForm.status}
                      onChange={e => handleNCRFieldChange('status', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Monitoring Effectiveness */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Monitoring Effectiveness of Corrective Action</label>
                  <p className="text-[10px] text-slate-400 mb-1">Track action taken and current status</p>
                  <textarea
                    rows={3}
                    placeholder="Describe how effectiveness of the corrective action is being monitored…"
                    value={ncrForm.monitoring_notes}
                    onChange={e => handleNCRFieldChange('monitoring_notes', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 resize-none"
                  />
                </div>

                {/* Signatures Section */}
                <div className="border-t border-dashed border-slate-200 pt-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Signatures & Verification</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Staff Name</label>
                      <input
                        type="text"
                        placeholder="Staff member name"
                        value={ncrForm.staff_name}
                        onChange={e => handleNCRFieldChange('staff_name', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 italic">Signature on file</p>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Reviewed by Quality Manager (QM)</label>
                      <input
                        type="text"
                        placeholder="QM reviewer name"
                        value={ncrForm.reviewed_by_qm}
                        onChange={e => handleNCRFieldChange('reviewed_by_qm', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 italic">Signature on file</p>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Verified by Laboratory Manager</label>
                      <input
                        type="text"
                        placeholder="Lab Manager name"
                        value={ncrForm.verified_by_lab_manager}
                        onChange={e => handleNCRFieldChange('verified_by_lab_manager', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 italic">Signature on file</p>
                    </div>
                  </div>
                </div>

                {/* Note about closing */}
                {ncrForm.verified_by_lab_manager?.trim() && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <CheckCircleIcon size={14} className="text-emerald-600 shrink-0" />
                    <p className="text-[11px] text-emerald-700 font-medium">This NCR will be automatically marked as <strong>Closed</strong> upon saving because the Laboratory Manager has verified it.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Submit / Cancel */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setNcrView('list'); setNcrForm({ ...NCR_BLANK }); }}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={ncrSubmitting}
                className="flex items-center gap-1.5 px-6 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold text-xs rounded-lg cursor-pointer transition-colors"
              >
                {ncrSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                {ncrView === 'edit' ? 'Update NCR' : 'Submit NCR Report'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
