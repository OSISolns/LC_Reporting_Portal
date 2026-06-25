import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, FileText, RefreshCw, ChevronRight,
  Thermometer, Activity, Wind, Calendar, User, Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';

const STATUS_COLORS = {
  Draft:     { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
  Completed: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  Reviewed:  { bg: 'bg-blue-100',  text: 'text-blue-700',  dot: 'bg-blue-500'  },
  Verified:  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.Draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status || 'Draft'}
    </span>
  );
};

const VitalChip = ({ icon, value, label }) => {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 rounded px-1.5 py-0.5">
      {icon}
      <span className="font-medium">{value}</span>
      <span className="text-slate-400">{label}</span>
    </span>
  );
};

const ClinicalSheetsList = () => {
  const navigate = useNavigate();
  const [records, setRecords]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [from, setFrom]           = useState('');
  const [to, setTo]               = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, from, to]);

  const totalPages = Math.ceil(records.length / itemsPerPage);
  const paginatedRecords = records.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)       params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (from)         params.set('from', from);
      if (to)           params.set('to', to);
      const res = await api.get(`/clinical/observations?${params.toString()}`);
      if (res.data?.success) {
        setRecords(res.data.data);
      } else {
        toast.error(res.data?.message || 'No data returned.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load clinical sheets.';
      console.error('ClinicalSheetsList fetch error:', err);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, from, to]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const openSheet = (row) => {
    navigate(`/clinical-sheet/${row.patient_id}?queue_id=${row.queue_id}`);
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Clinical Sheets
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">All patient clinical observations and documentation</p>
          </div>
          <button
            onClick={fetchRecords}
            className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient name, ID or queue…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Completed">Completed</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Verified">Verified</option>
          </select>

          {/* Date range */}
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-slate-700"
            title="From date"
          />
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-slate-700"
            title="To date"
          />
        </div>
      </div>

      {/* ── Summary bar ── */}
      <div className="px-6 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-6 text-xs text-indigo-700">
        <span><strong>{records.length}</strong> record{records.length !== 1 ? 's' : ''} found</span>
        <span className="text-indigo-300">|</span>
        <span><strong>{records.filter(r => r.status === 'Draft').length}</strong> Draft</span>
        <span><strong>{records.filter(r => r.status === 'Completed').length}</strong> Completed</span>
        <span><strong>{records.filter(r => r.status === 'Reviewed').length}</strong> Reviewed</span>
        <span><strong>{records.filter(r => r.status === 'Verified').length}</strong> Verified</span>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <p className="text-sm">Loading clinical sheets…</p>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
            <FileText className="h-12 w-12 text-slate-200" />
            <p className="text-sm font-medium">No clinical sheets found</p>
            <p className="text-xs">Try adjusting the search or filters above</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Patient</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Queue / PID</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Key Vitals</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Recorded By</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Last Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedRecords.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => openSheet(row)}
                    className="hover:bg-indigo-50 cursor-pointer transition-colors group"
                  >
                    {/* Patient */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${row.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                          {(row.patient_name || '?').charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-xs leading-tight">{row.patient_name || '—'}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{row.gender}{row.dob ? ` · ${row.dob}` : ''}</p>
                        </div>
                      </div>
                    </td>

                    {/* Queue / PID */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-mono text-indigo-600 font-semibold">{row.queue_id || '—'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">PID: {row.patient_id}</p>
                      {(row.ward || row.bed) && (
                        <p className="text-[10px] text-slate-400">{[row.ward && `Ward: ${row.ward}`, row.bed && `Bed: ${row.bed}`].filter(Boolean).join(' · ')}</p>
                      )}
                    </td>

                    {/* Vitals */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <VitalChip icon={<Thermometer className="h-3 w-3 text-orange-400" />} value={row.temp} label="°C" />
                        <VitalChip icon={<Activity className="h-3 w-3 text-red-400" />} value={row.bp} label="mmHg" />
                        <VitalChip icon={<Wind className="h-3 w-3 text-sky-400" />} value={row.spo2} label="%" />
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>

                    {/* Recorded by */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <User className="h-3 w-3 text-slate-300" />
                        {row.created_by_name || '—'}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="h-3 w-3 text-slate-300" />
                        {formatDate(row.updated_at)}
                      </div>
                    </td>

                    {/* Arrow */}
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-200 bg-slate-50/50">
                <p className="text-xs font-semibold text-slate-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, records.length)} of {records.length} entries
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-semibold text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicalSheetsList;
