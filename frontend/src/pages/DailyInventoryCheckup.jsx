import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Activity,
  Loader2,
  Search,
  Eye,
  FileSpreadsheet,
  Zap,
  X,
  ChevronDown,
  PackagePlus,
  RotateCw,
  Lock,
  Unlock,
  Download
} from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { Card, Button, Badge } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext';

// Categories and items mapping
const CATEGORIES = {
  injectable: {
    label: "Medications (injectable/IV)",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    items: [
      "Dextrose 50%", "Dextrose 500mg", "Paracetamol IV 1g", "Furosemide", "Adrenaline 1mg",
      "Dexamethasone 8mg", "Dexamethasone 4mg", "Ceftriaxone 1g", "Metronidazole 1g",
      "Tramadol 100mg", "Diclofenac 75mg", "Esomeprazole 40mg", "Normal saline 500mL",
      "Ringer lactate 500mL", "oxytocin inj", "Propofol", "Fentanyl", "ketamine",
      "Pethidine", "MORPHINE", "Midazolam", "Nalaxoan", "Diazepam", "Buscopan 20mg",
      "Marcaine%0.5", "Atropine", "Lidocaine", "Hydrocortisone 100mg", "Phenytoine 250mg",
      "Metoclopramide", "Hydralazine 20-25mg/ml"
    ]
  },
  oral: {
    label: "Oral/Suppository medications",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    items: [
      "Paracetamol 500mg ces", "Paracetamol suppo 250mg", "Paracetamol suppo 125mg",
      "Emitino 4mg", "Vitamine B complex", "Diclofenac suppo 100mg", "Dicynone",
      "Pause 500mg", "chlorpromazine 100mg", "cytotec", "Salbutamol 2.5mg"
    ]
  },
  consumables: {
    label: "Consumables & Surgical supplies",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    items: [
      "Giving set", "Papsmear", "Vaginal swab", "Povidone iodine solution", "Eaux oxygenee",
      "vaseline gauze", "Gauze swab", "vicryl 5/O", "vicryl 4/O", "Vicryl 3/0", "Vicryl 2/o",
      "Ethilon 2/0", "Ethilon 3/0", "Ethilon 4/0", "Ethilon 5/0", "Ethilon 6/0", "monocryl 6/0",
      "surgical blades N23", "Surgical blades N21", "surgical bladeN15", "surgical blade N12",
      "crepes bandage 7.5cm", "Crepe bandage 10cm", "crepe bandage 15cm", "Aquabloc 15×10", "Aquabloc 10×10"
    ]
  },
  syringes: {
    label: "Syringes & Needles",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    items: [
      "water for injection", "Syringe 2ml", "syringe 5ml", "syringe 10ml", "syringe 20ml",
      "needle 23", "needle 21", "needle 18"
    ]
  },
  catheters: {
    label: "Catheters & Drainage",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    items: [
      "Urine drainage bag",
      "Foley balloon catheter fr 10",
      "Foley balloon catheter fr 12",
      "Foley balloon catheter fr 16",
      "Foley balloon catheter fr 18",
      "Foley balloon catheter fr 20",
      "catheter G20",
      "Iv catheter G22",
      "Iv catheter G24",
      "Iv catheter G16",
      "Iv catheter G18"
    ]
  },
  gloves: {
    label: "Gloves",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    items: [
      "sterile gloves no 8CM", "sterile gloves 8", "sterile gloves 7.5", "proper gloves"
    ]
  },
  respiratory: {
    label: "Respiratory",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    items: [
      "neb mask adult", "Neb mask ped"
    ]
  },
  family_planning: {
    label: "Family Planning",
    color: "bg-pink-50 text-pink-700 border-pink-200",
    items: [
      "IUD MIRENA", "CONDOM", "SAYANA", "JADELLE", "MICROGYN"
    ]
  }
};

// Flattened list of all items for lookups
const ALL_ITEMS = Object.values(CATEGORIES).flatMap(c => c.items);

// Dynamic month generation (from March 2026 to Current Month)
const START_MONTH = '2026-03';
const generateMonths = () => {
  const months = [];
  const start = new Date(2026, 2, 1); // March 2026
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  
  let current = new Date(start);
  while (current <= end) {
    const yr = current.getFullYear();
    const mo = String(current.getMonth() + 1).padStart(2, '0');
    months.push(`${yr}-${mo}`);
    current.setMonth(current.getMonth() + 1);
  }
  return months.reverse(); // Newest first
};
const DYNAMIC_MONTHS = generateMonths();
const CURRENT_MONTH_STR = DYNAMIC_MONTHS[0];

const getMonthLabel = (YYYY_MM) => {
  if (!YYYY_MM) return '';
  const [y, m] = YYYY_MM.split('-');
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
};

// Opening balances for April 1, AM session
const APRIL_INITIAL_STOCK = {
  "Dextrose 50%": 34,
  "Paracetamol IV 1g": 12,
  "Adrenaline 1mg": 43,
  "Ceftriaxone 1g": 49,
  "Normal saline 500mL": 46,
  "Propofol": 9,
  "Pethidine": 43,
  "proper gloves": 100,
  "water for injection": 214,
  "syringe 5ml": 180,
  "syringe 10ml": 144,
  "IV catheter G24": 224,
  "sterile gloves 7.5": 78,
  "Salbutamol 2.5mg": 141,
  "IUD MIRENA": 40,
  "CONDOM": 1000
};

