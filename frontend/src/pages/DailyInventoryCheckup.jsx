import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Activity, 
  Loader2, 
  Filter, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Table,
  Eye,
  FileSpreadsheet
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
      "Urine drainage bag", "Foley balloon catheter fr 10/12/16/18/20", "catheter G20",
      "IV catheter G22/G24/G16/G18"
    ]
  },
  gloves: {
    label: "Gloves",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    items: [
      "sterle gloves no 8CM", "sterile gloves 8", "sterile gloves 7.5", "proper gloves"
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
  const [monthYear, setMonthYear] = useState('2026-05'); // Defaults to May 2026
  const [currentDay, setCurrentDay] = useState(1);
  const [currentSession, setCurrentSession] = useState('AM');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Renders modes: 'focused' (session checkup) or 'matrix' (excel spreadsheet)
  const [viewMode, setViewMode] = useState('focused');

  // Database loaded state
  const [inventoryMap, setInventoryMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load inventory from backend on month changes
  useEffect(() => {
    const loadInventory = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/clinical/inventory?month_year=${monthYear}`);
        if (res.data.success && res.data.data) {
          const map = {};
          // Construct deep map [item_name][day][session] -> record
          res.data.data.forEach(row => {
            if (!map[row.item_name]) map[row.item_name] = {};
            if (!map[row.item_name][row.day]) map[row.item_name][row.day] = {};
            map[row.item_name][row.day][row.session] = row;
          });
          
          // Seed April 1 opening stock values if empty
          if (monthYear === '2026-04') {
            Object.entries(APRIL_INITIAL_STOCK).forEach(([item, val]) => {
              if (!map[item]) map[item] = {};
              if (!map[item][1]) map[item][1] = {};
              if (!map[item][1]['AM']) {
                map[item][1]['AM'] = {
                  stock_in_hands: val,
                  consumed: 0,
                  balance: val,
                  responsible_name: ''
                };
              }
            });
          }

          setInventoryMap(map);
        }
      } catch (err) {
        console.error('Failed to load inventory data:', err);
        toast.error('Failed to load monthly inventory logs.');
      } finally {
        setLoading(false);
      }
    };
    loadInventory();
  }, [monthYear]);

  // Handle cell input edits locally
  const handleCellEdit = (itemName, field, val) => {
    const cleanVal = field === 'responsible_name' ? val : (parseInt(val, 10) || 0);

    setInventoryMap(prev => {
      const copy = { ...prev };
      if (!copy[itemName]) copy[itemName] = {};
      if (!copy[itemName][currentDay]) copy[itemName][currentDay] = {};
      if (!copy[itemName][currentDay][currentSession]) {
        copy[itemName][currentDay][currentSession] = {
          stock_in_hands: 0,
          consumed: 0,
          balance: 0,
          responsible_name: ''
        };
      }

      const cell = { ...copy[itemName][currentDay][currentSession] };
      cell[field] = cleanVal;
      
      // Auto balance calculation: balance = stock - consumed
      if (field === 'stock_in_hands' || field === 'consumed') {
        const stock = field === 'stock_in_hands' ? cleanVal : cell.stock_in_hands;
        const cons = field === 'consumed' ? cleanVal : cell.consumed;
        cell.balance = stock - cons;
      }

      copy[itemName][currentDay][currentSession] = cell;
      return copy;
    });
  };

  // Bulk save current edits
  const handleSave = async () => {
    try {
      setSaving(true);
      const itemsToSave = [];

      // Collect all mapped cells to save
      Object.keys(inventoryMap).forEach(itemName => {
        const daysMap = inventoryMap[itemName];
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

  // Helper to resolve cell attributes safely
  const getCell = (item, day = currentDay, session = currentSession) => {
    return inventoryMap[item]?.[day]?.[session] || {
      stock_in_hands: '',
      consumed: '',
      balance: '',
      responsible_name: ''
    };
  };

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
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      {/* ── Top Header Navigation Bar ── */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/nursing-hub')} 
            className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 bg-pink-100 text-pink-600 rounded-lg"><Activity size={18} /></span>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">Daily Stock Checkup</h1>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Monthly Stock May 2026 Inventory Node</p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <select 
              value={monthYear} 
              onChange={(e) => setMonthYear(e.target.value)}
              className="bg-transparent border-none text-xs font-black text-slate-700 outline-none px-3 py-1.5 cursor-pointer"
            >
              <option value="2026-05">MAY 2026</option>
              <option value="2026-04">APRIL 2026</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setViewMode('focused')}
              className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${viewMode === 'focused' ? 'bg-[#0369a1] text-white shadow' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <Eye className="h-3.5 w-3.5 mr-1" /> Session Focus
            </button>
            <button 
              onClick={() => setViewMode('matrix')}
              className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${viewMode === 'matrix' ? 'bg-[#0369a1] text-white shadow' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Full Spreadsheet
            </button>
          </div>

          {/* Save Button */}
          <Button 
            disabled={saving || loading} 
            onClick={handleSave} 
            className="bg-[#0369a1] hover:bg-[#0284c7] text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2"
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
              <span className="text-xs font-bold text-slate-500">Querying LibSQL Inventory Logs...</span>
            </div>
          </div>
        ) : viewMode === 'focused' ? (
          /* ── 1. SINGLE SESSION FOCUS MODE ── */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 align-start">
            
            {/* Left Nav Pane: Session Selector */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="p-6 border border-slate-200 shadow bg-white rounded-[24px]">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Active Session Selector</h3>
                
                {/* AM/PM Switcher */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
                  <button 
                    onClick={() => setCurrentSession('AM')}
                    className={`flex-1 py-3 text-xs font-black rounded-xl uppercase transition-all ${currentSession === 'AM' ? 'bg-[#0369a1] text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    AM Session ☀️
                  </button>
                  <button 
                    onClick={() => setCurrentSession('PM')}
                    className={`flex-1 py-3 text-xs font-black rounded-xl uppercase transition-all ${currentSession === 'PM' ? 'bg-[#0369a1] text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    PM Session 🌙
                  </button>
                </div>

                {/* Day selector list */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select Day (1–30)</span>
                  <div className="grid grid-cols-5 gap-2 max-h-[320px] overflow-y-auto pr-1">
                    {Array.from({ length: 30 }).map((_, idx) => {
                      const dNum = idx + 1;
                      return (
                        <button
                          key={dNum}
                          onClick={() => setCurrentDay(dNum)}
                          className={`w-10 h-10 text-xs font-bold rounded-xl transition-all border flex items-center justify-center ${currentDay === dNum ? 'bg-sky-600 border-sky-600 text-white font-black shadow' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          {dNum}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Session Card Overview */}
                <div className="mt-6 border-t border-dashed border-slate-200 pt-6">
                  <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 text-center">
                    <span className="text-[9px] font-black uppercase tracking-wider text-sky-600 bg-sky-100/50 px-2 py-0.5 rounded border border-sky-200/40 inline-block mb-2">Selected Period</span>
                    <h4 className="text-xl font-black text-sky-900 leading-none">Day {currentDay} {currentSession}</h4>
                    <p className="text-[10px] text-sky-700/80 font-bold mt-1 uppercase tracking-wider">{monthYear === '2026-05' ? 'MAY 2026' : 'APRIL 2026'}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Pane: Inventory Items Table */}
            <div className="lg:col-span-3 space-y-6">
              <Card className="p-6 border border-slate-200 shadow bg-white rounded-[24px]">
                
                {/* Search & Category Filter Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 pb-4 border-b border-dashed border-slate-100">
                  <div className="relative w-full md:w-72">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Search size={16} /></span>
                    <input 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Filter items..."
                      className="w-full pl-10 pr-4 py-2 text-xs font-bold text-slate-700 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>

                  {/* Category badged pills list */}
                  <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
                    <button 
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all ${selectedCategory === 'all' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      All
                    </button>
                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedCategory(key)}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all ${selectedCategory === key ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      >
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Session Focused Table */}
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
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
                          const catBadge = CATEGORIES[catKey];

                          return (
                            <tr key={item} className="hover:bg-slate-50/50 transition-colors align-center">
                              {/* Item label */}
                              <td className="py-3 px-4">
                                <div className="space-y-1">
                                  <div className="text-slate-900 font-extrabold text-[12px]">{item}</div>
                                  <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${catBadge.color}`}>
                                    {catBadge.label}
                                  </span>
                                </div>
                              </td>

                              {/* Stock in hands input */}
                              <td className="py-3 px-4 text-center">
                                <input 
                                  value={cell.stock_in_hands}
                                  onChange={(e) => handleCellEdit(item, 'stock_in_hands', e.target.value)}
                                  placeholder="0"
                                  className="w-20 text-center py-1.5 px-2 bg-slate-50/80 border border-slate-200 focus:border-sky-500 rounded-lg outline-none font-extrabold text-xs"
                                  type="number"
                                />
                              </td>

                              {/* Consumed items input */}
                              <td className="py-3 px-4 text-center">
                                <input 
                                  value={cell.consumed}
                                  onChange={(e) => handleCellEdit(item, 'consumed', e.target.value)}
                                  placeholder="0"
                                  className="w-20 text-center py-1.5 px-2 bg-slate-50/80 border border-slate-200 focus:border-sky-500 rounded-lg outline-none font-extrabold text-xs"
                                  type="number"
                                />
                              </td>

                              {/* Balance view (formula stock - consumed) */}
                              <td className="py-3 px-4 text-center">
                                <span className={`text-[12px] font-black px-3 py-1.5 rounded-lg border ${cell.balance < 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-100/50 text-slate-800 border-slate-200/50'}`}>
                                  {cell.balance !== '' ? cell.balance : 0}
                                </span>
                              </td>

                              {/* Responsible Name input */}
                              <td className="py-3 px-4">
                                <input 
                                  value={cell.responsible_name || ''}
                                  onChange={(e) => handleCellEdit(item, 'responsible_name', e.target.value)}
                                  placeholder="RN Signature"
                                  className="w-full max-w-[200px] py-1.5 px-3 bg-slate-50/80 border border-slate-200 focus:border-sky-500 rounded-lg outline-none text-xs"
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
                <p className="text-[11px] text-blue-700/80 font-bold mt-1">Full 30-day horizontal spreadsheet checkup for May 2026. Scroll horizontally to audit cell states.</p>
              </div>
              <span className="text-[10px] font-extrabold uppercase bg-blue-100 border border-blue-200 px-3 py-1 rounded text-blue-800">
                Formula Reconciled: Balance = Stock - Consumed
              </span>
            </div>

            {/* Matrix horizontal scroll container */}
            <div className="overflow-x-auto max-h-[70vh] border border-slate-200 rounded-2xl relative">
              <table className="border-collapse text-[10px] text-left text-slate-600 min-w-[5000px]">
                {/* Row 1 Header: Title + Day numbers repeating */}
                <thead>
                  <tr className="bg-slate-800 text-white font-extrabold select-none h-10">
                    <th className="sticky left-0 bg-slate-800 border-r border-slate-700 px-4 text-[11px] font-black z-20 w-[240px]">
                      MONTHLY STOCK {monthYear === '2026-05' ? 'MAY 2026' : 'APRIL 2026'}
                    </th>
                    <th className="border-r border-slate-700 px-2 text-center w-8">
                      {/* Spacer */}
                    </th>
                    {Array.from({ length: 30 }).map((_, idx) => {
                      const d = idx + 1;
                      return (
                        <React.Fragment key={d}>
                          <th colSpan={4} className="border-r border-slate-700 text-center font-black uppercase text-[10px] tracking-wider bg-slate-700/50">
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
                    {Array.from({ length: 30 }).map((_, idx) => {
                      const d = idx + 1;
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
                    {Array.from({ length: 30 }).map((_, idx) => {
                      const d = idx + 1;
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
                  {ALL_ITEMS.map((item, rIdx) => (
                    <tr key={item} className="hover:bg-slate-50 h-10 select-none align-middle">
                      {/* Column A (ITEMS) - Frozen left */}
                      <td className="sticky left-0 bg-white border-r border-slate-300 px-4 font-black z-10 text-[11px] shadow-[2px_0_5px_rgba(0,0,0,0.05)] w-[240px]">
                        {item}
                      </td>
                      {/* Column B (Spacer column) */}
                      <td className="border-r border-slate-300 w-8 bg-slate-50 text-center font-bold text-slate-300">
                        {rIdx + 1}
                      </td>
                      {/* All Day Columns */}
                      {Array.from({ length: 30 }).map((_, idx) => {
                        const d = idx + 1;
                        const cellAM = getCell(item, d, 'AM');
                        const cellPM = getCell(item, d, 'PM');

                        return (
                          <React.Fragment key={d}>
                            {/* AM Session inputs */}
                            <td className="border-r border-slate-200 p-0 text-center font-mono">
                              <input 
                                value={cellAM.stock_in_hands || ''} 
                                onChange={(e) => {
                                  // Emulate focus values inside matrix edits dynamically
                                  setCurrentDay(d);
                                  setCurrentSession('AM');
                                  handleCellEdit(item, 'stock_in_hands', e.target.value);
                                }}
                                placeholder="0"
                                className="w-full text-center h-8 bg-transparent border-none outline-none text-[10px] font-extrabold focus:bg-sky-50"
                              />
                            </td>
                            <td className="border-r border-slate-200 p-0 text-center font-mono">
                              <input 
                                value={cellAM.consumed || ''} 
                                onChange={(e) => {
                                  setCurrentDay(d);
                                  setCurrentSession('AM');
                                  handleCellEdit(item, 'consumed', e.target.value);
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
                                  handleCellEdit(item, 'responsible_name', e.target.value);
                                }}
                                placeholder="RN"
                                className="w-full px-2 h-8 bg-transparent border-none outline-none text-[9px] focus:bg-sky-50"
                              />
                            </td>

                            {/* PM Session inputs */}
                            <td className="border-r border-slate-200 p-0 text-center font-mono">
                              <input 
                                value={cellPM.stock_in_hands || ''} 
                                onChange={(e) => {
                                  setCurrentDay(d);
                                  setCurrentSession('PM');
                                  handleCellEdit(item, 'stock_in_hands', e.target.value);
                                }}
                                placeholder="0"
                                className="w-full text-center h-8 bg-transparent border-none outline-none text-[10px] font-extrabold focus:bg-sky-50"
                              />
                            </td>
                            <td className="border-r border-slate-200 p-0 text-center font-mono">
                              <input 
                                value={cellPM.consumed || ''} 
                                onChange={(e) => {
                                  setCurrentDay(d);
                                  setCurrentSession('PM');
                                  handleCellEdit(item, 'consumed', e.target.value);
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
                                  handleCellEdit(item, 'responsible_name', e.target.value);
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
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
