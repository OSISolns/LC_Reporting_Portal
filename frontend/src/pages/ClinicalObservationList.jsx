import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Badge } from '../components/ui/index';
import { Search, Eye, FileText, Loader2, Activity } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

export default function ClinicalObservationList() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.ceil(records.length / itemsPerPage);
  const paginatedRecords = records.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (statusFilter) params.set('status', statusFilter);

        // Use the master list endpoint — NOT /recent (which is user-scoped and limited to 10).
        const res = await api.get(`/clinical/observations?${params.toString()}`);
        if (res.data.success) {
          setRecords(res.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching clinical observations:', error);
        toast.error('Failed to load clinical records');
      } finally {
        setLoading(false);
      }
    };

    // Debounce search by 350ms
    const timer = setTimeout(fetchRecords, search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const statusColors = {
    Draft:    'bg-amber-50 text-amber-700 border-amber-200',
    Saved:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    Final:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    Reviewed: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className="p-6 w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Clinical Observations</h1>
          <p className="text-slate-500 font-medium">
            <span className="font-bold text-slate-700">{records.length}</span> observation{records.length !== 1 ? 's' : ''} found — all nursing clinical sheets
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm font-semibold border border-slate-200 rounded-full px-3 py-2 bg-slate-50 text-slate-700 outline-none focus:border-sky-400"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Saved">Saved</option>
            <option value="Final">Final</option>
            <option value="Reviewed">Reviewed</option>
          </select>

          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search by patient name, PID, or Queue ID..."
              className="pl-10 bg-slate-50 border-slate-200 rounded-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500 tracking-wider">
            <tr>
              <th className="p-4">Patient</th>
              <th className="p-4">Ward / Bed</th>
              <th className="p-4 text-center">Vitals (BP / Temp / SpO₂)</th>
              <th className="p-4">Recorded By</th>
              <th className="p-4">Date</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="p-10 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-bold uppercase tracking-wider">Loading records…</span>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Activity className="w-10 h-10" strokeWidth={1.2} />
                    <p className="text-sm font-bold">No clinical observations found.</p>
                    {search && (
                      <button onClick={() => setSearch('')} className="text-xs font-bold text-sky-600 hover:underline">
                        Clear search
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((rec) => {
                const initials = (rec.patient_name || '??').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                const dateStr = rec.updated_at
                  ? new Date(rec.updated_at).toLocaleDateString([], { dateStyle: 'medium' })
                  : '—';
                const timeStr = rec.updated_at
                  ? new Date(rec.updated_at).toLocaleTimeString([], { timeStyle: 'short' })
                  : '';
                const statusCls = statusColors[rec.status] || 'bg-slate-100 text-slate-600 border-slate-200';

                return (
                  <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Patient */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1b669d] text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{rec.patient_name || '—'}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">PID: {rec.patient_id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Ward / Bed */}
                    <td className="p-4">
                      <div className="font-semibold text-slate-700">{rec.ward || '—'}</div>
                      {rec.bed && <div className="text-xs text-slate-400 mt-0.5">Bed {rec.bed}</div>}
                    </td>

                    {/* Vitals */}
                    <td className="p-4 text-center">
                      <div className="flex flex-col gap-0.5 items-center text-xs font-medium text-slate-600">
                        {rec.bp   && <span><span className="font-bold text-slate-800">BP:</span> {rec.bp}</span>}
                        {rec.temp && <span><span className="font-bold text-slate-800">T:</span> {rec.temp} °C</span>}
                        {rec.spo2 && <span><span className="font-bold text-slate-800">SpO₂:</span> {rec.spo2}%</span>}
                        {!rec.bp && !rec.temp && !rec.spo2 && <span className="text-slate-300">—</span>}
                      </div>
                    </td>

                    {/* Recorded By */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-700 font-semibold">{rec.created_by_name || '—'}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="p-4">
                      <div className="text-slate-700 font-semibold">{dateStr}</div>
                      {timeStr && <div className="text-xs text-slate-400 mt-0.5">{timeStr}</div>}
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center">
                      <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded border ${statusCls}`}>
                        {rec.status || 'Draft'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="p-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[#1b669d] border-[#1b669d]/30 hover:bg-[#1b669d]/10"
                        onClick={() => window.open(`/patients/${rec.patient_id}/records`, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-2" /> View
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-200 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, records.length)} of {records.length} entries
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="font-bold text-xs"
              >
                Previous
              </Button>
              <span className="text-xs font-bold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="font-bold text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
