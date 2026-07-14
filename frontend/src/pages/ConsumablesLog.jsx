import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList, Package, Boxes, TrendingDown, RefreshCw, Loader2,
  Plus, Search, Calendar, Building, AlertCircle, CheckCircle2, FileSpreadsheet,
  ArrowRight, X, Send, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs/dist/exceljs.min.js';

const today = () => new Date().toISOString().slice(0, 10);

const getDepartmentForRole = (role) => {
  const r = String(role || '').toLowerCase();
  if (r === 'admin') return null;
  if (r.includes('nurse')) return { id: '121', name: 'NURSING' };
  if (r.includes('lab')) return { id: '123', name: 'LABORATORY' };
  if (r.includes('stock') || r.includes('procurement') || r === 'deputy_coo') return { id: '130', name: 'GENERAL STORE' };
  if (r.includes('physio')) return { id: '120', name: 'PHYSIO' };
  if (r.includes('dental') || r.includes('dentist')) return { id: '129', name: 'DENTAL' };
  if (r.includes('operations') || r.includes('ops') || r === 'coo') return { id: '122', name: 'OPERATIONS' };
  if (r.includes('imaging') || r.includes('radio') || r.includes('sono')) return { id: '124', name: 'IMAGING' };
  return null;
};

const getItemStatus = (expiryDate) => {
  if (!expiryDate) return { text: 'Active', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  const exp = new Date(expiryDate);
  const today = new Date();
  if (exp < today) return { text: 'Expired', color: 'bg-rose-50 text-rose-700 border-rose-250' };
  const diff = (exp - today) / (1000 * 60 * 60 * 24);
  if (diff <= 90) return { text: 'Near Expiry', color: 'bg-amber-50 text-amber-700 border-amber-250' };
  return { text: 'Active', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
};

export default function ConsumablesLog() {
  const { user } = useAuth();
  const userDept = useMemo(() => getDepartmentForRole(user?.role), [user]);
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Shared inventory (synced with Stock Manager portal)
  const [departments, setDepartments] = useState([]);
  const [distributedStock, setDistributedStock] = useState([]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);

  // Form state
  const [formDept, setFormDept] = useState(userDept ? userDept.id : '');
  const [formItemId, setFormItemId] = useState('');
  const [formItemSearch, setFormItemSearch] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formNotes, setFormNotes] = useState('');
  // Nursing wards + session (AM 07:00–14:59 / PM 15:00–late, auto by time).
  const currentSession = () => (new Date().getHours() < 15 ? 'AM' : 'PM');
  const [formWard, setFormWard] = useState('');
  const [formSession, setFormSession] = useState(currentSession());

  // Filters
  const [filterDept, setFilterDept] = useState(userDept ? userDept.id : '');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Tabs
  const [activeSubTab, setActiveSubTab] = useState('history'); // 'history', 'stock', 'requisitions'
  const [stockTab, setStockTab] = useState('local'); // 'local', 'central'
  const [stockSearchTerm, setStockSearchTerm] = useState('');

  // Consumption History pagination (15 rows per page)
  const HISTORY_PAGE_SIZE = 15;
  const [historyPage, setHistoryPage] = useState(1);

  // Requisitions to Stock Manager
  const [requisitions, setRequisitions] = useState([]);
  const [reqCart, setReqCart] = useState([]);        // [{ item_id, name, quantity, unit }]
  const [reqItemId, setReqItemId] = useState('');
  const [reqQty, setReqQty] = useState('');
  const [reqUrgency, setReqUrgency] = useState('Normal');
  const [reqNotes, setReqNotes] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);

  // Sync role-based department restrictions when user object is loaded
  useEffect(() => {
    if (userDept) {
      setFormDept(userDept.id);
      setFilterDept(userDept.id);
    }
  }, [userDept]);

  const loadData = async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const targetDept = userDept ? userDept.id : filterDept;
      const [deptRes, stockRes, logRes, sumRes, reqRes] = await Promise.allSettled([
        api.get('/clinical/inventory/departments'),
        api.get('/clinical/inventory/distributed-stock?include_central=true'),
        api.get('/clinical/inventory/consumables', {
          params: { department_id: targetDept || undefined, from: filterFrom || undefined, to: filterTo || undefined },
        }),
        api.get('/clinical/inventory/consumables/summary', {
          params: { department_id: targetDept || undefined }
        }),
        api.get('/clinical/inventory/requisitions'),
      ]);
      if (deptRes.status === 'fulfilled' && deptRes.value.data.success) setDepartments(deptRes.value.data.data || []);
      if (stockRes.status === 'fulfilled' && stockRes.value.data.success) setDistributedStock(stockRes.value.data.data || []);
      if (logRes.status === 'fulfilled' && logRes.value.data.success) setEntries(logRes.value.data.data || []);
      if (sumRes.status === 'fulfilled' && sumRes.value.data.success) setSummary(sumRes.value.data.data);
      if (reqRes.status === 'fulfilled' && reqRes.value.data.success) setRequisitions(reqRes.value.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load consumables data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterDept, filterFrom, filterTo, userDept]);

  // Items available in the selected department (from shared department_stock + stock_batches),
  // aggregated across batches so the picker shows total on-hand per item.
  const deptStockItems = useMemo(() => {
    const activeD = userDept ? userDept.id : formDept;
    if (!activeD) return [];
    const map = new Map();
    for (const row of distributedStock) {
      if (String(row.department_id) !== String(activeD)) continue;
      const key = row.item_id;
      if (!map.has(key)) {
        map.set(key, { item_id: row.item_id, name: row.name, unit: row.unit_of_measure, available: 0 });
      }
      map.get(key).available += Number(row.quantity || 0);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [userDept, formDept, distributedStock]);

  const selectedItem = deptStockItems.find(i => String(i.item_id) === String(formItemId));

  // Is the active department Nursing? (drives the Ward/Session inputs)
  const activeDeptId = userDept ? userDept.id : formDept;
  const isNursingActive = String(activeDeptId) === '121' ||
    (departments.find(d => String(d.id) === String(activeDeptId))?.name || '').toUpperCase() === 'NURSING';

  const filteredStockItems = useMemo(() => {
    if (!formItemSearch.trim()) return deptStockItems;
    const q = formItemSearch.toLowerCase();
    return deptStockItems.filter(i => i.name.toLowerCase().includes(q));
  }, [deptStockItems, formItemSearch]);

  // Consumption history paging — reset to page 1 whenever the data changes.
  useEffect(() => { setHistoryPage(1); }, [entries]);
  const totalHistoryPages = Math.max(1, Math.ceil(entries.length / HISTORY_PAGE_SIZE));
  const pagedEntries = entries.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);

  const currentDeptStock = useMemo(() => {
    if (stockTab === 'central') {
      return distributedStock.filter(row => String(row.department_id) === '130' || row.department === 'GENERAL STORE');
    }
    const activeD = userDept ? userDept.id : filterDept;
    if (!activeD) return [];
    return distributedStock.filter(row => String(row.department_id) === String(activeD));
  }, [userDept, filterDept, distributedStock, stockTab]);

  const filteredDeptStock = useMemo(() => {
    let list = currentDeptStock;
    if (stockSearchTerm.trim()) {
      const q = stockSearchTerm.toLowerCase();
      list = list.filter(row => 
        (row.name && row.name.toLowerCase().includes(q)) || 
        (row.sku && row.sku.toLowerCase().includes(q)) ||
        (row.category && row.category.toLowerCase().includes(q))
      );
    }
    return list;
  }, [currentDeptStock, stockSearchTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const activeD = userDept ? userDept.id : formDept;
    if (!activeD) return toast.error('Select a department.');
    if (!formItemId) return toast.error('Select an item to log.');
    const qty = parseInt(formQty, 10);
    if (!qty || qty <= 0) return toast.error('Enter a quantity greater than 0.');
    if (selectedItem && qty > selectedItem.available) {
      return toast.error(`Only ${selectedItem.available} ${selectedItem.unit || 'unit(s)'} available.`);
    }
    if (isNursingActive && !formWard) {
      return toast.error('Select a ward (Station 1 or Minor Surgery).');
    }

    setSubmitting(true);
    try {
      const res = await api.post('/clinical/inventory/consumables', {
        department_id: parseInt(activeD, 10),
        item_id: parseInt(formItemId, 10),
        quantity: qty,
        notes: formNotes || undefined,
        ward: isNursingActive ? formWard : undefined,
        session: isNursingActive ? formSession : undefined,
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Consumption logged.');
        setFormItemId('');
        setFormItemSearch('');
        setFormQty('');
        setFormNotes('');
        setFormWard('');
        setFormSession(currentSession());
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to log consumption.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Requisitions to Stock Manager ──────────────────────────────────────────
  const activeReqDeptId = userDept ? userDept.id : filterDept;
  const deptRequisitions = useMemo(
    () => requisitions.filter(r => !activeReqDeptId || String(r.department_id) === String(activeReqDeptId)),
    [requisitions, activeReqDeptId]
  );

  const handleAddReqItem = () => {
    const item = deptStockItems.find(i => String(i.item_id) === String(reqItemId));
    if (!item) return toast.error('Select an item to request.');
    const qty = parseInt(reqQty, 10);
    if (!qty || qty <= 0) return toast.error('Enter a quantity greater than 0.');
    if (reqCart.some(c => String(c.item_id) === String(item.item_id))) {
      return toast.error('Item already added — remove it first to change the quantity.');
    }
    setReqCart(prev => [...prev, { item_id: item.item_id, name: item.name, quantity: qty, unit: item.unit }]);
    setReqItemId('');
    setReqQty('');
  };

  const handleRemoveReqItem = (itemId) => setReqCart(prev => prev.filter(c => String(c.item_id) !== String(itemId)));

  const handleSubmitRequisition = async (e) => {
    e.preventDefault();
    const deptId = userDept ? userDept.id : formDept;
    if (!deptId) return toast.error('Select a department.');
    if (reqCart.length === 0) return toast.error('Add at least one item to the requisition.');
    setSubmittingReq(true);
    try {
      const res = await api.post('/clinical/inventory/requisitions', {
        department_id: parseInt(deptId, 10),
        urgency: reqUrgency,
        notes: reqNotes || undefined,
        items: reqCart.map(c => ({ item_id: c.item_id, quantity: c.quantity })),
      });
      if (res.data.success) {
        toast.success('Requisition sent to Stock Manager.');
        setReqCart([]);
        setReqNotes('');
        setReqUrgency('Normal');
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit requisition.');
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleExportConsumablesXlsx = async () => {
    if (entries.length === 0) {
      toast.error('No consumables consumption log data to export.');
      return;
    }

    try {
      toast.loading("Generating consumables Excel workbook...", { id: 'excel-cons-toast' });
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Consumables Log');
      sheet.views = [{ showGridLines: true }];

      // Define Columns widths
      sheet.getColumn(1).width = 22; // Log Date
      sheet.getColumn(2).width = 20; // Department
      sheet.getColumn(3).width = 30; // Item Name
      sheet.getColumn(4).width = 12; // Qty
      sheet.getColumn(5).width = 12; // Unit
      sheet.getColumn(6).width = 18; // Batch#
      sheet.getColumn(7).width = 20; // Logged By
      sheet.getColumn(8).width = 35; // Notes

      // Header Block (Teal branding theme)
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'LEGACY CLINICS & DIAGNOSTICS';
      sheet.mergeCells('A1:H1');
      titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F766E' } }; // Teal-700
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 35;

      const subCell = sheet.getCell('A2');
      subCell.value = 'CONSUMABLES CONSUMPTION REPORT';
      sheet.mergeCells('A2:H2');
      subCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0D9488' } }; // Teal-600
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(2).height = 25;

      // Filter details
      const filterCell = sheet.getCell('A3');
      const deptText = userDept ? userDept.name : (departments.find(d => String(d.id) === String(filterDept))?.name || 'All');
      const fromText = filterFrom ? filterFrom : 'Beginning';
      const toText = filterTo ? filterTo : 'Today';
      filterCell.value = `Export Date: ${new Date().toLocaleDateString()} | Active Filters - Department: ${deptText}, Period: ${fromText} to ${toText}`;
      sheet.mergeCells('A3:H3');
      filterCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: '555555' } };
      filterCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(3).height = 20;

      sheet.getRow(4).height = 15; // Spacer

      // Table Headers
      const headerRow = sheet.getRow(5);
      headerRow.height = 25;
      const headers = ['Log Date', 'Department', 'Item Name', 'Quantity', 'Unit', 'Batch Number', 'Logged By', 'Notes'];
      headers.forEach((h, colIdx) => {
        const cell = headerRow.getCell(colIdx + 1);
        cell.value = h;
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F766E' } };
        cell.alignment = {
          horizontal: colIdx === 3 ? 'right' : 'left',
          vertical: 'middle'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: '0F766E' } },
          bottom: { style: 'medium', color: { argb: '0F766E' } }
        };
      });

      // Data Rows
      let currentRow = 6;
      entries.forEach(e => {
        const r = sheet.getRow(currentRow);
        r.height = 20;
        r.getCell(1).value = new Date(e.consumed_at).toLocaleString();
        r.getCell(2).value = e.department_name || '—';
        r.getCell(3).value = e.item_name;
        r.getCell(4).value = Number(e.quantity);
        r.getCell(5).value = e.unit || '—';
        r.getCell(6).value = e.batch_number || '—';
        r.getCell(7).value = e.logged_by_name || '—';
        r.getCell(8).value = e.notes || '—';

        // Format row
        for (let col = 1; col <= 8; col++) {
          const cell = r.getCell(col);
          cell.font = { name: 'Calibri', size: 10 };
          cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
          if (col === 4) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '#,##0';
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'B91C1C' } }; // Crimson
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        }
        currentRow++;
      });

      // Total Row
      const totalRow = sheet.getRow(currentRow);
      totalRow.height = 25;
      totalRow.getCell(1).value = 'TOTAL CONSUMED';
      sheet.mergeCells(`A${currentRow}:C${currentRow}`);

      totalRow.getCell(4).value = { formula: `=SUM(D6:D${currentRow - 1})` };

      for (let col = 1; col <= 8; col++) {
        const cell = totalRow.getCell(col);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '0F766E' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDFA' } }; // Light teal
        cell.border = {
          top: { style: 'thin', color: { argb: '0F766E' } },
          bottom: { style: 'double', color: { argb: '0F766E' } }
        };
        if (col === 4) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        }
      }

      // Save and Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const filename = `Consumables_Log_${new Date().toISOString().split('T')[0]}`;
      link.download = `${filename}.xlsx`;
      link.click();
      toast.success("Excel exported successfully!", { id: 'excel-cons-toast' });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Excel workbook.", { id: 'excel-cons-toast' });
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
                Record consumable usage per department — synced live with General Store stock.
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
              <p className="text-[10px] text-amber-600 font-black uppercase tracking-wider">
                {userDept ? 'My Department' : 'Departments Active'}
              </p>
              <p className="text-lg font-black text-amber-900 mt-1 truncate">
                {userDept ? userDept.name : summary.by_department.length}
              </p>
              <p className="text-[10px] text-amber-700 font-semibold mt-1">
                {userDept ? 'Logged in view' : 'consuming in last 30d'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-4">
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-wider">Log Entries</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{entries.length}</p>
              <p className="text-[10px] text-slate-700 font-semibold mt-1">shown below</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Log form — full width, on top */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 mb-4">
              <Plus size={18} className="text-teal-600" /> Log Consumption
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Department</label>
                  {userDept ? (
                    <div className="w-full mt-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700">
                      {userDept.name}
                    </div>
                  ) : (
                    <select value={formDept}
                      onChange={(e) => { setFormDept(e.target.value); setFormItemId(''); setFormItemSearch(''); }}
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal-400 focus:bg-white">
                      <option value="">Select department…</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Item (in stock)</label>
                  {!(userDept ? userDept.id : formDept) ? (
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
                        className="w-full mt-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-400">
                        <option value="">Select item…</option>
                        {filteredStockItems.map(i => (
                          <option key={i.item_id} value={i.item_id}>
                            {i.name} — {i.available} {i.unit || ''} avail.
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>

                {isNursingActive && (
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Ward</label>
                    <select value={formWard} onChange={(e) => setFormWard(e.target.value)}
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal-400 focus:bg-white">
                      <option value="">Select ward…</option>
                      <option value="Station 1">Station 1</option>
                      <option value="Minor Surgery">Minor Surgery</option>
                    </select>
                  </div>
                )}

                {isNursingActive && (
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Session</label>
                    <div className="mt-1 flex gap-1.5">
                      {['AM', 'PM'].map((s) => (
                        <button key={s} type="button" onClick={() => setFormSession(s)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${formSession === s ? 'bg-teal-700 text-white border-teal-700' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 font-semibold">AM 07:00–15:00 · PM 15:00–late</p>
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
              </div>

              {/* Availability + submit */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-slate-100">
                {selectedItem && (
                  <div className="flex items-center gap-2 text-xs bg-teal-50 border border-teal-200 rounded-xl px-3 py-2 text-teal-700 font-bold">
                    <Boxes size={14} /> {selectedItem.available} {selectedItem.unit || 'unit(s)'} available
                  </div>
                )}
                <button type="submit" disabled={submitting || !formItemId}
                  className="sm:ml-auto py-3 px-10 bg-teal-700 hover:bg-teal-600 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all">
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <TrendingDown size={15} />} Record Consumption
                </button>
              </div>
            </form>
          </div>

          {/* History and Stock tabs — full width, below the log form */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            {/* Tabs switcher */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 gap-3 flex-wrap">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveSubTab('history')}
                  className={`px-4 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                    activeSubTab === 'history'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                  }`}
                >
                  Consumption History
                </button>
                <button
                  onClick={() => setActiveSubTab('stock')}
                  className={`px-4 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                    activeSubTab === 'stock'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                  }`}
                >
                  Available Items
                </button>
                <button
                  onClick={() => setActiveSubTab('requisitions')}
                  className={`px-4 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeSubTab === 'requisitions'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                  }`}
                >
                  <ArrowRight size={14} /> Requisitions
                </button>
              </div>

              <div className="flex items-center gap-2">
                {activeSubTab === 'history' && (
                  <button
                    onClick={handleExportConsumablesXlsx}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <FileSpreadsheet size={14} />
                    Export Excel
                  </button>
                )}
              </div>
            </div>

            {/* Consumption History Tab */}
            {activeSubTab === 'history' && (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {isAdmin && (
                    <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 outline-none font-semibold">
                      <option value="">All depts</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )}
                  <input type="date" value={filterFrom} max={today()} onChange={(e) => setFilterFrom(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 outline-none font-semibold" />
                  <input type="date" value={filterTo} max={today()} onChange={(e) => setFilterTo(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 outline-none font-semibold" />
                  <button onClick={() => loadData(true)}
                    className="text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg cursor-pointer transition-all">Apply</button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-wider">
                      <tr>
                        <th className="text-left px-3 py-2.5">When</th>
                        <th className="text-left px-3 py-2.5">Department</th>
                        <th className="text-left px-3 py-2.5">Item</th>
                        <th className="text-center px-3 py-2.5">Qty</th>
                        <th className="text-left px-3 py-2.5">Ward / Session</th>
                        <th className="text-left px-3 py-2.5">Batch</th>
                        <th className="text-left px-3 py-2.5">By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedEntries.map((e) => (
                        <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{new Date(e.consumed_at).toLocaleString()}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-700">{e.department_name || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-800">
                            {e.item_name}
                            <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${e.source === 'daily' ? 'bg-indigo-50 text-indigo-600' : e.source === 'audit' ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'}`}>
                              {e.source === 'daily' ? 'Daily Checkup' : e.source === 'audit' ? 'Stock Edit' : 'Log'}
                            </span>
                            {e.notes && <span className="block text-[11px] text-slate-400 font-normal">{e.notes}</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center font-black text-rose-600">
                            {e.source === 'audit' ? <span className="text-slate-400 font-bold">—</span> : `−${e.quantity}`}
                            {e.source !== 'audit' && <span className="ml-1 text-slate-400 font-semibold text-xs">{e.unit || ''}</span>}
                          </td>
                          <td className="px-3 py-2.5 text-[11px]">
                            {e.ward ? <span className="font-bold text-slate-700">{e.ward}</span> : <span className="text-slate-300">—</span>}
                            {e.session && <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">{e.session}</span>}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{e.batch_number || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{e.logged_by_name || '—'}</td>
                        </tr>
                      ))}
                      {entries.length === 0 && (
                        <tr><td colSpan={7} className="px-3 py-10 text-center text-slate-400 italic">No consumption logged for this filter.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination — 15 rows per page */}
                {entries.length > HISTORY_PAGE_SIZE && (
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className="text-slate-500 font-semibold">
                      Showing {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(historyPage * HISTORY_PAGE_SIZE, entries.length)} of {entries.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1}
                        className="px-3 py-1.5 rounded-lg font-bold border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer transition-all">
                        Prev
                      </button>
                      <span className="px-2 font-bold text-slate-600">Page {historyPage} / {totalHistoryPages}</span>
                      <button type="button" onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))} disabled={historyPage >= totalHistoryPages}
                        className="px-3 py-1.5 rounded-lg font-bold border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer transition-all">
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Available Items Tab */}
            {activeSubTab === 'stock' && (
              <>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setStockTab('local')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      stockTab === 'local'
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Local Items
                  </button>
                  <button
                    onClick={() => setStockTab('central')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      stockTab === 'central'
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    General Store Items
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {isAdmin && stockTab === 'local' && (
                    <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 outline-none font-semibold">
                      <option value="">Select department…</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search available items..."
                      value={stockSearchTerm}
                      onChange={(e) => setStockSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-400 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-wider">
                      <tr>
                        <th className="text-left px-3 py-2.5">Items</th>
                        <th className="text-left px-3 py-2.5">Category</th>
                        <th className="text-left px-3 py-2.5">Batch#</th>
                        <th className="text-left px-3 py-2.5">Exp. Date</th>
                        <th className="text-center px-3 py-2.5">Status</th>
                        <th className="text-center px-3 py-2.5">Stock In Hands</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeptStock.map((row) => {
                        const status = getItemStatus(row.expiry_date);
                        return (
                          <tr key={row.dept_stock_id} className="border-t border-slate-100 hover:bg-slate-50/60">
                            <td className="px-3 py-2.5 text-slate-800">
                              <div className="font-bold text-slate-900">{row.name}</div>
                              {row.sku && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{row.sku}</div>}
                            </td>
                            <td className="px-3 py-2.5 text-slate-650 text-xs font-semibold uppercase tracking-tight">
                              {row.category?.replace(/_/g, ' ') || '—'}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{row.batch_number || '—'}</td>
                            <td className="px-3 py-2.5 text-slate-500 text-xs font-medium">
                              {row.expiry_date ? row.expiry_date.split('T')[0] : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${status.color}`}>
                                {status.text}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center font-black text-slate-850 text-sm">
                              {row.quantity} <span className="text-slate-450 font-bold text-xs">{row.unit_of_measure || ''}</span>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredDeptStock.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-10 text-center text-slate-400 italic">
                            {!filterDept && !userDept ? 'Select a department to view available items.' : 'No available items found.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Requisitions Tab */}
            {activeSubTab === 'requisitions' && (
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: Requisition Form */}
                  <div className="w-full lg:w-1/3 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <Send size={16} className="text-teal-600" /> New Requisition
                    </h4>
                    <form onSubmit={handleSubmitRequisition} className="space-y-4">
                      <div>
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Department</label>
                        {userDept ? (
                          <div className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700">
                            {userDept.name}
                          </div>
                        ) : (
                          <select value={formDept}
                            onChange={(e) => { setFormDept(e.target.value); setReqCart([]); }}
                            className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-teal-400">
                            <option value="">Select department…</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        )}
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Add Item</label>
                          <select value={reqItemId} onChange={(e) => setReqItemId(e.target.value)}
                            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-teal-400">
                            <option value="">Select item…</option>
                            {deptStockItems.map(i => (
                              <option key={i.item_id} value={i.item_id}>{i.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Quantity</label>
                            <input type="number" min="1" value={reqQty} onChange={(e) => setReqQty(e.target.value)} placeholder="0"
                              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-teal-400" />
                          </div>
                          <div className="flex items-end">
                            <button type="button" onClick={handleAddReqItem}
                              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer">
                              Add
                            </button>
                          </div>
                        </div>
                      </div>

                      {reqCart.length > 0 && (
                        <div className="bg-teal-50 border border-teal-100 rounded-xl p-3">
                          <h5 className="text-[10px] font-black uppercase text-teal-800 mb-2">Cart ({reqCart.length} items)</h5>
                          <div className="space-y-2">
                            {reqCart.map(c => (
                              <div key={c.item_id} className="flex items-center justify-between bg-white px-2 py-1.5 rounded border border-teal-100">
                                <span className="text-xs font-semibold text-slate-700 truncate">{c.name}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-black text-teal-700">{c.quantity} {c.unit}</span>
                                  <button type="button" onClick={() => handleRemoveReqItem(c.item_id)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Urgency</label>
                          <select value={reqUrgency} onChange={(e) => setReqUrgency(e.target.value)}
                            className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-teal-400">
                            <option value="Normal">Normal</option>
                            <option value="Urgent">Urgent</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Notes</label>
                          <input type="text" value={reqNotes} onChange={(e) => setReqNotes(e.target.value)} placeholder="Optional..."
                            className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400" />
                        </div>
                      </div>

                      <button type="submit" disabled={submittingReq || reqCart.length === 0}
                        className="w-full py-2.5 bg-teal-700 hover:bg-teal-600 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all">
                        {submittingReq ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Submit Requisition
                      </button>
                    </form>
                  </div>

                  {/* Right: Requisition History */}
                  <div className="w-full lg:w-2/3">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <Clock size={16} className="text-teal-600" /> Recent Requisitions
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-wider">
                          <tr>
                            <th className="text-left px-4 py-3">Date</th>
                            <th className="text-left px-4 py-3">Department</th>
                            <th className="text-left px-4 py-3">Items</th>
                            <th className="text-center px-4 py-3">Urgency</th>
                            <th className="text-center px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deptRequisitions.map(req => {
                            let items = [];
                            try { items = typeof req.items === 'string' ? JSON.parse(req.items) : (req.items || []); } catch(e){}
                            return (
                              <tr key={req.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                                <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                                  {new Date(req.created_at).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-700">{req.department_name || '—'}</td>
                                <td className="px-4 py-3 text-xs text-slate-600">
                                  {items.length > 0 ? (
                                    <div className="space-y-1">
                                      {items.map((i, idx) => (
                                        <div key={idx} className="flex gap-2">
                                          <span className="font-semibold text-slate-800">{i.quantity}x</span>
                                          <span className="truncate max-w-[150px]" title={i.item_name || i.name}>{i.item_name || i.name || `Item #${i.item_id}`}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : '—'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${req.urgency === 'Urgent' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {req.urgency || 'Normal'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                                    ${req.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                      req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                      req.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                                      req.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {req.status || 'Pending'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {deptRequisitions.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center text-slate-400 italic">No requisitions found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
