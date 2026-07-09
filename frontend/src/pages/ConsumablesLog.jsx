import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList, Package, Boxes, TrendingDown, RefreshCw, Loader2,
  Plus, Search, Calendar, Building, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const today = () => new Date().toISOString().slice(0, 10);

export default function ConsumablesLog() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Shared inventory (synced with Stock Manager portal)
  const [departments, setDepartments] = useState([]);
  const [distributedStock, setDistributedStock] = useState([]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);

  // Form state
  const [formDept, setFormDept] = useState('');
  const [formItemId, setFormItemId] = useState('');
  const [formItemSearch, setFormItemSearch] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Filters
  const [filterDept, setFilterDept] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const loadData = async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const [deptRes, stockRes, logRes, sumRes] = await Promise.allSettled([
        api.get('/clinical/inventory/departments'),
        api.get('/clinical/inventory/distributed-stock'),
        api.get('/clinical/inventory/consumables', {
          params: { department_id: filterDept || undefined, from: filterFrom || undefined, to: filterTo || undefined },
        }),
        api.get('/clinical/inventory/consumables/summary'),
      ]);
      if (deptRes.status === 'fulfilled' && deptRes.value.data.success) setDepartments(deptRes.value.data.data || []);
      if (stockRes.status === 'fulfilled' && stockRes.value.data.success) setDistributedStock(stockRes.value.data.data || []);
      if (logRes.status === 'fulfilled' && logRes.value.data.success) setEntries(logRes.value.data.data || []);
      if (sumRes.status === 'fulfilled' && sumRes.value.data.success) setSummary(sumRes.value.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load consumables data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Items available in the selected department (from shared department_stock),
  // aggregated across batches so the picker shows total on-hand per item.
  const deptStockItems = useMemo(() => {
    if (!formDept) return [];
    const map = new Map();
    for (const row of distributedStock) {
      if (String(row.department_id) !== String(formDept)) continue;
      const key = row.item_id;
      if (!map.has(key)) {
        map.set(key, { item_id: row.item_id, name: row.name, unit: row.unit_of_measure, available: 0 });
      }
      map.get(key).available += Number(row.quantity || 0);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [formDept, distributedStock]);

  const selectedItem = deptStockItems.find(i => String(i.item_id) === String(formItemId));

  const filteredStockItems = useMemo(() => {
    if (!formItemSearch.trim()) return deptStockItems;
    const q = formItemSearch.toLowerCase();
    return deptStockItems.filter(i => i.name.toLowerCase().includes(q));
  }, [deptStockItems, formItemSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formDept) return toast.error('Select a department.');
    if (!formItemId) return toast.error('Select an item to log.');
    const qty = parseInt(formQty, 10);
    if (!qty || qty <= 0) return toast.error('Enter a quantity greater than 0.');
    if (selectedItem && qty > selectedItem.available) {
      return toast.error(`Only ${selectedItem.available} ${selectedItem.unit || 'unit(s)'} available.`);
    }

    setSubmitting(true);
    try {
      const res = await api.post('/clinical/inventory/consumables', {
        department_id: parseInt(formDept, 10),
        item_id: parseInt(formItemId, 10),
        quantity: qty,
        notes: formNotes || undefined,
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Consumption logged.');
        setFormItemId('');
        setFormItemSearch('');
        setFormQty('');
        setFormNotes('');
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to log consumption.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
        <p className="text-slate-500 font-semibold animate-pulse">Loading Consumables Log…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-teal-50 text-teal-700 border border-teal-150 rounded-2xl shadow-sm">
              <ClipboardList size={26} />
            </span>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Consumables Log</h1>
              <p className="text-sm text-slate-500 mt-0.5 font-medium">
                Record consumable usage per department — synced live with Central Store stock.
              </p>
            </div>
          </div>
          <button onClick={() => loadData(true)}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 transition-all shadow-xs cursor-pointer">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </motion.div>

        {/* KPIs */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-2xl p-4">
              <p className="text-[10px] text-teal-600 font-black uppercase tracking-wider">Logged Today</p>
              <p className="text-3xl font-black text-teal-900 mt-1">{summary.today.entries}</p>
              <p className="text-[10px] text-teal-700 font-semibold mt-1">{summary.today.units} units consumed</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-2xl p-4">
              <p className="text-[10px] text-indigo-600 font-black uppercase tracking-wider">Top Item (30d)</p>
              <p className="text-lg font-black text-indigo-900 mt-1 truncate">{summary.top_items[0]?.item_name || '—'}</p>
              <p className="text-[10px] text-indigo-700 font-semibold mt-1">{summary.top_items[0]?.units || 0} units</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-2xl p-4">
              <p className="text-[10px] text-amber-600 font-black uppercase tracking-wider">Departments Active</p>
              <p className="text-3xl font-black text-amber-900 mt-1">{summary.by_department.length}</p>
              <p className="text-[10px] text-amber-700 font-semibold mt-1">consuming in last 30d</p>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-4">
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-wider">Log Entries</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{entries.length}</p>
              <p className="text-[10px] text-slate-700 font-semibold mt-1">shown below</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Log form */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs h-fit">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 mb-4">
              <Plus size={18} className="text-teal-600" /> Log Consumption
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Department</label>
                <select value={formDept}
                  onChange={(e) => { setFormDept(e.target.value); setFormItemId(''); setFormItemSearch(''); }}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal-400 focus:bg-white">
                  <option value="">Select department…</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Item (in stock)</label>
                {!formDept ? (
                  <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-xl p-2.5 mt-1">
                    Select a department to see its available consumables.
                  </p>
                ) : deptStockItems.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mt-1">
                    No distributed stock found for this department.
                  </p>
                ) : (
                  <>
                    <input type="text" placeholder="Search item…" value={formItemSearch}
                      onChange={(e) => setFormItemSearch(e.target.value)}
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400 focus:bg-white" />
                    <select value={formItemId} onChange={(e) => setFormItemId(e.target.value)}
                      size={Math.min(6, Math.max(3, filteredStockItems.length))}
                      className="w-full mt-1.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-400">
                      {filteredStockItems.map(i => (
                        <option key={i.item_id} value={i.item_id}>
                          {i.name} — {i.available} {i.unit || ''} avail.
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>

              {selectedItem && (
                <div className="flex items-center gap-2 text-xs bg-teal-50 border border-teal-200 rounded-xl px-3 py-2 text-teal-700 font-bold">
                  <Boxes size={14} /> {selectedItem.available} {selectedItem.unit || 'unit(s)'} available
                </div>
              )}

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Quantity Consumed</label>
                <input type="number" min="1" max={selectedItem?.available || undefined} value={formQty}
                  onChange={(e) => setFormQty(e.target.value)} placeholder="0"
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-teal-400 focus:bg-white" />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Notes (optional)</label>
                <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. used in procedure room"
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:bg-white" />
              </div>

              <button type="submit" disabled={submitting || !formItemId}
                className="w-full py-3 bg-teal-700 hover:bg-teal-600 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all">
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <TrendingDown size={15} />} Record Consumption
              </button>
            </form>
          </div>

          {/* Log table */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Package size={18} className="text-indigo-600" /> Consumption History
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 outline-none">
                  <option value="">All depts</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input type="date" value={filterFrom} max={today()} onChange={(e) => setFilterFrom(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 outline-none" />
                <input type="date" value={filterTo} max={today()} onChange={(e) => setFilterTo(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 outline-none" />
                <button onClick={() => loadData(true)}
                  className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg cursor-pointer">Apply</button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2.5">When</th>
                    <th className="text-left px-3 py-2.5">Department</th>
                    <th className="text-left px-3 py-2.5">Item</th>
                    <th className="text-center px-3 py-2.5">Qty</th>
                    <th className="text-left px-3 py-2.5">Batch</th>
                    <th className="text-left px-3 py-2.5">By</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{new Date(e.consumed_at).toLocaleString()}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-700">{e.department_name || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-800">
                        {e.item_name}
                        {e.notes && <span className="block text-[11px] text-slate-400 font-normal">{e.notes}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center font-black text-rose-600">−{e.quantity} <span className="text-slate-400 font-semibold text-xs">{e.unit || ''}</span></td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{e.batch_number || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-500 text-xs">{e.logged_by_name || '—'}</td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-10 text-center text-slate-400 italic">No consumption logged for this filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