export default function DailyInventoryCheckup() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Active state
  const [monthYear, setMonthYear] = useState(CURRENT_MONTH_STR);
  const [currentDay, setCurrentDay] = useState(() => new Date().getDate());
  const [currentSession, setCurrentSession] = useState(() => new Date().getHours() < 13 ? 'AM' : 'PM');

  // Quick Stock Update panel state
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [quickItem, setQuickItem] = useState(null);
  const [quickStock, setQuickStock] = useState('');
  const [quickConsumed, setQuickConsumed] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const quickSearchRef = useRef(null);
  const matrixScrollRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Renders modes: 'focused' (session checkup) or 'matrix' (excel spreadsheet)
  const [viewMode, setViewMode] = useState('focused');
  const [dayRange, setDayRange] = useState('1-10');

  // Database loaded state
  const [allMonthsMap, setAllMonthsMap] = useState(() => {
    const init = {};
    DYNAMIC_MONTHS.forEach(m => init[m] = {});
    return init;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lockStock, setLockStock] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSelectedMonth, setExportSelectedMonth] = useState(monthYear);

  useEffect(() => {
    setExportSelectedMonth(monthYear);
  }, [monthYear]);

  const handleExportExcel = async (selectedMonths) => {
    try {
      const token = localStorage.getItem('token');
      const monthsStr = selectedMonths.join(',');
      
      toast.loading('Generating Excel sheet...');
      
      const response = await fetch(`/api/clinical/inventory/export?months=${monthsStr}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      toast.dismiss();

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Clinical_Stock_Ledger_${monthsStr.replace(/,/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Excel ledger downloaded successfully!');
      setShowExportModal(false);
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error('Failed to export Excel spreadsheet.');
    }
  };

  // Scroll the matrix table to the column of a given day
  const jumpToDay = (day) => {
    const colEl = document.getElementById(`day-col-${day}`);
    const container = matrixScrollRef.current;
    if (!colEl || !container) return;
    // offsetLeft of the th relative to the table, minus the sticky item-name column (240px) + a small margin
    const targetLeft = colEl.offsetLeft - 256;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  };

  // Load inventory from backend on month changes
  const loadInventory = async (isManual = false) => {
    try {
      setLoading(true);
      const promises = DYNAMIC_MONTHS.map(m => api.get(`/clinical/inventory?month_year=${m}`));
      const responses = await Promise.all(promises);

      const allMap = {};
      DYNAMIC_MONTHS.forEach(m => allMap[m] = {});

      const parseRows = (rows, month) => {
        rows.forEach(row => {
          if (!allMap[month][row.item_name]) allMap[month][row.item_name] = {};
          if (!allMap[month][row.item_name][row.day]) allMap[month][row.item_name][row.day] = {};
          allMap[month][row.item_name][row.day][row.session] = row;
        });
      };

      responses.forEach((res, i) => {
        if (res.data.success && res.data.data) {
          parseRows(res.data.data, DYNAMIC_MONTHS[i]);
        }
      });

      // Seed April 1 opening stock values if empty
      Object.entries(APRIL_INITIAL_STOCK).forEach(([item, val]) => {
        if (!allMap['2026-04'][item]) allMap['2026-04'][item] = {};
        if (!allMap['2026-04'][item][1]) allMap['2026-04'][item][1] = {};
        if (!allMap['2026-04'][item][1]['AM']) {
          allMap['2026-04'][item][1]['AM'] = {
            stock_in_hands: val,
            consumed: 0,
            balance: val,
            responsible_name: ''
          };
        }
      });

      setAllMonthsMap(allMap);
      if (isManual) {
        toast.success('Successfully synchronized with the database!');
      }
    } catch (err) {
      console.error('Failed to load inventory data:', err);
      toast.error('Failed to load monthly inventory logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [monthYear]);

  // Handle cell input edits locally
  const handleCellEdit = (itemName, field, val, targetDay = currentDay, targetSession = currentSession) => {
    const cleanVal = field === 'responsible_name' ? val : (parseInt(val, 10) || 0);

    setAllMonthsMap(prev => {
      const monthMap = { ...(prev[monthYear] || {}) };
      if (!monthMap[itemName]) monthMap[itemName] = {};
      if (!monthMap[itemName][targetDay]) monthMap[itemName][targetDay] = {};
      if (!monthMap[itemName][targetDay][targetSession]) {
        const carried = getCarriedStockForMonth(monthYear, itemName, targetDay, targetSession);
        monthMap[itemName][targetDay][targetSession] = {
          stock_in_hands: carried,
          consumed: 0,
          balance: carried,
          responsible_name: ''
        };
      }

      const cell = { ...monthMap[itemName][targetDay][targetSession] };
      cell[field] = cleanVal;

      // Auto balance calculation: balance = stock - consumed
      if (field === 'stock_in_hands' || field === 'consumed') {
        const stock = field === 'stock_in_hands' ? cleanVal : cell.stock_in_hands;
        const cons = field === 'consumed' ? cleanVal : cell.consumed;
        cell.balance = stock - cons;
      }

      monthMap[itemName][targetDay][targetSession] = cell;
      return { ...prev, [monthYear]: monthMap };
    });
  };

  // Bulk save current edits
  const handleSave = async () => {
    try {
      setSaving(true);
      const itemsToSave = [];

      // Collect all mapped cells to save
      const monthMap = allMonthsMap[monthYear] || {};
      Object.keys(monthMap).forEach(itemName => {
        const daysMap = monthMap[itemName];
        Object.keys(daysMap).forEach(d => {
          const sessionsMap = daysMap[d];
          Object.keys(sessionsMap).forEach(s => {
            const cell = sessionsMap[s];
            itemsToSave.push({
              item_name: itemName,
              day: parseInt(d, 10),
              session: s,
              stock_in_hands: cell.stock_in_hands || 0,
              consumed: cell.consumed || 0,
              balance: cell.balance || 0,
              responsible_name: cell.responsible_name || ''
            });
          });
        });
      });

      const res = await api.post('/clinical/inventory/bulk', {
        month_year: monthYear,
        items: itemsToSave
      });

      if (res.data.success) {
        toast.success(`Inventory records for ${monthYear} saved successfully!`, { icon: '💾' });
      }
    } catch (err) {
      console.error('Failed to save inventory:', err);
      toast.error('Failed to submit inventory update.');
    } finally {
      setSaving(false);
    }
  };

  // Quick Update: save a single item for today's session immediately
  const saveQuickUpdate = async () => {
    if (!quickItem) return toast.error('Please select an item first.');
    const stockVal = parseInt(quickStock, 10) || 0;
    const consumedVal = parseInt(quickConsumed, 10) || 0;
    const balanceVal = stockVal - consumedVal;
    const today = new Date().getDate();
    const session = new Date().getHours() < 13 ? 'AM' : 'PM';
    const nowMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    // Update local map too
    handleCellEdit(quickItem, 'stock_in_hands', stockVal);
    handleCellEdit(quickItem, 'consumed', consumedVal);
    if (quickNote) handleCellEdit(quickItem, 'responsible_name', quickNote);

    try {
      setQuickSaving(true);
      await api.post('/clinical/inventory/bulk', {
        month_year: nowMonth,
        items: [{
          item_name: quickItem,
          day: today,
          session,
          stock_in_hands: stockVal,
          consumed: consumedVal,
          balance: balanceVal,
          responsible_name: quickNote || user?.name || ''
        }]
      });
      toast.success(`✅ ${quickItem} updated — Balance: ${balanceVal}`, { duration: 3000 });
      setQuickItem(null);
      setQuickStock('');
      setQuickConsumed('');
      setQuickNote('');
      setQuickSearch('');
    } catch (err) {
      toast.error('Failed to save stock update.');
    } finally {
      setQuickSaving(false);
    }
  };

  // Cache to optimize reactive cell propagation during this render pass
  const cellCache = {};

  // Get ending balance of a given month
  const getMonthEndingBalance = (month, item) => {
    // Determine last day dynamically
    const [y, m] = month.split('-');
    const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();

    // Scan backwards from lastDay down to 1
    for (let d = lastDay; d >= 1; d--) {
      const pmCell = getCellForMonth(month, item, d, 'PM');
      if (pmCell.balance !== '' && pmCell.balance !== undefined && !isNaN(pmCell.balance)) {
        return pmCell.balance;
      }
      const amCell = getCellForMonth(month, item, d, 'AM');
      if (amCell.balance !== '' && amCell.balance !== undefined && !isNaN(amCell.balance)) {
        return amCell.balance;
      }
    }
    return null;
  };

  const getCarriedStockForMonth = (month, item, day, session) => {
    // 1. Day 1 AM: carry from previous month's ending balance
    if (day === 1 && session === 'AM') {
      const idx = DYNAMIC_MONTHS.indexOf(month);
      const prevMonth = idx >= 0 && idx + 1 < DYNAMIC_MONTHS.length ? DYNAMIC_MONTHS[idx + 1] : null;
      
      if (prevMonth) {
        const prevBalance = getMonthEndingBalance(prevMonth, item);
        if (prevBalance !== null && prevBalance !== undefined) {
          return prevBalance;
        }
      }
      if (month === '2026-04') {
        return APRIL_INITIAL_STOCK[item] || 0;
      }
      return 0;
    }

    // 2. PM session: carry from the same day's AM balance
    if (session === 'PM') {
      const amCell = getCellForMonth(month, item, day, 'AM');
      return amCell.balance !== '' ? amCell.balance : 0;
    }

    // 3. AM session on Day > 1: carry from previous day's PM balance
    if (session === 'AM' && day > 1) {
      const pmCell = getCellForMonth(month, item, day - 1, 'PM');
      return pmCell.balance !== '' ? pmCell.balance : 0;
    }

    return 0;
  };

  const getCellForMonth = (month, item, day, session) => {
    const cacheKey = `${month}-${item}-${day}-${session}`;
    if (cellCache[cacheKey] !== undefined) {
      return cellCache[cacheKey];
    }

    const record = allMonthsMap[month]?.[item]?.[day]?.[session];

    // Resolve stock in hand: explicitly typed value or dynamic carry-over
    let stock = 0;
    if (record && record.stock_in_hands !== undefined && record.stock_in_hands !== '') {
      stock = record.stock_in_hands;
    } else {
      stock = getCarriedStockForMonth(month, item, day, session);
    }

    // Resolve consumed
    const consumed = (record && record.consumed !== undefined && record.consumed !== '') ? record.consumed : 0;

    // Resolve balance: stock - consumed
    const balance = stock - consumed;

    const result = {
      stock_in_hands: stock,
      consumed: consumed,
      balance: balance,
      responsible_name: record?.responsible_name || ''
    };

    cellCache[cacheKey] = result;
    return result;
  };

  // Helper to resolve cell attributes safely
  const getCell = (item, day = currentDay, session = currentSession) => {
    return getCellForMonth(monthYear, item, day, session);
  };

  // Get active days based on range selection
  const getDaysForRange = () => {
    const [y, m] = monthYear.split('-');
    const daysInMonth = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();

    if (dayRange === '1-10') return Array.from({ length: 10 }).map((_, i) => i + 1);
    if (dayRange === '11-20') return Array.from({ length: 10 }).map((_, i) => i + 11);
    if (dayRange === '21-30') {
      const len = daysInMonth - 20;
      return Array.from({ length: len }).map((_, i) => i + 21);
    }
    return Array.from({ length: daysInMonth }).map((_, i) => i + 1); // 'all'
  };
  const activeDays = getDaysForRange();

  // Renders the session focus checkup list
  const filteredItems = ALL_ITEMS.filter(item => {
    // 1. Filter by category
    if (selectedCategory !== 'all') {
      const match = CATEGORIES[selectedCategory]?.items.includes(item);
      if (!match) return false;
    }
    // 2. Filter by search query
    if (searchTerm) {
      return item.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans pb-12">
      <style>{`
        /* Remove number input spinners */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
        /* Custom thin scrollbars */
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>

      {/* ── Top Header Navigation Bar ── */}
      <div className="bg-white/80 backdrop-blur border-b sticky top-0 z-30 shadow-sm px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/nursing-hub')}
            className="flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-sky-100 text-sky-600 rounded-xl"><Activity size={18} /></span>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">Daily Stock Checkup</h1>
            </div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Monthly Stock {getMonthLabel(monthYear)} Inventory Node</p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2 select-none">
          {/* Month Selector */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
            <select
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              className="bg-transparent border-none text-xs font-black text-slate-700 outline-none px-3 py-1.5 cursor-pointer"
            >
              {DYNAMIC_MONTHS.map(m => (
                <option key={m} value={m}>{getMonthLabel(m)}</option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
            <button
              onClick={() => setViewMode('focused')}
              className={`flex items-center text-xs font-black px-3.5 py-1.5 rounded-lg transition-all ${viewMode === 'focused' ? 'bg-[#0369a1] text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" /> Session Focus
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center text-xs font-black px-3.5 py-1.5 rounded-lg transition-all ${viewMode === 'matrix' ? 'bg-[#0369a1] text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Full Spreadsheet
            </button>
          </div>

          {/* Export Excel Button with Organic Dropdown Flyout */}
          <div className="relative">
            <Button
              disabled={loading}
              onClick={() => setShowExportModal(!showExportModal)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 border-0 transition-all active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              Export Ledger
            </Button>

            {showExportModal && (
              <>
                {/* Backdrop overlay for organic click-away closure */}
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setShowExportModal(false)}
                />
                
                {/* Expanding Option Card */}
                <div className="absolute right-0 top-full mt-2.5 w-[360px] bg-white border border-slate-200/80 shadow-2xl rounded-3xl p-5 z-50 origin-top-right transform animate-in fade-in slide-in-from-top-4 duration-200 ease-out select-none">
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><FileSpreadsheet size={15} /></span>
                      <h3 className="text-xs font-black text-slate-800 tracking-tight">Export Excel Ledger</h3>
                    </div>
                    <button 
                      onClick={() => setShowExportModal(false)}
                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Options */}
                  <div className="space-y-4 text-left">
                    <p className="text-[10px] text-slate-500 font-bold leading-normal">
                      Export high-fidelity spreadsheets with reactive formulas. Select a single month, or bundle every recorded period as dedicated tabs in a single workbook.
                    </p>

                    {/* Option 1: Selected Month */}
                    <div className="space-y-2 p-3 bg-slate-50 border border-slate-150 rounded-2xl">
                      <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Option 1: Export Specific Month</div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200/80 shadow-sm flex items-center">
                          <select
                            value={exportSelectedMonth}
                            onChange={(e) => setExportSelectedMonth(e.target.value)}
                            className="bg-transparent border-none text-[11px] font-black text-slate-700 outline-none w-full cursor-pointer py-0.5"
                          >
                            {DYNAMIC_MONTHS.map(m => (
                              <option key={m} value={m}>{getMonthLabel(m)}</option>
                            ))}
                          </select>
                        </div>
                        <Button
                          onClick={() => {
                            handleExportExcel([exportSelectedMonth]);
                            setShowExportModal(false);
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl font-extrabold text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1 transition-all active:scale-[0.97] border-0"
                        >
                          <Download className="h-3 w-3" />
                          Get
                        </Button>
                      </div>
                    </div>

                    {/* Option 2: Download All */}
                    <div className="space-y-2 p-3 bg-gradient-to-br from-indigo-50/30 to-purple-50/30 border border-indigo-100/50 rounded-2xl">
                      <div className="text-[9px] font-black uppercase text-indigo-600 tracking-wider">Option 2: Consolidated Ledger</div>
                      <Button
                        onClick={() => {
                          handleExportExcel(DYNAMIC_MONTHS);
                          setShowExportModal(false);
                        }}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md flex items-center justify-center gap-1.5 border-0 transition-all active:scale-[0.98]"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        Download All Sheets
                      </Button>
                    </div>
                  </div>

                </div>
              </>
            )}
          </div>

          {/* Sync Button */}
          <Button
            disabled={saving || loading}
            onClick={() => loadInventory(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 border-0 transition-all active:scale-[0.98]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
            Sync with DB
          </Button>

          {/* Lock Stock Toggle */}
          <Button
            disabled={loading}
            onClick={() => {
              setLockStock(!lockStock);
              if (lockStock) {
                toast.success('Stock in hand editing UNLOCKED. Edit carefully!');
              } else {
                toast.success('Stock in hand editing LOCKED.');
              }
            }}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 border transition-all active:scale-[0.98] ${!lockStock ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}
          >
            {lockStock ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            {lockStock ? 'Stock: Locked' : 'Stock: Editable'}
          </Button>

          {/* Save Button */}
          <Button
            disabled={saving || loading}
            onClick={handleSave}
            className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 border-0 transition-all active:scale-[0.98]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 mt-6">
        {loading ? (
          <div className="flex h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-[#0369a1]" />
              <span className="text-xs font-bold text-slate-500">Querying database Inventory Logs...</span>
            </div>
          </div>
        ) : viewMode === 'focused' ? (
          /* ── 1. SINGLE SESSION FOCUS MODE ── */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 align-start select-none">

            {/* Left Nav Pane: Session Selector */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="p-6 border border-slate-200/60 shadow-sm bg-white rounded-[24px]">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-4">Audit Session Selector</h3>

                {/* AM/PM Switcher */}
                <div className="flex bg-slate-100/80 p-1.5 rounded-2xl mb-6">
                  <button
                    onClick={() => setCurrentSession('AM')}
                    className={`flex-1 py-2.5 text-xs font-black rounded-xl uppercase transition-all ${currentSession === 'AM' ? 'bg-[#0369a1] text-white shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    AM Session ☀️
                  </button>
                  <button
                    onClick={() => setCurrentSession('PM')}
                    className={`flex-1 py-2.5 text-xs font-black rounded-xl uppercase transition-all ${currentSession === 'PM' ? 'bg-[#0369a1] text-white shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    PM Session 🌙
                  </button>
                </div>

                {/* Day selector list */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center gap-1.5 border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Audit Day Selector</span>
                    
                    {/* Week Segmented Tabs */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/40 text-[9px] font-black select-none shrink-0">
                      {[1, 2, 3, 4].map((wk) => {
                        const isCurrentWk = 
                          (wk === 1 && currentDay <= 7) ||
                          (wk === 2 && currentDay >= 8 && currentDay <= 14) ||
                          (wk === 3 && currentDay >= 15 && currentDay <= 21) ||
                          (wk === 4 && currentDay >= 22);
                        
                        return (
                          <button
                            key={wk}
                            onClick={() => {
                              const targetDay = wk === 4 ? 22 : (wk - 1) * 7 + 1;
                              setCurrentDay(targetDay);
                            }}
                            className={`px-1.5 py-0.5 rounded transition-all ${
                              isCurrentWk 
                                ? 'bg-white text-slate-900 shadow-sm font-black' 
                                : 'text-slate-400 hover:text-slate-650'
                            }`}
                            title={`Week ${wk}`}
                          >
                            W{wk}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Render only active week's days */}
                  <div className="grid grid-cols-7 gap-1">
                    {(() => {
                      const currentWk = 
                        currentDay <= 7 ? 1 :
                        currentDay <= 14 ? 2 :
                        currentDay <= 21 ? 3 : 4;
                      
                      const startDay = currentWk === 4 ? 22 : (currentWk - 1) * 7 + 1;
                      const endDay = currentWk === 4 ? 30 : currentWk * 7;
                      
                      const days = [];
                      for (let d = startDay; d <= endDay; d++) {
                        days.push(d);
                      }
                      
                      return days.map((dNum) => {
                        const isSelected = currentDay === dNum;
                        return (
                          <button
                            key={dNum}
                            onClick={() => setCurrentDay(dNum)}
                            className={`h-8 text-xs font-bold rounded-lg transition-all border flex items-center justify-center relative active:scale-95 ${
                              isSelected 
                                ? 'bg-[#0369a1] border-transparent text-white font-black shadow-sm' 
                                : 'bg-white border-slate-200/80 text-slate-650 hover:bg-slate-50 hover:border-slate-350'
                            }`}
                          >
                            {dNum}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Session Card Overview */}
                <div className="mt-6 border-t border-dashed border-slate-200 pt-6">
                  <div className="bg-gradient-to-br from-sky-50 to-blue-50/50 border border-sky-100/80 rounded-2xl p-4 text-center">
                    <span className="text-[9px] font-black uppercase tracking-wider text-sky-600 bg-sky-100/50 px-2 py-0.5 rounded border border-sky-200/40 inline-block mb-2">Selected Period</span>
                    <h4 className="text-xl font-black text-sky-950 leading-none">Day {currentDay} {currentSession}</h4>
                    <p className="text-[9px] text-sky-700/80 font-bold mt-1 uppercase tracking-widest">{getMonthLabel(monthYear)}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Pane: Inventory Items Table */}
            <div className="lg:col-span-3 space-y-6">
              <Card className="p-6 border border-slate-200/60 shadow-sm bg-white rounded-[24px]">

                {/* Search & Category Filter Bar */}
                <div className="flex flex-col gap-4 pb-4 border-b border-dashed border-slate-100">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-72">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Search size={15} /></span>
                      <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search items..."
                        className="w-full pl-10 pr-4 py-2 text-xs font-bold text-slate-700 placeholder-slate-400 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:bg-white transition-all shadow-sm"
                      />
                    </div>

                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      {filteredItems.length} items found
                    </div>
                  </div>

                  {/* Category badged pills list */}
                  <div className="flex flex-wrap gap-1.5 w-full">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all ${
                        selectedCategory === 'all' 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      All Items 📋
                    </button>
                    {Object.entries(CATEGORIES).map(([key, cat]) => {
                      const isSelected = selectedCategory === key;
                      const niceLabel = 
                        key === 'injectable' ? 'Injectables 💉' :
                        key === 'oral' ? 'Oral 💊' :
                        key === 'consumables' ? 'Supplies 📦' :
                        key === 'syringes' ? 'Syringes 🧪' :
                        key === 'catheters' ? 'Catheters 🩸' :
                        key === 'gloves' ? 'Gloves 🧤' :
                        key === 'respiratory' ? 'Respiratory 🫁' :
                        key === 'family_planning' ? 'Planning 🌸' : key;
                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedCategory(key)}
                          className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all ${
                            isSelected 
                              ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {niceLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Main Session Focused Table */}
                <div className="overflow-x-auto mt-4 custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3.5 px-4 w-[280px]">Items</th>
                        <th className="py-3.5 px-4 text-center w-[120px]">Stock in hands</th>
                        <th className="py-3.5 px-4 text-center w-[120px]">Consumed items</th>
                        <th className="py-3.5 px-4 text-center w-[120px]">Balance</th>
                        <th className="py-3.5 px-4">Responsible Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {filteredItems.length > 0 ? (
                        filteredItems.map(item => {
                          const cell = getCell(item);

                          // Determine item category color
                          const catKey = Object.keys(CATEGORIES).find(k => CATEGORIES[k].items.includes(item)) || 'injectable';
                          
                          // Exquisite dot indicator styles
                          const dotColor = 
                            catKey === 'injectable' ? 'bg-blue-500 ring-blue-100' :
                            catKey === 'oral' ? 'bg-emerald-500 ring-emerald-100' :
                            catKey === 'consumables' ? 'bg-amber-500 ring-amber-100' :
                            catKey === 'syringes' ? 'bg-purple-500 ring-purple-100' :
                            catKey === 'catheters' ? 'bg-rose-500 ring-rose-100' :
                            catKey === 'gloves' ? 'bg-teal-500 ring-teal-100' :
                            catKey === 'respiratory' ? 'bg-cyan-500 ring-cyan-100' : 'bg-pink-500 ring-pink-100';

                          return (
                            <tr key={item} className="hover:bg-slate-50/40 transition-all align-center">
                              {/* Item label */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ring-4 ${dotColor}`} />
                                  <div className="text-slate-900 font-black text-[13px] tracking-tight">{item}</div>
                                </div>
                              </td>

                              {/* Stock in hands input */}
                              <td className="py-3 px-4 text-center">
                                <input
                                  value={cell.stock_in_hands}
                                  onChange={(e) => handleCellEdit(item, 'stock_in_hands', e.target.value)}
                                  placeholder="0"
                                  className={`w-20 text-center py-1.5 px-2 border rounded-xl outline-none font-black text-xs transition-all shadow-sm ${
                                    lockStock 
                                      ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed select-none' 
                                      : 'bg-white border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-slate-900'
                                  }`}
                                  type="number"
                                  disabled={lockStock}
                                />
                              </td>

                              {/* Consumed items input */}
                              <td className="py-3 px-4 text-center">
                                <input
                                  value={cell.consumed}
                                  onChange={(e) => handleCellEdit(item, 'consumed', e.target.value)}
                                  placeholder="0"
                                  className="w-20 text-center py-1.5 px-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none font-black text-xs transition-all shadow-sm"
                                  type="number"
                                />
                              </td>

                              {/* Balance view (formula stock - consumed) */}
                              <td className="py-3 px-4 text-center">
                                <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg border shadow-sm ${
                                  cell.balance < 0 
                                    ? 'bg-red-50 text-red-600 border-red-100 ring-1 ring-red-50' 
                                    : 'bg-slate-50 text-slate-700 border-slate-200/80'
                                }`}>
                                  {cell.balance !== '' ? cell.balance : 0}
                                </span>
                              </td>

                              {/* Responsible Name input */}
                              <td className="py-3 px-4">
                                <input
                                  value={cell.responsible_name || ''}
                                  onChange={(e) => handleCellEdit(item, 'responsible_name', e.target.value)}
                                  placeholder="RN Signature"
                                  className="w-full max-w-[200px] py-1.5 px-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-xs font-semibold shadow-sm transition-all"
                                />
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                            No matching items found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          /* ── 2. FULL MONTH MATRIX EXCEL SPREADSHEET ── */
          <Card className="p-6 border border-slate-200 shadow bg-white rounded-[24px] overflow-hidden">
            <div className="mb-4 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest">Interactive Audit Grid</h3>
                <p className="text-[11px] text-blue-700/80 font-bold mt-1">Full month horizontal spreadsheet checkup for {getMonthLabel(monthYear)}. Scroll horizontally to audit cell states.</p>
              </div>
              <span className="text-[10px] font-extrabold uppercase bg-blue-100 border border-blue-200 px-3 py-1 rounded text-blue-800">
                Formula Reconciled: Balance = Stock - Consumed
              </span>
            </div>

            {/* ── Day range pagination & Jump to Day bar ── */}
            {(() => {
              const [y, m] = monthYear.split('-');
              const daysInMonth = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
              return (
                <div className="mb-4 flex flex-wrap justify-between items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 select-none">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Spreadsheet Columns Range</span>
                    <div className="flex bg-slate-200/60 p-1 rounded-xl border border-slate-300/30">
                      {[
                        { label: 'Days 1 – 10', value: '1-10' },
                        { label: 'Days 11 – 20', value: '11-20' },
                        { label: `Days 21 – ${daysInMonth}`, value: '21-30' },
                        { label: 'Full Month (Slow ⚠️)', value: 'all' },
                      ].map((range) => (
                        <button
                          key={range.value}
                          onClick={() => setDayRange(range.value)}
                          className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${dayRange === range.value ? 'bg-[#0369a1] text-white shadow-sm font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Jump to Day bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0 mr-1">Jump to Day:</span>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const dNum = parseInt(val, 10);
                          // Automatically switch to correct dayRange block first
                          if (dNum <= 10) setDayRange('1-10');
                          else if (dNum <= 20) setDayRange('11-20');
                          else setDayRange('21-30');
                          
                          // Wait for render cycle, then jump
                          setTimeout(() => jumpToDay(dNum), 150);
                        }
                        e.target.value = ''; // Reset select after jump
                      }}
                      className="bg-white border border-slate-200 text-slate-700 text-xs font-black rounded-xl px-3 py-1.5 outline-none hover:bg-slate-50 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all cursor-pointer shadow-sm"
                    >
                      <option value="">-- Select Day --</option>
                      {Array.from({ length: daysInMonth }).map((_, idx) => {
                        const d = idx + 1;
                        const isToday = d === new Date().getDate() && monthYear === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                        return (
                          <option key={d} value={d}>
                            Day {d} {isToday ? '(Today)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              );
            })()}

            {/* Matrix horizontal scroll container */}
            <div ref={matrixScrollRef} className="overflow-x-auto max-h-[70vh] border border-slate-200 rounded-2xl relative">
              <table 
                className="border-collapse text-[10px] text-left text-slate-600"
                style={{ minWidth: dayRange === 'all' ? '5000px' : `${activeDays.length * 165 + 260}px` }}
              >
                {/* Row 1 Header: Title + Day numbers repeating */}
                <thead>
                  <tr className="bg-slate-800 text-white font-extrabold select-none h-10">
                    <th className="sticky left-0 bg-slate-800 border-r border-slate-700 px-4 text-[11px] font-black z-20 w-[240px]">
                      MONTHLY STOCK {getMonthLabel(monthYear)}
                    </th>
                    <th className="border-r border-slate-700 px-2 text-center w-8">
                      {/* Spacer */}
                    </th>
                    {activeDays.map((d) => {
                      return (
                        <React.Fragment key={d}>
                          <th id={`day-col-${d}`} colSpan={4} className="border-r border-slate-700 text-center font-black uppercase text-[10px] tracking-wider bg-slate-700/50">
                            Day {d} (AM)
                          </th>
                          <th colSpan={4} className="border-r border-slate-700 text-center font-black uppercase text-[10px] tracking-wider bg-slate-700">
                            Day {d} (PM)
                          </th>
                          {/* Blank spacer column */}
                          <th className="border-r border-slate-700 w-3 bg-slate-900"></th>
                        </React.Fragment>
                      );
                    })}
                  </tr>

                  {/* Row 2 Header: Stock Daily Check-up + Session labels merged */}
                  <tr className="bg-[#00B0F0] text-white font-black text-center h-10 select-none border-b border-sky-400">
                    <th className="sticky left-0 bg-[#00B0F0] border-r border-sky-400 px-4 text-left z-20">
                      STOCK DAILY CHECK-UP
                    </th>
                    <th className="border-r border-sky-400">
                      {/* Spacer */}
                    </th>
                    {activeDays.map((d) => {
                      return (
                        <React.Fragment key={d}>
                          <th colSpan={4} className="border-r border-sky-400 bg-sky-600 uppercase text-[9px] tracking-widest text-sky-100 font-extrabold">
                            AM CONS
                          </th>
                          <th colSpan={4} className="border-r border-sky-400 bg-sky-700 uppercase text-[9px] tracking-widest text-sky-100 font-extrabold">
                            PM CONS
                          </th>
                          <th className="border-r border-sky-400 w-3 bg-slate-900"></th>
                        </React.Fragment>
                      );
                    })}
                  </tr>

                  {/* Row 3 Header: Column definitions tall h = 81pt/80px */}
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 h-[64px] align-bottom select-none">
                    <th className="sticky left-0 bg-slate-100 border-r border-slate-300 px-4 pb-2 text-[10px] font-black z-20">
                      ITEMS
                    </th>
                    <th className="border-r border-slate-300 w-8 px-1 pb-2 text-center text-slate-400 font-bold">
                      SPC
                    </th>
                    {activeDays.map((d) => {
                      return (
                        <React.Fragment key={d}>
                          {/* AM sub columns */}
                          <th className="border-r border-slate-200 px-2 pb-2 text-center font-bold font-mono text-[9px] w-[55px] hover:bg-slate-200/50">Stock</th>
                          <th className="border-r border-slate-200 px-2 pb-2 text-center font-bold font-mono text-[9px] w-[55px] hover:bg-slate-200/50">Cons</th>
                          <th className="border-r border-slate-200 px-2 pb-2 text-center font-bold font-mono text-[9px] w-[55px] hover:bg-slate-200/50">Bal</th>
                          <th className="border-r border-slate-300 px-2 pb-2 text-center font-bold text-[9px] w-[110px] hover:bg-slate-200/50">Nurse</th>

                          {/* PM sub columns */}
                          <th className="border-r border-slate-200 px-2 pb-2 text-center font-bold font-mono text-[9px] w-[55px] hover:bg-slate-200/50">Stock</th>
                          <th className="border-r border-slate-200 px-2 pb-2 text-center font-bold font-mono text-[9px] w-[55px] hover:bg-slate-200/50">Cons</th>
                          <th className="border-r border-slate-200 px-2 pb-2 text-center font-bold font-mono text-[9px] w-[55px] hover:bg-slate-200/50">Bal</th>
                          <th className="border-r border-slate-300 px-2 pb-2 text-center font-bold text-[9px] w-[110px] hover:bg-slate-200/50">Nurse</th>

                          <th className="border-r border-slate-300 w-3 bg-slate-900"></th>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                </thead>

                {/* Spreadsheet Body */}
                <tbody className="divide-y divide-slate-200 bg-white font-bold text-slate-800">
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item, rIdx) => (
                      <tr key={item} className="hover:bg-slate-50 h-10 select-none align-middle">
                        {/* Column A (ITEMS) - Frozen left */}
                        <td className="sticky left-0 bg-white border-r border-slate-300 px-4 font-black z-10 text-[11px] shadow-[2px_0_5px_rgba(0,0,0,0.05)] w-[240px]">
                          {item}
                        </td>
                        {/* Column B (Spacer column) */}
                        <td className="border-r border-slate-300 w-8 bg-slate-50 text-center font-bold text-slate-300">
                          {ALL_ITEMS.indexOf(item) + 1}
                        </td>
                        {/* All Day Columns */}
                        {activeDays.map((d) => {
                          const cellAM = getCell(item, d, 'AM');
                          const cellPM = getCell(item, d, 'PM');

                          return (
                            <React.Fragment key={d}>
                              {/* AM Session inputs */}
                              <td className={`border-r border-slate-200 p-0 text-center font-mono ${lockStock ? 'bg-slate-100/50' : ''}`}>
                                <input
                                  value={cellAM.stock_in_hands || ''}
                                  onChange={(e) => {
                                    setCurrentDay(d);
                                    setCurrentSession('AM');
                                    handleCellEdit(item, 'stock_in_hands', e.target.value, d, 'AM');
                                  }}
                                  placeholder="0"
                                  className={`w-full text-center h-8 outline-none text-[10px] font-extrabold transition-all ${lockStock ? 'text-slate-400 cursor-not-allowed select-none' : 'bg-transparent text-slate-900 focus:bg-sky-50'}`}
                                  disabled={lockStock}
                                />
                              </td>
                              <td className="border-r border-slate-200 p-0 text-center font-mono">
                                <input
                                  value={cellAM.consumed || ''}
                                  onChange={(e) => {
                                    setCurrentDay(d);
                                    setCurrentSession('AM');
                                    handleCellEdit(item, 'consumed', e.target.value, d, 'AM');
                                  }}
                                  placeholder="0"
                                  className="w-full text-center h-8 bg-transparent border-none outline-none text-[10px] font-extrabold focus:bg-sky-50"
                                />
                              </td>
                              <td className={`border-r border-slate-200 px-1 text-center font-mono select-none ${cellAM.balance < 0 ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-50/50'}`}>
                                {cellAM.balance !== '' ? cellAM.balance : 0}
                              </td>
                              <td className="border-r border-slate-300 p-0">
                                <input
                                  value={cellAM.responsible_name || ''}
                                  onChange={(e) => {
                                    setCurrentDay(d);
                                    setCurrentSession('AM');
                                    handleCellEdit(item, 'responsible_name', e.target.value, d, 'AM');
                                  }}
                                  placeholder="RN"
                                  className="w-full px-2 h-8 bg-transparent border-none outline-none text-[9px] focus:bg-sky-50"
                                />
                              </td>

                              {/* PM Session inputs */}
                              <td className={`border-r border-slate-200 p-0 text-center font-mono ${lockStock ? 'bg-slate-100/50' : ''}`}>
                                <input
                                  value={cellPM.stock_in_hands || ''}
                                  onChange={(e) => {
                                    setCurrentDay(d);
                                    setCurrentSession('PM');
                                    handleCellEdit(item, 'stock_in_hands', e.target.value, d, 'PM');
                                  }}
                                  placeholder="0"
                                  className={`w-full text-center h-8 outline-none text-[10px] font-extrabold transition-all ${lockStock ? 'text-slate-400 cursor-not-allowed select-none' : 'bg-transparent text-slate-900 focus:bg-sky-50'}`}
                                  disabled={lockStock}
                                />
                              </td>
                              <td className="border-r border-slate-200 p-0 text-center font-mono">
                                <input
                                  value={cellPM.consumed || ''}
                                  onChange={(e) => {
                                    setCurrentDay(d);
                                    setCurrentSession('PM');
                                    handleCellEdit(item, 'consumed', e.target.value, d, 'PM');
                                  }}
                                  placeholder="0"
                                  className="w-full text-center h-8 bg-transparent border-none outline-none text-[10px] font-extrabold focus:bg-sky-50"
                                />
                              </td>
                              <td className={`border-r border-slate-200 px-1 text-center font-mono select-none ${cellPM.balance < 0 ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-50/50'}`}>
                                {cellPM.balance !== '' ? cellPM.balance : 0}
                              </td>
                              <td className="border-r border-slate-300 p-0">
                                <input
                                  value={cellPM.responsible_name || ''}
                                  onChange={(e) => {
                                    setCurrentDay(d);
                                    setCurrentSession('PM');
                                    handleCellEdit(item, 'responsible_name', e.target.value, d, 'PM');
                                  }}
                                  placeholder="RN"
                                  className="w-full px-2 h-8 bg-transparent border-none outline-none text-[9px] focus:bg-sky-50"
                                />
                              </td>

                              {/* Blank spacer column */}
                              <td className="border-r border-slate-300 w-3 bg-slate-900 select-none"></td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={activeDays.length * 9 + 2} className="py-12 text-center text-slate-400 font-bold text-sm">
                        No matching items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* ── Quick Stock Update FAB ── */}
      <button
        onClick={() => { setQuickOpen(true); setTimeout(() => quickSearchRef.current?.focus(), 100); }}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#0369a1',
          color: '#fff',
          padding: '14px 22px',
          borderRadius: '999px',
          fontWeight: 900,
          fontSize: '0.8rem',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          boxShadow: '0 8px 30px rgba(3,105,161,0.4)',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        className="hover:scale-105 hover:shadow-2xl"
      >
        <PackagePlus size={17} />
        Quick Stock Update
      </button>

      {/* ── Quick Update Slide-in Drawer ── */}
      {quickOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end'
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setQuickOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(2px)' }}
          />

          {/* Panel */}
          <div
            style={{
              position: 'relative',
              width: '420px',
              maxWidth: '95vw',
              height: '100vh',
              background: '#fff',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.25s ease'
            }}
          >
            <style>{`@keyframes slideInRight { from { transform: translateX(60px); opacity:0; } to { transform: translateX(0); opacity:1; } }`}</style>

            {/* Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,#075985,#0369a1)', color: '#fff' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={18} />
                  <span style={{ fontWeight: 900, fontSize: '1rem' }}>Quick Stock Update</span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: '#bae6fd', fontWeight: 600 }}>
                  Today · Day {new Date().getDate()} · {new Date().getHours() < 13 ? 'AM' : 'PM'} Session
                </p>
              </div>
              <button onClick={() => setQuickOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: '#fff' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Item Search */}
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Search Item
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    ref={quickSearchRef}
                    value={quickSearch}
                    onChange={e => { setQuickSearch(e.target.value); setQuickItem(null); }}
                    placeholder="Type to search drugs or consumables..."
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '10px 12px 10px 36px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Dropdown Results */}
                {quickSearch.length >= 2 && !quickItem && (() => {
                  const results = ALL_ITEMS.filter(i => i.toLowerCase().includes(quickSearch.toLowerCase())).slice(0, 8);
                  return results.length > 0 ? (
                    <div style={{ marginTop: '6px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                      {results.map(i => {
                        const catKey = Object.keys(CATEGORIES).find(k => CATEGORIES[k].items.includes(i));
                        const catLabel = CATEGORIES[catKey]?.label || '';
                        return (
                          <button
                            key={i}
                            onClick={() => { setQuickItem(i); setQuickSearch(i); }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                            className="hover:bg-sky-50"
                          >
                            <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1e293b' }}>{i}</div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, marginTop: '1px' }}>{catLabel}</div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ marginTop: '6px', padding: '10px 14px', background: '#f8fafc', borderRadius: '12px', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>No matching items found.</div>
                  );
                })()}
              </div>

              {/* Selected Item Badge */}
              {quickItem && (
                <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '12px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0369a1' }}>{quickItem}</div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                      {CATEGORIES[Object.keys(CATEGORIES).find(k => CATEGORIES[k].items.includes(quickItem))]?.label}
                    </div>
                  </div>
                  <button onClick={() => { setQuickItem(null); setQuickSearch(''); }} style={{ background: '#e0f2fe', border: 'none', borderRadius: '8px', padding: '5px', cursor: 'pointer', color: '#0369a1' }}>
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Stock & Consumed Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', display: 'block', marginBottom: '6px' }}>Stock in Hands</label>
                  <input
                    type="number"
                    min="0"
                    value={quickStock}
                    onChange={e => setQuickStock(e.target.value)}
                    placeholder="0"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '1rem', fontWeight: 900, textAlign: 'center', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', display: 'block', marginBottom: '6px' }}>Consumed</label>
                  <input
                    type="number"
                    min="0"
                    value={quickConsumed}
                    onChange={e => setQuickConsumed(e.target.value)}
                    placeholder="0"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '1rem', fontWeight: 900, textAlign: 'center', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Live Balance Preview */}
              {(quickStock !== '' || quickConsumed !== '') && (
                <div style={{
                  background: (parseInt(quickStock) || 0) - (parseInt(quickConsumed) || 0) < 0 ? '#fef2f2' : '#f0fdf4',
                  border: `1.5px solid ${(parseInt(quickStock) || 0) - (parseInt(quickConsumed) || 0) < 0 ? '#fecaca' : '#bbf7d0'}`,
                  borderRadius: '12px',
                  padding: '14px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '4px' }}>Calculated Balance</div>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: 900,
                    color: (parseInt(quickStock) || 0) - (parseInt(quickConsumed) || 0) < 0 ? '#ef4444' : '#16a34a'
                  }}>
                    {(parseInt(quickStock) || 0) - (parseInt(quickConsumed) || 0)}
                  </div>
                  {(parseInt(quickStock) || 0) - (parseInt(quickConsumed) || 0) < 0 && (
                    <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, marginTop: '4px' }}>⚠️ Negative balance — verify counts</div>
                  )}
                </div>
              )}

              {/* RN Name */}
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', display: 'block', marginBottom: '6px' }}>RN Name / Initials</label>
                <input
                  value={quickNote}
                  onChange={e => setQuickNote(e.target.value)}
                  placeholder={user?.name || 'Your name or initials...'}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                />
              </div>
            </div>

            {/* Footer CTA */}
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <button
                onClick={saveQuickUpdate}
                disabled={!quickItem || quickSaving}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: (!quickItem || quickSaving) ? '#cbd5e1' : '#0369a1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '14px',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: (!quickItem || quickSaving) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.2s'
                }}
              >
                {quickSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {quickSaving ? 'Saving...' : 'Save Stock Update'}
              </button>
              <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                Saves to today · Day {new Date().getDate()} · {new Date().getHours() < 13 ? 'AM' : 'PM'} session
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
