import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Activity,
  Loader2,
  Search,
  Eye,
  EyeOff,
  FileSpreadsheet,
  X,
  ChevronDown,
  PackagePlus,
  RotateCw,
  Lock,
  Unlock,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  KeyRound,
  RefreshCw,
  Plus,
  Filter,
  User,
  Clock
} from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { Card, Button, Badge } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

// Excel metadata source matching the provided spreadsheet
const EXCEL_DATA = {
  "Aquabloc 15cm": { qty: 70, expiry: "02/2028", status: "Available", category: "medical_supplies" },
  "Bande 15cm": { qty: 7, expiry: "10/2027", status: "Available", category: "medical_supplies" },
  "Bande 7.5cm": { qty: 3, expiry: "06/2029", status: "Available", category: "medical_supplies" },
  "Bupivacaine": { qty: 5, expiry: "04/2027", status: "Available", category: "anesthetics" },
  "Buscopan": { qty: 20, expiry: "02/2028", status: "Available", category: "medications" },
  "Buscopan 20mg": { qty: 27, expiry: "01/2028", status: "Available", category: "medications" },
  "Catheter G16": { qty: 100, expiry: "04/2027", status: "Available", category: "medical_supplies" },
  "Catheter G18": { qty: 200, expiry: "03/2027", status: "Available", category: "medical_supplies" },
  "Catheter G20": { qty: 70, expiry: "06/2029", status: "Available", category: "medical_supplies" },
  "Catheter G22": { qty: 80, expiry: "05/2028", status: "Available", category: "medical_supplies" },
  "Catheter G24": { qty: 120, expiry: "12/2028", status: "Available", category: "medical_supplies" },
  "Ceftriaxone 1g": { qty: 39, expiry: "11/2026", status: "Near Expiry", category: "medications" },
  "Dexamethasone 4mg": { qty: 17, expiry: "04/2028", status: "Available", category: "medications" },
  "Dexamethasone 8mg": { qty: 25, expiry: "05/2028", status: "Available", category: "medications" },
  "Dextrose 50%": { qty: 20, expiry: "01/2027", status: "Available", category: "antiseptics" },
  "Diazepam 10mg": { qty: 10, expiry: "10/2026", status: "Available", category: "medications" },
  "Diclo 100mg Supp": { qty: 33, expiry: "04/2028", status: "Available", category: "medications" },
  "Diclofenac 75mg": { qty: 22, expiry: "05/2028", status: "Available", category: "medications" },
  "Diclofenac IM 75mg": { qty: 40, expiry: "02/2028", status: "Available", category: "medications" },
  "Dicynone 250mg": { qty: 8, expiry: "04/2028", status: "Available", category: "medications" },
  "Eau oxygénée 3%": { qty: 7, expiry: "12/2027", status: "Available", category: "antiseptics" },
  "Esomeprazole": { qty: 9, expiry: "04/2027", status: "Available", category: "medications" },
  "Fentanyl": { qty: 7, expiry: "12/2026", status: "Near Expiry", category: "anesthetics" },
  "Flagyl": { qty: 6, expiry: "10/2026", status: "Near Expiry", category: "medications" },
  "Furosemide": { qty: 6, expiry: "05/2027", status: "Available", category: "medications" },
  "Furosemide 20mg": { qty: 24, expiry: "06/2027", status: "Available", category: "medications" },
  "Gants Sterile 8": { qty: 120, expiry: "06/2027", status: "Available", category: "medical_supplies" },
  "Gants propre": { qty: 1500, expiry: "05/2028", status: "Available", category: "medical_supplies" },
  "Gloves 7.5": { qty: 212, expiry: "10/2028", status: "Available", category: "medical_supplies" },
  "Glucose 5%": { qty: 10, expiry: "10/2027", status: "Available", category: "antiseptics" },
  "Hydralazine 20mg": { qty: 4, expiry: "10/2026", status: "Near Expiry", category: "medications" },
  "Hydrocortisone 100mg": { qty: 34, expiry: "07/2026", status: "Near Expiry", category: "medications" },
  "IV Paracetamol 1g": { qty: 44, expiry: "10/2027", status: "Available", category: "medications" },
  "Ketamine 500mg": { qty: 7, expiry: "02/2027", status: "Available", category: "anesthetics" },
  "Largactil 25mg": { qty: 10, expiry: "04/2028", status: "Available", category: "medications" },
  "Lidocaine": { qty: 16, expiry: "05/2028", status: "Available", category: "anesthetics" },
  "Masque Neb Adulte": { qty: 27, expiry: "11/2028", status: "Available", category: "medical_supplies" },
  "Masque Neb Enfant": { qty: 38, expiry: "05/2028", status: "Available", category: "medical_supplies" },
  "Metoclopramide": { qty: 18, expiry: "04/2028", status: "Available", category: "medications" },
  "Metronidazole": { qty: 6, expiry: "11/2026", status: "Near Expiry", category: "medications" },
  "Midazolam 5mg": { qty: 5, expiry: "06/2026", status: "Available", category: "anesthetics" },
  "NS (Normal Saline)": { qty: 40, expiry: "02/2028", status: "Available", category: "antiseptics" },
  "Naloxone": { qty: 1, expiry: "No Expiry Listed", status: "Available", category: "antidotes" },
  "Nasal Oxygen Masque Enfant": { qty: 28, expiry: "04/2027", status: "Available", category: "medical_supplies" },
  "Nylon 2/0": { qty: 20, expiry: "04/2029", status: "Available", category: "sutures" },
  "Nylon 4/0": { qty: 18, expiry: "02/2030", status: "Available", category: "sutures" },
  "Nylon 5/0": { qty: 21, expiry: "07/2029", status: "Available", category: "sutures" },
  "Pantoprazole 40mg": { qty: 12, expiry: "11/2027", status: "Available", category: "medications" },
  "Pap Smear": { qty: 26, expiry: "04/2028", status: "Available", category: "medical_supplies" },
  "Paracet 125mg Supp": { qty: 134, expiry: "06/2028", status: "Available", category: "medications" },
  "Paracet 250mg Supp": { qty: 54, expiry: "02/2029", status: "Available", category: "medications" },
  "Paracetamol 125mg": { qty: 18, expiry: "04/2029", status: "Available", category: "medications" },
  "Paracetamol Ces": { qty: 40, expiry: "03/2028", status: "Available", category: "medications" },
  "Paraffin Gauze 5cm": { qty: 5, expiry: "05/2027", status: "Available", category: "medical_supplies" },
  "Pethidine": { qty: 8, expiry: "05/2027", status: "Available", category: "anesthetics" },
  "Phenobarbital 100mg": { qty: 10, expiry: "04/2027", status: "Available", category: "medications" },
  "Phenytoin 250mg": { qty: 3, expiry: "02/2027", status: "Available", category: "medications" },
  "Phytomenadione 10mg": { qty: 3, expiry: "02/2028", status: "Available", category: "medications" },
  "Polyglactin 3/0": { qty: 38, expiry: "04/2030", status: "Available", category: "sutures" },
  "Polyglactin 4/0": { qty: 32, expiry: "03/2030", status: "Available", category: "sutures" },
  "Propofol 200mg": { qty: 4, expiry: "06/2027", status: "Available", category: "anesthetics" },
  "RL (Ringer's Lactate)": { qty: 34, expiry: "11/2028", status: "Available", category: "antiseptics" },
  "Sac à urine": { qty: 5, expiry: "04/2027", status: "Available", category: "medical_supplies" },
  "Salbutamol": { qty: 50, expiry: "02/2028", status: "Available", category: "medications" },
  "Seringue 10cc": { qty: 270, expiry: "04/2030", status: "Available", category: "medical_supplies" },
  "Seringue 1cc (Insuline)": { qty: 90, expiry: "12/2028", status: "Available", category: "medical_supplies" },
  "Seringue 20cc": { qty: 90, expiry: "07/2030", status: "Available", category: "medical_supplies" },
  "Seringue 2cc": { qty: 60, expiry: "12/2027", status: "Available", category: "medical_supplies" },
  "Seringue 5cc": { qty: 340, expiry: "03/2030", status: "Available", category: "medical_supplies" },
  "Sonde Vésicale G10": { qty: 8, expiry: "04/2027", status: "Available", category: "medical_supplies" },
  "Sonde Vésicale G12": { qty: 5, expiry: "07/2028", status: "Available", category: "medical_supplies" },
  "Sonde Vésicale G16": { qty: 12, expiry: "12/2029", status: "Available", category: "medical_supplies" },
  "Spatula": { qty: 2, expiry: "No Expiry Listed", status: "Available", category: "medical_supplies" },
  "Speculum": { qty: 7, expiry: "10/2028", status: "Available", category: "medical_supplies" },
  "Sterile Gauze 10cm": { qty: 125, expiry: "12/2028", status: "Available", category: "medical_supplies" },
  "Surgical Blades N15": { qty: 26, expiry: "12/2026", status: "Near Expiry", category: "sutures" },
  "Surgical Blades N23": { qty: 150, expiry: "11/2029", status: "Available", category: "sutures" },
  "Tongue Depressor": { qty: 4, expiry: "No Expiry Listed", status: "Available", category: "medical_supplies" },
  "Tramadol": { qty: 10, expiry: "10/2026", status: "Near Expiry", category: "anesthetics" },
  "Trousse": { qty: 64, expiry: "06/2029", status: "Available", category: "medical_supplies" },
  "Vaginal Swab": { qty: 57, expiry: "04/2030", status: "Available", category: "medical_supplies" },
  "Vicryl 2/0": { qty: 12, expiry: "02/2029", status: "Available", category: "sutures" },
  "Vicryl 3/0": { qty: 24, expiry: "03/2029", status: "Available", category: "sutures" },
  "Vicryl 4/0": { qty: 24, expiry: "02/2029", status: "Available", category: "sutures" },
  "Vicryl 5/0": { qty: 12, expiry: "02/2029", status: "Available", category: "sutures" },
  "Vit B complex": { qty: 14, expiry: "02/2027", status: "Available", category: "medications" },
  "Water for injection": { qty: 218, expiry: "10/2026", status: "Near Expiry", category: "antiseptics" }
};

// Categories and items mapping structured exactly by spreadsheet categories
const CATEGORIES = {
  medical_supplies: {
    label: "Medical Supplies",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    items: [
      "Aquabloc 15cm", "Bande 15cm", "Bande 7.5cm",
      "Catheter G16", "Catheter G18", "Catheter G20", "Catheter G22", "Catheter G24",
      "Gants Sterile 8", "Gants propre", "Gloves 7.5", "Masque Neb Adulte", "Masque Neb Enfant",
      "Nasal Oxygen Masque Enfant", "Pap Smear", "Paraffin Gauze 5cm", "Sac à urine",
      "Seringue 10cc", "Seringue 1cc (Insuline)", "Seringue 20cc", "Seringue 2cc", "Seringue 5cc",
      "Sonde Vésicale G10", "Sonde Vésicale G12", "Sonde Vésicale G16", "Spatula", "Speculum",
      "Sterile Gauze 10cm", "Tongue Depressor", "Trousse", "Vaginal Swab"
    ]
  },
  medications: {
    label: "Medications",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    items: [
      "Buscopan", "Buscopan 20mg",
      "Ceftriaxone 1g", "Dexamethasone 4mg", "Dexamethasone 8mg",
      "Diazepam 10mg", "Diclo 100mg Supp", "Diclofenac 75mg", "Diclofenac IM 75mg",
      "Dicynone 250mg", "Esomeprazole", "Flagyl", "Furosemide", "Furosemide 20mg",
      "Hydralazine 20mg", "Hydrocortisone 100mg", "IV Paracetamol 1g", "Largactil 25mg",
      "Metoclopramide", "Metronidazole", "Pantoprazole 40mg", "Paracet 125mg Supp",
      "Paracet 250mg Supp", "Paracetamol 125mg", "Paracetamol Ces",
      "Phenobarbital 100mg", "Phenytoin 250mg", "Phytomenadione 10mg", "Salbutamol",
      "Vit B complex"
    ]
  },
  anesthetics: {
    label: "Anesthetics & Analgesics",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    items: [
      "Bupivacaine", "Fentanyl", "Ketamine 500mg", "Lidocaine", "Midazolam 5mg",
      "Pethidine", "Propofol 200mg", "Tramadol"
    ]
  },
  antiseptics: {
    label: "Antiseptics & Fluids",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    items: [
      "Dextrose 50%", "Eau oxygénée 3%", "Glucose 5%", "NS (Normal Saline)",
      "RL (Ringer's Lactate)", "Water for injection"
    ]
  },
  sutures: {
    label: "Sutures & Blades",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    items: [
      "Nylon 2/0", "Nylon 4/0", "Nylon 5/0", "Polyglactin 3/0", "Polyglactin 4/0",
      "Surgical Blades N15", "Surgical Blades N23",
      "Vicryl 2/0", "Vicryl 3/0", "Vicryl 4/0", "Vicryl 5/0"
    ]
  },
  antidotes: {
    label: "Antidotes",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    items: [
      "Naloxone"
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

// Dynamically generate initial stock lookup
const APRIL_INITIAL_STOCK = {};
Object.entries(EXCEL_DATA).forEach(([item, val]) => {
  APRIL_INITIAL_STOCK[item] = val.qty;
});

// Renders a net-change badge (e.g. "Stock +20", "Consumed +5"). Hidden when
// there is no change. Stock: up=green / down=red. Consumed: up=amber (activity)
// / down=slate (correction).
const DeltaChip = ({ label, delta, variant = 'stock' }) => {
  if (!delta) return null;
  const up = delta > 0;
  const cls = variant === 'consumed'
    ? (up ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200')
    : (up ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200');
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-black ${cls}`}>
      {label} {up ? '+' : ''}{delta}
    </span>
  );
};

// Tiny bar chart of daily consumption. `days` is [[dayNumber, amount], ...].
const ConsumptionBars = ({ days, peakVal }) => {
  if (!days || days.length === 0) return <div className="h-8" />;
  const max = peakVal || Math.max(...days.map(d => d[1]), 1);
  return (
    <div className="flex items-end gap-[3px] h-8" title="Consumption by day">
      {days.map(([day, amt]) => (
        <div key={day} className="flex-1 min-w-[3px] bg-emerald-400/80 rounded-sm hover:bg-emerald-500 transition-colors"
          style={{ height: `${Math.max(8, (amt / max) * 100)}%` }}
          title={`Day ${day}: ${amt} consumed`} />
      ))}
    </div>
  );
};

// Combine change-log rows for the SAME item in the SAME session into one entry:
// net deltas are summed, every contributing user is collected (comma-listed in
// the UI), and the individual changes are kept for the expandable detail view.
// When consumedOnly is true, only items with actual consumption are returned.
const buildChangeGroups = (logs, consumedOnly) => {
  const map = new Map();
  for (const l of logs) {
    const key = `${l.item_name}||${l.day}||${l.session}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key, item_name: l.item_name, day: l.day, session: l.session,
        stockDelta: 0, consumedDelta: 0, stnDelta: 0, minDelta: 0,
        lastStock: 0, lastConsumed: 0,
        users: new Set(), stnNurses: new Set(), minNurses: new Set(),
        changes: [], latest: 0,
      };
      map.set(key, g);
    }
    g.stockDelta    += (Number(l.new_stock) || 0)          - (Number(l.old_stock) || 0);
    g.consumedDelta += (Number(l.new_consumed) || 0)       - (Number(l.old_consumed) || 0);
    g.stnDelta      += (Number(l.new_consumed_obs1) || 0)  - (Number(l.old_consumed_obs1) || 0);
    g.minDelta      += (Number(l.new_consumed_minor) || 0) - (Number(l.old_consumed_minor) || 0);
    if (l.updated_by) g.users.add(l.updated_by);
    if (l.new_user_stn1) g.stnNurses.add(l.new_user_stn1);
    if (l.new_user_minor) g.minNurses.add(l.new_user_minor);
    g.changes.push(l);
    const t = new Date(l.updated_at).getTime();
    if (t >= g.latest) { g.latest = t; g.lastStock = Number(l.new_stock) || 0; g.lastConsumed = Number(l.new_consumed) || 0; }
  }
  let arr = [...map.values()].map(g => ({
    ...g,
    users: [...g.users],
    stnNurses: [...g.stnNurses],
    minNurses: [...g.minNurses],
    changes: g.changes.slice().sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at)),
  }));
  arr.sort((a, b) => b.latest - a.latest);
  if (consumedOnly) arr = arr.filter(g => g.consumedDelta > 0 || g.stnDelta > 0 || g.minDelta > 0);
  return arr;
};

export default function DailyInventoryCheckup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNurse = user?.role?.toLowerCase() === 'nurse' || user?.role?.toLowerCase() === 'chef-nurse' || user?.role?.toLowerCase() === 'chef_nurse';

  const checkIsPast = (mYear, day, session) => {
    if (!mYear) return false;
    const now = new Date();
    const [y, m] = mYear.split('-');
    const recordYear = parseInt(y, 10);
    const recordMonth = parseInt(m, 10);

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    if (recordYear < currentYear) return true;
    if (recordYear > currentYear) return false;

    if (recordMonth < currentMonth) return true;
    if (recordMonth > currentMonth) return false;

    const currentDayNum = now.getDate();
    if (day < currentDayNum) return true;
    if (day > currentDayNum) return false;

    const currentRealSession = now.getHours() < 15 ? 'AM' : 'PM';
    
    // We do NOT return true here anymore to allow late AM reporting
    // if (session === 'AM' && currentRealSession === 'PM') return true;

    return false;
  };

  // Active state
  const [monthYear, setMonthYear] = useState(CURRENT_MONTH_STR);
  const [currentDay, setCurrentDay] = useState(() => new Date().getDate());
  const [currentSession, setCurrentSession] = useState(() => new Date().getHours() < 15 ? 'AM' : 'PM');

  const matrixScrollRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedWard, setSelectedWard] = useState(''); // Neutral by default, must be 'STN1' or 'MINOR'
  const [searchTerm, setSearchTerm] = useState('');

  // Renders modes: 'focused' (session checkup) or 'matrix' (excel spreadsheet)
  const [activeTab, setActiveTab] = useState('active_checkup'); // 'active_checkup', 'expired_inventory', 'matrix'
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
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
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSelectedMonth, setExportSelectedMonth] = useState(monthYear);
  const [customItems, setCustomItems] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Admin Stock Password state
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [stockPassword, setStockPassword] = useState(null);
  const [stockPasswordLoading, setStockPasswordLoading] = useState(false);
  const [stockPasswordCopied, setStockPasswordCopied] = useState(false);
  const [stockPasswordVisible, setStockPasswordVisible] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [passwordMonth, setPasswordMonth] = useState(CURRENT_MONTH_STR);

  // State for tracking custom or seeded items removed/deleted from the active roster
  const [deletedItems, setDeletedItems] = useState([]);
  // Ref-based guard: true while loadInventory is running, preventing the persist
  // effect from firing before deleted items have been hydrated from the DB.
  // Using a ref (not state) so toggling it never causes extra re-renders.
  const isHydratingRef = useRef(false);

  // Audit Logs State
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all'); // 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'all'
  const [logsPage, setLogsPage] = useState(1);
  // Stock Changes tab: consumption split by day → session (AM/PM) → ward
  // (Station 1 / Minor). Defaults to a single-day (daily) view of today.
  const [logViewMode, setLogViewMode] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [logDay, setLogDay] = useState(() => new Date().getDate());
  const [logWeek, setLogWeek] = useState(() => Math.floor((new Date().getDate() - 1) / 7) + 1);

  // Stock Change Log filters
  const [logFilterItem, setLogFilterItem] = useState('');
  const [logFilterNurse, setLogFilterNurse] = useState('');
  const [logFilterWard, setLogFilterWard] = useState(''); // '', 'STN1', 'MINOR'
  const [logFromDay, setLogFromDay] = useState('');
  const [logToDay, setLogToDay] = useState('');
  // Show only items that were actually consumed (default) vs every change.
  const [logConsumedOnly, setLogConsumedOnly] = useState(true);
  const clearLogFilters = () => {
    setLogFilterItem(''); setLogFilterNurse(''); setLogFilterWard(''); setLogFromDay(''); setLogToDay('');
  };
  const anyLogFilter = logFilterItem || logFilterNurse || logFilterWard || logFromDay || logToDay;
  // Cap how many change cards render at once — a busy month can hold tens of
  // thousands of logs, and rendering them all would freeze the browser.
  const LOG_PAGE_SIZE = 150;
  const [logRenderLimit, setLogRenderLimit] = useState(LOG_PAGE_SIZE);
  // Reset the cap whenever the filters or the underlying data change.
  useEffect(() => { setLogRenderLimit(LOG_PAGE_SIZE); },
    [auditLogs, logFilterItem, logFilterNurse, logFilterWard, logFromDay, logToDay, logConsumedOnly]);

  // Distinct items / nurses present in the loaded change logs (for dropdowns).
  const logItemOptions = useMemo(
    () => [...new Set(auditLogs.map(l => l.item_name).filter(Boolean))].sort(),
    [auditLogs]
  );

  // Apply the filters client-side over the month's already-loaded logs.
  const stockChangeLogs = useMemo(() => auditLogs.filter(l => {
    if (logFilterItem && l.item_name !== logFilterItem) return false;
    if (logFilterNurse) {
      const q = logFilterNurse.toLowerCase();
      const nurses = [l.updated_by, l.new_user_stn1, l.new_user_minor]
        .filter(Boolean).map(s => String(s).toLowerCase());
      if (!nurses.some(n => n.includes(q))) return false;
    }
    if (logFilterWard === 'STN1'
      && l.old_consumed_obs1 === l.new_consumed_obs1 && l.old_user_stn1 === l.new_user_stn1) return false;
    if (logFilterWard === 'MINOR'
      && l.old_consumed_minor === l.new_consumed_minor && l.old_user_minor === l.new_user_minor) return false;
    if (logFromDay && Number(l.day) < Number(logFromDay)) return false;
    if (logToDay && Number(l.day) > Number(logToDay)) return false;
    return true;
  }), [auditLogs, logFilterItem, logFilterNurse, logFilterWard, logFromDay, logToDay]);

  // Combined entries for the "View Audit Logs" modal.
  const groupedChangeLogs = useMemo(
    () => buildChangeGroups(stockChangeLogs, logConsumedOnly),
    [stockChangeLogs, logConsumedOnly]
  );

  const [expandedGroups, setExpandedGroups] = useState({});
  const toggleGroup = (key) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  // Requisitions State
  const [showReqListModal, setShowReqListModal] = useState(false);
  const [reqList, setReqList] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [showCreateReqModal, setShowCreateReqModal] = useState(false);
  const [newReqUrgency, setNewReqUrgency] = useState('Normal');
  const [newReqNotes, setNewReqNotes] = useState('');
  const [newReqLines, setNewReqLines] = useState([{ item_id: '', quantity: '' }]);
  const [masterItems, setMasterItems] = useState([]);
  const [showReqDetailModal, setShowReqDetailModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [reqItems, setReqItems] = useState([]);
  const [reqItemsLoading, setReqItemsLoading] = useState(false);

  const handleDeleteItem = (itemName) => {
    const newDeleted = [...deletedItems, itemName];
    setDeletedItems(newDeleted);
    // Persist directly here — DO NOT rely on a useEffect to do this.
    // A useEffect watching [deletedItems] will also fire after loadInventory
    // sets deletedItems from the DB, and by then React has already cleared any
    // "loading" or ref guard, causing it to overwrite the DB with stale data.
    api.post('/clinical/inventory/deleted-items', {
      month_year: monthYear,
      deleted_items: newDeleted
    }).catch(err => console.error('Failed to persist deleted item:', err));
    toast.success(`Removed "${itemName}" from active checkup roster.`);
  };

  // Expired items can always be removed — they don't need stock-editing unlock
  const handleDeleteAllExpired = () => {
    if (filteredExpiredItems.length === 0) {
      toast.error("No expired items to delete.");
      return;
    }
    const newDeleted = [...new Set([...deletedItems, ...filteredExpiredItems])];
    setDeletedItems(newDeleted);
    // Persist directly — same reason as handleDeleteItem above
    api.post('/clinical/inventory/deleted-items', {
      month_year: monthYear,
      deleted_items: newDeleted
    }).catch(err => console.error('Failed to persist deleted items:', err));
    toast.success(`Removed all ${filteredExpiredItems.length} expired items from the checkup roster.`);
  };

  const handleUnlockStock = async (e) => {
    e.preventDefault();
    if (!unlockPassword.trim()) {
      return toast.error('Please enter the stock unlock password.');
    }
    try {
      setUnlocking(true);
      const res = await api.post('/clinical/inventory/unlock', {
        month_year: monthYear,
        password: unlockPassword.trim()
      });
      if (res.data.success) {
        setLockStock(false);
        setShowUnlockModal(false);
        setUnlockPassword('');
        toast.success('Stock count editing UNLOCKED. Edit carefully!', { icon: '🔓' });
      }
    } catch (err) {
      console.error('Failed to unlock stock:', err);
      toast.error(err.response?.data?.message || 'Incorrect password. Stock remains locked.');
    } finally {
      setUnlocking(false);
    }
  };

  // ── Admin: Fetch stock unlock password ──────────────────────────────────────
  const fetchStockPassword = async (my) => {
    try {
      setStockPasswordLoading(true);
      setStockPassword(null);
      const res = await api.get(`/clinical/inventory/stock-password?month_year=${my}`);
      if (res.data.success) {
        setStockPassword(res.data.password);
      }
    } catch (err) {
      console.error('Failed to fetch stock password:', err);
      toast.error('Could not load stock password.');
    } finally {
      setStockPasswordLoading(false);
    }
  };

  const handleOpenPasswordModal = () => {
    setPasswordMonth(monthYear);
    setShowPasswordModal(true);
    setStockPasswordVisible(false);
    setStockPasswordCopied(false);
    fetchStockPassword(monthYear);
    setShowToolsDropdown(false);
  };

  const handleRegeneratePassword = async () => {
    try {
      setRegenerating(true);
      const res = await api.post('/clinical/inventory/regenerate-stock-password', { month_year: passwordMonth });
      if (res.data.success) {
        setStockPassword(res.data.password);
        setStockPasswordVisible(true);
        setStockPasswordCopied(false);
        toast.success(`New password generated for ${getMonthLabel(passwordMonth)}!`, { icon: '🔑' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to regenerate password.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopyPassword = () => {
    if (!stockPassword) return;
    navigator.clipboard.writeText(stockPassword).then(() => {
      setStockPasswordCopied(true);
      setTimeout(() => setStockPasswordCopied(false), 2000);
    });
  };

  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('medications');
  const [newItemStock, setNewItemStock] = useState('0');
  const [newItemExpDate, setNewItemExpDate] = useState('');
  const [newItemStatus, setNewItemStatus] = useState('Available');

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

  const handleFetchLogs = async () => {
    try {
      setLoadingLogs(true);
      setShowLogsModal(true);
      const res = await api.get(`/clinical/inventory/change-logs?month_year=${monthYear}`);
      if (res.data.success) {
        setAuditLogs(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load audit logs.');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSyncCentralStock = async () => {
    try {
      setLoading(true);
      const res = await api.post('/clinical/inventory/sync-central-stock', {
        month_year: monthYear,
        day: currentDay,
        session: currentSession
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Central stock synchronized successfully!');
        loadInventory();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to sync central store stock');
      setLoading(false);
    }
  };

  const loadRequisitions = async () => {
    setLoadingReqs(true);
    try {
      const res = await api.get('/clinical/inventory/requisitions');
      if (res.data.success) {
        const filtered = res.data.data.filter(r => r.department_name?.toUpperCase() === 'NURSING');
        setReqList(filtered);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load requisitions');
    } finally {
      setLoadingReqs(false);
    }
  };

  const handleViewReq = async (req) => {
    setSelectedReq(req);
    setShowReqDetailModal(true);
    setReqItems([]);
    setReqItemsLoading(true);
    try {
      const res = await api.get(`/clinical/inventory/requisitions/${req.id}/items`);
      if (res.data.success) {
        setReqItems(res.data.data);
      }
    } catch {
      toast.error('Could not load requisition items');
    } finally {
      setReqItemsLoading(false);
    }
  };

  const [receivingReq, setReceivingReq] = useState(false);
  // Accept an approved requisition's items into the current Daily Stock Checkup.
  const handleReceiveRequisition = async (req) => {
    if (!req?.id) return;
    setReceivingReq(true);
    try {
      const res = await api.post(`/clinical/inventory/requisitions/${req.id}/receive`, {
        month_year: monthYear,
        day: currentDay,
        session: currentSession,
      });
      toast.success(res.data.message || 'Stock accepted into checkup.');
      setShowReqDetailModal(false);
      await Promise.all([loadRequisitions(), loadInventory(true)]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept stock.');
    } finally {
      setReceivingReq(false);
    }
  };

  const handleCreateRequisition = async (e) => {
    e.preventDefault();
    const validLines = newReqLines.filter(l => l.item_id && Number(l.quantity) > 0);
    if (validLines.length === 0) {
      toast.error('Please add at least one item.');
      return;
    }

    let deptId = 121;
    try {
      const deptRes = await api.get('/clinical/inventory/departments');
      if (deptRes.data.success) {
        const nursingDept = deptRes.data.data.find(d => d.name?.toUpperCase() === 'NURSING');
        if (nursingDept) deptId = nursingDept.id;
      }
    } catch (err) {
      console.error(err);
    }

    setSaving(true);
    try {
      await api.post('/clinical/inventory/requisitions', {
        department_id: deptId,
        urgency: newReqUrgency,
        notes: newReqNotes,
        items: validLines.map(l => ({ item_id: l.item_id, quantity: Number(l.quantity) }))
      });
      toast.success('Requisition submitted to Central Store successfully!');
      setShowCreateReqModal(false);
      setNewReqUrgency('Normal');
      setNewReqNotes('');
      setNewReqLines([{ item_id: '', quantity: '' }]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit requisition');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetchMasterItems = async () => {
      try {
        const res = await api.get('/clinical/inventory/master');
        if (res.data.success) {
          setMasterItems(res.data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMasterItems();
  }, []);

  // Scroll the matrix table to the column of a given day
  const jumpToDay = (day) => {
    const colEl = document.getElementById(`day-col-${day}`);
    const container = matrixScrollRef.current;
    if (!colEl || !container) return;
    // offsetLeft of the th relative to the table, minus the sticky item-name column (240px) + a small margin
    const targetLeft = colEl.offsetLeft - 256;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  };

  // Load inventory from backend on month changes.
  // Accept targetMonth as a parameter so callers can pass the up-to-date value
  // without relying on the closure-captured `monthYear` (avoids stale-closure bugs).
  const loadInventory = async (isManual = false, targetMonth = monthYear) => {
    // Mark as hydrating BEFORE any awaits so the persist effect never fires
    // while the list is still [] waiting for the DB response.
    isHydratingRef.current = true;
    try {
      setLoading(true);
      const promises = DYNAMIC_MONTHS.map(m => api.get(`/clinical/inventory?month_year=${m}`));
      // Fetch the persisted deleted items list for the target month
      const deletedPromise = api.get(`/clinical/inventory/deleted-items?month_year=${targetMonth}`).catch(() => ({ data: { success: false, data: [] } }));
      const [responses, deletedRes] = await Promise.all([Promise.all(promises), deletedPromise]);

      const allMap = {};
      DYNAMIC_MONTHS.forEach(m => allMap[m] = {});

      const parseRows = (rows, month) => {
        rows.forEach(row => {
          if (!allMap[month][row.item_name]) allMap[month][row.item_name] = {};
          if (!allMap[month][row.item_name][row.day]) allMap[month][row.item_name][row.day] = {};
          allMap[month][row.item_name][row.day][row.session] = row;
        });
      };

      const discoveredItems = new Set();
      responses.forEach((res, i) => {
        if (res.data.success && res.data.data) {
          parseRows(res.data.data, DYNAMIC_MONTHS[i]);
          res.data.data.forEach(row => {
            const name = (row.item_name || '').trim();
            if (name && !ALL_ITEMS.some(i => i.trim() === name)) {
              discoveredItems.add(name);
            }
          });
        }
      });
      setCustomItems(Array.from(discoveredItems));

      // Restore persisted deleted items from DB
      if (deletedRes.data?.success && Array.isArray(deletedRes.data.data)) {
        setDeletedItems(deletedRes.data.data);
      } else {
        setDeletedItems([]);
      }

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
      // Clear hydration flag AFTER all state has been set, so the persist
      // effect can safely fire for subsequent user-triggered changes.
      isHydratingRef.current = false;
    }
  };

  useEffect(() => {
    loadInventory(false, monthYear);
  }, [monthYear]);

  // NOTE: Deleted items are persisted directly inside handleDeleteItem and
  // handleDeleteAllExpired. There is intentionally NO useEffect watching
  // [deletedItems] here — such an effect would fire every time loadInventory
  // restores the list from the DB, racing with the load and overwriting the
  // DB with an empty array before the fetch completes.

  useEffect(() => {
    if (activeTab === 'matrix') {
      const fetchMatrixLogs = async () => {
        try {
          setLoadingLogs(true);
          const res = await api.get(`/clinical/inventory/change-logs?month_year=${monthYear}&consumed_only=true`);
          if (res.data.success) {
            setAuditLogs(res.data.data);
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to load audit logs.');
        } finally {
          setLoadingLogs(false);
        }
      };
      fetchMatrixLogs();
    }
  }, [activeTab, monthYear]);

  useEffect(() => {
    setLogsPage(1);
  }, [searchTerm, timeFilter]);

  // Handle cell input edits locally
  const handleCellEdit = (itemName, field, val, targetDay = currentDay, targetSession = currentSession) => {
    if ((field === 'consumed' || field === 'responsible_name') && !selectedWard) {
      toast.error('Please select a ward (STN1 or MINOR) before making stock changes.', { duration: 4000 });
      return;
    }

    let cleanVal = ['responsible_name', 'expiration_date', 'status', 'category'].includes(field) ? val : (parseInt(val, 10) || 0);

    if (field === 'expiration_date' && typeof val === 'string') {
      const cleanExp = val.trim().toLowerCase();
      const parts = cleanExp.split('/');
      if (parts.length === 2) {
        const month = parseInt(parts[0], 10);
        const year = parseInt(parts[1], 10);
        if (!isNaN(month) && !isNaN(year) && month >= 1 && month <= 12) {
          // Expiration date has to be the last day of the expiration date month
          const lastDay = new Date(year, month, 0).getDate();
          const paddedDay = String(lastDay).padStart(2, '0');
          const paddedMonth = String(month).padStart(2, '0');
          cleanVal = `${paddedDay}/${paddedMonth}/${year}`;
        }
      }
    }

    if (field === 'consumed') {
      const cellData = getCellForMonth(monthYear, itemName, targetDay, targetSession);
      const otherConsumed = selectedWard === 'STN1' ? (cellData.consumed_minor || 0) : (cellData.consumed_obs1 || 0);
      const newTotal = cleanVal + otherConsumed;
      
      if (newTotal > cellData.stock_in_hands) {
        toast.error(`Cannot consume more than available stock (${cellData.stock_in_hands})!`, { duration: 4000 });
        return;
      }
    }

    setAllMonthsMap(prev => {
      const monthMap = { ...(prev[monthYear] || {}) };
      if (!monthMap[itemName]) monthMap[itemName] = {};
      if (!monthMap[itemName][targetDay]) monthMap[itemName][targetDay] = {};
      if (!monthMap[itemName][targetDay][targetSession]) {
        const carried = getCarriedStockForMonth(monthYear, itemName, targetDay, targetSession);
        const excelMeta = EXCEL_DATA[itemName] || {};
        monthMap[itemName][targetDay][targetSession] = {
          stock_in_hands: carried,
          consumed: 0,
          consumed_obs1: 0,
          consumed_minor: 0,
          balance: carried,
          responsible_name: '',
          user_stn1: '',
          user_minor: '',
          expiration_date: excelMeta.expiry || '',
          status: carried <= 0 ? 'Outstock' : (excelMeta.status || 'Available'),
          category: excelMeta.category || ''
        };
      }

      const cell = { ...monthMap[itemName][targetDay][targetSession] };

      // Ensure all fields exist
      if (cell.consumed_obs1 === undefined) {
        cell.consumed_obs1 = (cell.consumed !== undefined && cell.consumed !== '') ? parseInt(cell.consumed, 10) || 0 : 0;
      }
      if (cell.consumed_minor === undefined) cell.consumed_minor = 0;
      if (cell.user_stn1 === undefined) cell.user_stn1 = cell.responsible_name || '';
      if (cell.user_minor === undefined) cell.user_minor = '';

      let targetField = field;
      if (field === 'consumed') {
        targetField = selectedWard === 'STN1' ? 'consumed_obs1' : 'consumed_minor';
      } else if (field === 'responsible_name') {
        targetField = selectedWard === 'STN1' ? 'user_stn1' : 'user_minor';
      }

      cell[targetField] = cleanVal;

      // Auto status update when expiration_date is edited
      if (field === 'expiration_date') {
        const calculateStatusFromExpiry = (expiryDate) => {
          if (!expiryDate) return 'Available';
          const cleanExp = expiryDate.trim().toLowerCase();
          if (cleanExp === 'no expiry listed' || cleanExp === 'no expiry' || cleanExp === '') {
            return 'Available';
          }
          const parts = cleanExp.split('/');
          if (parts.length === 2) {
            const month = parseInt(parts[0], 10);
            const year = parseInt(parts[1], 10);
            if (!isNaN(month) && !isNaN(year)) {
              const itemDate = new Date(year, month - 1, 1);
              const expiryThreshold = new Date(2026, 5, 2); // June 2, 2026
              const nearExpiryThreshold = new Date(2026, 11, 2); // December 2, 2026
              if (itemDate <= expiryThreshold) {
                return 'Expired';
              } else if (itemDate <= nearExpiryThreshold) {
                return 'Near Expiry';
              } else {
                return 'Available';
              }
            }
          }
          return 'Available';
        };
        cell.status = calculateStatusFromExpiry(cleanVal);
      }

      // Auto balance calculation: balance = stock - (consumed_obs1 + consumed_minor)
      cell.consumed = (parseInt(cell.consumed_obs1, 10) || 0) + (parseInt(cell.consumed_minor, 10) || 0);
      cell.balance = cell.stock_in_hands - cell.consumed;
      cell.responsible_name = selectedWard === 'STN1' ? cell.user_stn1 : cell.user_minor;
      cell.manually_edited = true;

      monthMap[itemName][targetDay][targetSession] = cell;

      // Dynamic carry-over propagation: Update all subsequent days/sessions in this monthMap
      let currentDayIter = targetDay;
      let currentSessionIter = targetSession === 'AM' ? 'PM' : 'AM';
      if (targetSession === 'PM') currentDayIter++;

      const [y, m] = monthYear.split('-');
      const daysInMonth = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();

      // Resolves the carried-in stock for (day, session) by walking backward
      // through any gap in monthMap[itemName] instead of assuming the
      // immediately-preceding cell exists. A single-step lookup defaults to 0
      // across a gap, which — combined with the write below — would silently
      // zero out an unrelated, already-recorded later day.
      const daysMap = monthMap[itemName];
      const resolveCarriedBalance = (day, session) => {
        if (day === 1 && session === 'AM') {
          return getCarriedStockForMonth(monthYear, itemName, 1, 'AM');
        }
        if (session === 'PM') {
          const amCell = daysMap[day]?.['AM'];
          if (amCell && amCell.balance !== undefined && amCell.balance !== '') {
            return amCell.balance;
          }
          return resolveCarriedBalance(day, 'AM');
        }
        const pmCell = daysMap[day - 1]?.['PM'];
        if (pmCell && pmCell.balance !== undefined && pmCell.balance !== '') {
          return pmCell.balance;
        }
        return resolveCarriedBalance(day - 1, 'AM');
      };

      while (currentDayIter <= daysInMonth) {
        if (!monthMap[itemName][currentDayIter]) {
          monthMap[itemName][currentDayIter] = {};
        }

        // Calculate what the stock in hand should be based on previous session balance
        const prevBalance = resolveCarriedBalance(currentDayIter, currentSessionIter);

        // If the cell doesn't exist, we can initialize it or leave it to be resolved dynamically.
        // If it exists but was never independently recorded (auto-carried only),
        // keep it in sync with the edit that started this ripple. But a cell
        // that was itself manually recorded (typed by a human, at any point —
        // truthy check because DB-hydrated cells carry this as 0/1, not a JS
        // boolean) is authoritative and must NOT be silently overwritten just
        // because an earlier day in the same ledger was corrected.
        const existingCell = monthMap[itemName][currentDayIter][currentSessionIter];
        if (existingCell && !existingCell.manually_edited) {
          const targetCell = { ...existingCell };
          targetCell.stock_in_hands = prevBalance;
          targetCell.consumed = (parseInt(targetCell.consumed_obs1, 10) || 0) + (parseInt(targetCell.consumed_minor, 10) || 0);
          targetCell.balance = targetCell.stock_in_hands - targetCell.consumed;
          monthMap[itemName][currentDayIter][currentSessionIter] = targetCell;
        }

        // Advance iteration
        if (currentSessionIter === 'AM') {
          currentSessionIter = 'PM';
        } else {
          currentSessionIter = 'AM';
          currentDayIter++;
        }
      }

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
            const consObs1 = cell.consumed_obs1 !== undefined ? cell.consumed_obs1 : (selectedWard === 'STN1' ? cell.consumed : 0);
            const consMinor = cell.consumed_minor !== undefined ? cell.consumed_minor : (selectedWard === 'MINOR' ? cell.consumed : 0);
            const uObs1 = cell.user_stn1 !== undefined ? cell.user_stn1 : (selectedWard === 'STN1' ? cell.responsible_name : '');
            const uMinor = cell.user_minor !== undefined ? cell.user_minor : (selectedWard === 'MINOR' ? cell.responsible_name : '');

            itemsToSave.push({
              item_name: itemName,
              day: parseInt(d, 10),
              session: s,
              stock_in_hands: cell.stock_in_hands || 0,
              consumed: (parseInt(consObs1, 10) || 0) + (parseInt(consMinor, 10) || 0),
              consumed_obs1: consObs1 || 0,
              consumed_minor: consMinor || 0,
              balance: (cell.stock_in_hands || 0) - ((parseInt(consObs1, 10) || 0) + (parseInt(consMinor, 10) || 0)),
              responsible_name: selectedWard === 'STN1' ? uObs1 : uMinor,
              user_stn1: uObs1 || '',
              user_minor: uMinor || '',
              expiration_date: cell.expiration_date || '',
              status: cell.status || 'Active',
              category: cell.category || '',
              // Truthy check, not strict === true: cells hydrated from the DB
              // carry this as the SQLite integer 1/0, not a JS boolean.
              manually_edited: !!cell.manually_edited
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

  // Add custom item to ledger
  const handleCreateItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return toast.error('Please enter a valid item name.');
    if (lockStock) return toast.error('Please unlock stock editing before adding new items.');

    const name = newItemName.trim();

    // Add to local customItems state if not exists
    if (!ALL_ITEMS.includes(name)) {
      setCustomItems(prev => {
        if (prev.includes(name)) return prev;
        return [...prev, name];
      });
    }

    const stock = parseInt(newItemStock, 10) || 0;

    // Directly seed the cell in allMonthsMap without going through handleCellEdit
    // (which requires selectedWard for consumed/responsible_name fields)
    setAllMonthsMap(prev => {
      const monthMap = { ...(prev[monthYear] || {}) };
      if (!monthMap[name]) monthMap[name] = {};
      if (!monthMap[name][currentDay]) monthMap[name][currentDay] = {};
      monthMap[name][currentDay][currentSession] = {
        stock_in_hands: stock,
        consumed: 0,
        consumed_obs1: 0,
        consumed_minor: 0,
        balance: stock,
        responsible_name: '',
        user_stn1: '',
        user_minor: '',
        expiration_date: newItemExpDate,
        status: newItemStatus,
        category: newItemCategory,
        manually_edited: true
      };
      return { ...prev, [monthYear]: monthMap };
    });

    // Reset inputs
    setNewItemName('');
    setNewItemStock('0');
    setNewItemExpDate('');
    setNewItemStatus('Available');

    setShowCreateModal(false);
    toast.success(`Successfully added "${name}" to checkup list!`);
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

  const filteredLogs = useMemo(() => {
    if (!auditLogs) return [];
    const now = new Date();

    return auditLogs.filter(log => {
      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesItem = log.item_name && log.item_name.toLowerCase().includes(term);
        const matchesUser = log.updated_by && log.updated_by.toLowerCase().includes(term);
        if (!matchesItem && !matchesUser) return false;
      }

      const logDate = new Date(log.updated_at);
      const diffTime = Math.abs(now - logDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (timeFilter === 'daily') {
        return logDate.toDateString() === now.toDateString() || diffDays <= 1;
      }
      if (timeFilter === 'weekly') {
        return diffDays <= 7;
      }
      if (timeFilter === 'monthly') {
        return diffDays <= 30;
      }
      if (timeFilter === 'quarterly') {
        return diffDays <= 90;
      }
      if (timeFilter === 'yearly') {
        return diffDays <= 365;
      }
      return true; // 'all'
    });
  }, [auditLogs, searchTerm, timeFilter]);

  // "Stock Changes" tab — consumption per item, broken down per day → session
  // (AM/PM) → ward (Station 1 / Minor). Built from the month's logs and the
  // search box (the updated_at time filters no longer apply here).
  const consumptionByItem = useMemo(() => {
    const items = new Map();
    const term = searchTerm.trim().toLowerCase();
    for (const l of auditLogs) {
      if (term) {
        const hit = (l.item_name && l.item_name.toLowerCase().includes(term)) ||
          (l.updated_by && l.updated_by.toLowerCase().includes(term));
        if (!hit) continue;
      }
      const stnD = (Number(l.new_consumed_obs1) || 0) - (Number(l.old_consumed_obs1) || 0);
      const minD = (Number(l.new_consumed_minor) || 0) - (Number(l.old_consumed_minor) || 0);
      const consD = (Number(l.new_consumed) || 0) - (Number(l.old_consumed) || 0);
      if (stnD <= 0 && minD <= 0 && consD <= 0) continue;   // consumption only
      const day = Number(l.day);
      const isPM = String(l.session || '').toUpperCase() === 'PM';
      let it = items.get(l.item_name);
      if (!it) { it = { item_name: l.item_name, byDay: new Map(), users: new Set() }; items.set(l.item_name, it); }
      let d = it.byDay.get(day);
      if (!d) { d = { day, amStn: 0, amMin: 0, pmStn: 0, pmMin: 0, users: new Set(), latest: 0, lastStock: 0, lastBalance: 0 }; it.byDay.set(day, d); }
      if (isPM) { d.pmStn += stnD; d.pmMin += minD; } else { d.amStn += stnD; d.amMin += minD; }
      if (l.updated_by) { d.users.add(l.updated_by); it.users.add(l.updated_by); }
      const t = new Date(l.updated_at).getTime();
      if (t >= d.latest) { d.latest = t; d.lastStock = Number(l.new_stock) || 0; d.lastBalance = (Number(l.new_stock) || 0) - (Number(l.new_consumed) || 0); }
    }
    // finalize day totals
    for (const it of items.values()) {
      for (const d of it.byDay.values()) d.total = d.amStn + d.amMin + d.pmStn + d.pmMin;
    }
    return items;
  }, [auditLogs, searchTerm]);

  // Daily view: items consumed on the selected day, with the session×ward grid.
  const dailyItems = useMemo(() => {
    const arr = [];
    for (const it of consumptionByItem.values()) {
      const d = it.byDay.get(Number(logDay));
      if (d && d.total > 0) arr.push({ item_name: it.item_name, ...d, users: [...d.users] });
    }
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [consumptionByItem, logDay]);

  // Monthly view: per-item totals with AM/PM + Station1/Minor split and daily chart.
  const monthlyItems = useMemo(() => {
    const arr = [];
    for (const it of consumptionByItem.values()) {
      let total = 0, amTot = 0, pmTot = 0, stnTot = 0, minTot = 0, latest = 0, lastStock = 0, lastBalance = 0;
      const days = [];
      for (const d of it.byDay.values()) {
        total += d.total; amTot += d.amStn + d.amMin; pmTot += d.pmStn + d.pmMin;
        stnTot += d.amStn + d.pmStn; minTot += d.amMin + d.pmMin;
        if (d.total > 0) days.push([d.day, d.total]);
        if (d.latest >= latest) { latest = d.latest; lastStock = d.lastStock; lastBalance = d.lastBalance; }
      }
      if (total > 0) {
        days.sort((a, b) => a[0] - b[0]);
        const peak = days.reduce((m, x) => (!m || x[1] > m[1] ? x : m), null);
        arr.push({ item_name: it.item_name, total, amTot, pmTot, stnTot, minTot, days, peakDay: peak ? peak[0] : null, peakVal: peak ? peak[1] : 0, users: [...it.users], lastStock, lastBalance });
      }
    }
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [consumptionByItem]);

  // Weekly view: weeks are day ranges within the month (1–7, 8–14, …, 29–31).
  const weekRange = (w) => [(w - 1) * 7 + 1, Math.min(w * 7, 31)];
  const weeklyItems = useMemo(() => {
    const [lo, hi] = weekRange(logWeek);
    const arr = [];
    for (const it of consumptionByItem.values()) {
      let amStn = 0, amMin = 0, pmStn = 0, pmMin = 0, latest = 0, lastStock = 0, lastBalance = 0;
      const users = new Set();
      const days = [];
      for (const d of it.byDay.values()) {
        if (d.day < lo || d.day > hi) continue;
        amStn += d.amStn; amMin += d.amMin; pmStn += d.pmStn; pmMin += d.pmMin;
        d.users.forEach(u => users.add(u));
        if (d.total > 0) days.push([d.day, d.total]);
        if (d.latest >= latest) { latest = d.latest; lastStock = d.lastStock; lastBalance = d.lastBalance; }
      }
      const total = amStn + amMin + pmStn + pmMin;
      if (total > 0) {
        days.sort((a, b) => a[0] - b[0]);
        const peak = days.reduce((m, x) => (!m || x[1] > m[1] ? x : m), null);
        arr.push({ item_name: it.item_name, amStn, amMin, pmStn, pmMin, total, users: [...users], days, peakDay: peak ? peak[0] : null, peakVal: peak ? peak[1] : 0, lastStock, lastBalance });
      }
    }
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [consumptionByItem, logWeek]);

  // When a month's logs load, jump the daily/weekly view to the most recent day
  // that actually has consumption, so the default view is never needlessly empty.
  useEffect(() => {
    if (!auditLogs || auditLogs.length === 0) return;
    let maxDay = 0;
    for (const l of auditLogs) {
      const c = (Number(l.new_consumed) || 0) - (Number(l.old_consumed) || 0);
      if (c > 0 && Number(l.day) > maxDay) maxDay = Number(l.day);
    }
    if (maxDay > 0) { setLogDay(maxDay); setLogWeek(Math.floor((maxDay - 1) / 7) + 1); setLogsPage(1); }
  }, [auditLogs]);

  const activeConsumptionList = logViewMode === 'daily' ? dailyItems : logViewMode === 'weekly' ? weeklyItems : monthlyItems;
  const totalConsumedUnits = activeConsumptionList.reduce((s, it) => s + it.total, 0);
  const itemsPerPage = 24;
  const totalPages = Math.ceil(activeConsumptionList.length / itemsPerPage);
  const safeLogsPage = Math.max(1, Math.min(logsPage, totalPages || 1));
  const paginatedItems = activeConsumptionList.slice((safeLogsPage - 1) * itemsPerPage, safeLogsPage * itemsPerPage);

  const resolveStatus = (balance, expiryStr) => {
    if (balance <= 0) return 'Outstock';

    const cleanExpiry = (expiryStr || '').trim();
    if (!cleanExpiry || cleanExpiry === 'No Expiry Listed' || !cleanExpiry.includes('/')) {
      return 'Available';
    }

    const parts = cleanExpiry.split('/');
    if (parts.length === 3) {
      const dayVal = parseInt(parts[0], 10);
      const monthVal = parseInt(parts[1], 10);
      const yearVal = parseInt(parts[2], 10);
      if (!isNaN(dayVal) && !isNaN(monthVal) && !isNaN(yearVal)) {
        const expiryDate = new Date(yearVal, monthVal - 1, dayVal);
        const expiredThreshold = new Date(2026, 5, 2); // June 2, 2026
        const nearExpiryThreshold = new Date(2026, 11, 2); // December 2, 2026
        if (expiryDate <= expiredThreshold) {
          return 'Expired';
        } else if (expiryDate <= nearExpiryThreshold) {
          return 'Near Expiry';
        } else {
          return 'Available';
        }
      }
    } else if (parts.length === 2) {
      const monthVal = parseInt(parts[0], 10);
      const yearVal = parseInt(parts[1], 10);
      if (!isNaN(monthVal) && !isNaN(yearVal)) {
        // Expiration date has to be the last day of the expiration date month
        const expiryDate = new Date(yearVal, monthVal, 0);
        const expiredThreshold = new Date(2026, 5, 2);
        const nearExpiryThreshold = new Date(2026, 11, 2);
        if (expiryDate <= expiredThreshold) {
          return 'Expired';
        } else if (expiryDate <= nearExpiryThreshold) {
          return 'Near Expiry';
        } else {
          return 'Available';
        }
      }
    }

    return 'Available';
  };

  const getCellForMonth = (month, item, day, session) => {
    const cacheKey = `${month}-${item}-${day}-${session}-${selectedWard}`;
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

    // Resolve ward-specific consumed
    let consumed_obs1 = (record && record.consumed_obs1 !== undefined && record.consumed_obs1 !== '') ? parseInt(record.consumed_obs1, 10) || 0 : 0;
    let consumed_minor = (record && record.consumed_minor !== undefined && record.consumed_minor !== '') ? parseInt(record.consumed_minor, 10) || 0 : 0;

    // Backwards compatibility for existing records
    if (consumed_obs1 === 0 && consumed_minor === 0 && record && record.consumed) {
      consumed_obs1 = parseInt(record.consumed, 10) || 0;
    }

    const user_stn1 = record?.user_stn1 || (consumed_obs1 > 0 ? (record?.responsible_name || '') : '');
    const user_minor = record?.user_minor || '';

    // Total consumed across all wards for balance calculation
    const totalConsumed = consumed_obs1 + consumed_minor;

    // Resolve balance: stock - total consumed
    const balance = stock - totalConsumed;

    // Active ward values
    const consumed = selectedWard === 'STN1' ? consumed_obs1 : consumed_minor;
    const responsible_name = selectedWard === 'STN1' ? user_stn1 : user_minor;

    const excelMeta = EXCEL_DATA[item] || {};
    const expiryValue = (record?.expiration_date !== undefined && record?.expiration_date !== '') ? record.expiration_date : (excelMeta.expiry || '');

    // Auto-calculate dynamic status based on Excel formula thresholds!
    const calculatedStatus = resolveStatus(balance, expiryValue);

    const result = {
      stock_in_hands: stock,
      consumed: consumed,
      consumed_obs1: consumed_obs1,
      consumed_minor: consumed_minor,
      balance: balance,
      responsible_name: responsible_name,
      user_stn1: user_stn1,
      user_minor: user_minor,
      expiration_date: expiryValue,
      status: (record?.status !== undefined && record?.status !== '') ? record.status : calculatedStatus,
      category: (record?.category !== undefined && record?.category !== '') ? record.category : (excelMeta.category || '')
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

  // Renders the session focus checkup list — deduplicate via Set to prevent double entries
  const filteredItems = [...new Set([...ALL_ITEMS, ...customItems])]
    .filter(item => !deletedItems.includes(item))
    .filter(item => {
      // 1. Filter by category
      if (selectedCategory !== 'all') {
        const isSeeded = ALL_ITEMS.includes(item);
        if (isSeeded) {
          const match = CATEGORIES[selectedCategory]?.items.includes(item);
          if (!match) return false;
        } else {
          const cell = getCell(item);
          const itemCat = cell.category || 'medical_supplies';
          if (itemCat !== selectedCategory) return false;
        }
      }
      // 2. Filter by search query
      if (searchTerm) {
        return item.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    });

  const filteredActiveItems = filteredItems.filter(item => {
    const cell = getCell(item);
    return cell.status !== 'Expired';
  });

  const filteredExpiredItems = filteredItems.filter(item => {
    const cell = getCell(item);
    return cell.status === 'Expired';
  });

  // Active Checkup shows ALL filtered items (expired rows are visually grayed out inline)
  // Expired Inventory tab shows only expired items for dedicated management/deletion
  const displayItems = activeTab === 'expired_inventory' ? filteredExpiredItems : filteredItems;

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

        {/* Global Consolidated Toolbar */}
        <div className="flex flex-wrap items-center gap-3 select-none">
          {/* Month Selector */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <span className="text-[10px] font-black uppercase text-slate-400 mr-2">Period</span>
            <select
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              className="bg-transparent border-none text-xs font-black text-slate-800 outline-none cursor-pointer py-1"
            >
              {DYNAMIC_MONTHS.map(m => (
                <option key={m} value={m} disabled={isNurse && m < CURRENT_MONTH_STR}>{getMonthLabel(m)}</option>
              ))}
            </select>
          </div>

          {/* Unified Lock & Save Controls */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
            <Button
              disabled={loading}
              onClick={() => {
                if (lockStock) {
                  setShowUnlockModal(true);
                } else {
                  setLockStock(true);
                  toast.success('Stock count editing LOCKED.', { icon: '🔒' });
                }
              }}
              className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 border ${!lockStock ? 'bg-amber-500 hover:bg-amber-600 text-white border-transparent shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
            >
              {lockStock ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              {lockStock ? 'Unlock Stock' : 'Stock Editable'}
            </Button>

            <Button
              disabled={saving || loading}
              onClick={handleSave}
              className="bg-[#0369a1] hover:bg-[#075985] text-white px-3.5 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 border-0 shadow-sm"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save Changes
            </Button>
          </div>

          {/*  UTILITY TOOLS Dropdown Menu */}
          <div className="relative">
            <Button
              disabled={loading}
              onClick={() => setShowToolsDropdown(!showToolsDropdown)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 border-0 transition-all active:scale-[0.98]"
            >
              <RotateCw className="h-4 w-4" />
              UTILITY TOOLS
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showToolsDropdown ? 'rotate-180' : ''}`} />
            </Button>

            {showToolsDropdown && (
              <>
                {/* Clickaway backdrop */}
                <div className="fixed inset-0 z-45 cursor-default" onClick={() => setShowToolsDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 w-[240px] bg-white border border-slate-200/80 shadow-2xl rounded-2xl p-2.5 z-50 origin-top-right animate-in fade-in slide-in-from-top-2 duration-150 text-left">

                  {/* Action 1: Create Custom Item */}
                  <button
                    onClick={() => {
                      if (lockStock) {
                        toast.error('Unlock stock editing to add new items.');
                        setShowToolsDropdown(false);
                        return;
                      }
                      setShowCreateModal(true);
                      setShowToolsDropdown(false);
                    }}
                    title={lockStock ? 'Unlock stock to add new items' : 'Add a custom item to the roster'}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all border-none bg-transparent ${lockStock ? 'text-slate-400 cursor-not-allowed opacity-60' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    <span className={`p-1 rounded-lg ${lockStock ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600'}`}><PackagePlus size={14} /></span>
                    Create Custom Item
                    {lockStock && <span className="ml-auto text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Locked</span>}
                  </button>

                  {/* Action 2: Sync with DB */}
                  <button
                    onClick={() => {
                      loadInventory(true);
                      setShowToolsDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all border-none bg-transparent"
                  >
                    <span className="p-1 bg-sky-50 text-sky-600 rounded-lg"><RotateCw size={14} /></span>
                    Synchronize Database
                  </button>

                  {/* Action Sync Central Stock */}
                  <button
                    onClick={() => {
                      handleSyncCentralStock();
                      setShowToolsDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all border-none bg-transparent"
                  >
                    <span className="p-1 bg-sky-105 text-sky-700 rounded-lg"><RotateCw size={14} /></span>
                    Sync Central Store Stock
                  </button>

                  {/* Action Requisition Stock */}
                  <button
                    onClick={() => {
                      loadRequisitions();
                      setShowReqListModal(true);
                      setShowToolsDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all border-none bg-transparent"
                  >
                    <span className="p-1 bg-indigo-50 text-indigo-650 rounded-lg"><Activity size={14} /></span>
                    Stock Requisitions
                  </button>

                  {/* Action 3: Export Excel */}
                  <button
                    onClick={() => {
                      setShowExportModal(true);
                      setShowToolsDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all border-none bg-transparent"
                  >
                    <span className="p-1 bg-purple-50 text-purple-600 rounded-lg"><FileSpreadsheet size={14} /></span>
                    Export Excel Ledger
                  </button>

                  {/* Action 4: Audit Logs */}
                  <button
                    onClick={() => {
                      handleFetchLogs();
                      setShowToolsDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all border-none bg-transparent"
                  >
                    <span className="p-1 bg-amber-50 text-amber-600 rounded-lg"><Activity size={14} /></span>
                    View Audit Logs
                  </button>

                  {/* Action 5: Stock Password (Admin Only) */}
                  {isAdmin && (
                    <>
                      <div className="my-1.5 border-t border-slate-100" />
                      <button
                        onClick={handleOpenPasswordModal}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition-all border-none bg-transparent group"
                      >
                        <span className="p-1 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-100"><KeyRound size={14} /></span>
                        Stock Lock Password
                        <span className="ml-auto text-[9px] font-black uppercase tracking-wider text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100">Admin</span>
                      </button>
                    </>
                  )}

                </div>
              </>
            )}

            {/* Nested organic Excel Export modal dialog popup */}
            {showExportModal && (
              <>
                <div
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setShowExportModal(false)}
                />
                <div className="absolute right-0 top-full mt-2.5 w-[360px] bg-white border border-slate-200/80 shadow-2xl rounded-3xl p-5 z-50 origin-top-right transform animate-in fade-in slide-in-from-top-4 duration-200 ease-out select-none">

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

                  <div className="space-y-4 text-left">
                    <p className="text-[10px] text-slate-500 font-bold leading-normal">
                      Export high-fidelity spreadsheets with daily grids and weekly summaries linked by reactive formulas. Select a single month, or bundle every recorded period in a single workbook.
                    </p>

                    <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Option 1: Export Specific Month</div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center">
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

            {/* Audit Logs Modal */}
            <Modal isOpen={showLogsModal} onClose={() => setShowLogsModal(false)} title={`Stock Change Log — ${getMonthLabel(monthYear)}`}>
              <div className="p-4">
                {/* ── Filter bar ── */}
                <div className="flex flex-wrap items-end gap-2 pb-3 mb-3 border-b border-slate-100">
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Item</label>
                    <select value={logFilterItem} onChange={(e) => setLogFilterItem(e.target.value)}
                      className="w-full px-2.5 py-2 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500">
                      <option value="">All items</option>
                      {logItemOptions.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="min-w-[130px]">
                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Nurse</label>
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={logFilterNurse} onChange={(e) => setLogFilterNurse(e.target.value)} placeholder="name…"
                        className="w-full pl-7 pr-2 py-2 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500" />
                    </div>
                  </div>
                  <div className="min-w-[90px]">
                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Ward</label>
                    <select value={logFilterWard} onChange={(e) => setLogFilterWard(e.target.value)}
                      className="w-full px-2.5 py-2 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500">
                      <option value="">All</option>
                      <option value="STN1">STN1</option>
                      <option value="MINOR">MINOR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Days</label>
                    <div className="flex items-center gap-1">
                      <input type="number" min="1" max="31" value={logFromDay} onChange={(e) => setLogFromDay(e.target.value)} placeholder="1"
                        className="w-14 px-2 py-2 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500 text-center" />
                      <span className="text-slate-300 text-xs">–</span>
                      <input type="number" min="1" max="31" value={logToDay} onChange={(e) => setLogToDay(e.target.value)} placeholder="31"
                        className="w-14 px-2 py-2 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500 text-center" />
                    </div>
                  </div>
                  <button
                    onClick={() => setLogConsumedOnly(v => !v)}
                    title="Toggle between showing only consumed items and all changes"
                    className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black rounded-xl border transition-all ${
                      logConsumedOnly
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    <Check size={12} /> {logConsumedOnly ? 'Consumed only' : 'All changes'}
                  </button>
                  {anyLogFilter && (
                    <button onClick={clearLogFilters}
                      className="flex items-center gap-1 px-3 py-2 text-[10px] font-black text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-all">
                      <X size={12} /> Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <Filter size={11} /> {groupedChangeLogs.length} item-session{groupedChangeLogs.length !== 1 ? 's' : ''} · {stockChangeLogs.length} change{stockChangeLogs.length !== 1 ? 's' : ''}
                  {anyLogFilter && auditLogs.length !== stockChangeLogs.length && <span className="text-slate-300 normal-case font-bold">(of {auditLogs.length})</span>}
                </div>

                <div className="max-h-[52vh] overflow-y-auto space-y-2.5 pr-1">
                  {loadingLogs ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
                    </div>
                  ) : groupedChangeLogs.length > 0 ? (
                    groupedChangeLogs.slice(0, logRenderLimit).map((g) => {
                      const noQty = !g.stockDelta && !g.consumedDelta && !g.stnDelta && !g.minDelta;
                      const nurses = [...new Set([...g.stnNurses, ...g.minNurses])];
                      const isOpen = !!expandedGroups[g.key];
                      const multi = g.changes.length > 1;
                      return (
                        <div key={g.key} className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <div>
                              <span className="font-black text-slate-800 text-xs">{g.item_name}</span>
                              <span className="ml-2 text-[10px] text-slate-400 font-bold">Day {g.day} · {g.session}</span>
                              {multi && (
                                <span className="ml-2 text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.5">
                                  {g.changes.length} changes
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 shrink-0">
                              <Clock size={10} /> {new Date(g.latest).toLocaleString()}
                            </span>
                          </div>

                          {/* Combined net change for the whole session */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <DeltaChip label="Stock" delta={g.stockDelta} variant="stock" />
                            <DeltaChip label="Consumed" delta={g.consumedDelta} variant="consumed" />
                            <DeltaChip label="STN1" delta={g.stnDelta} variant="consumed" />
                            <DeltaChip label="MINOR" delta={g.minDelta} variant="consumed" />
                            {noQty && nurses.length === 0 && (
                              <span className="text-[10px] text-slate-400 italic">Adjustment (no quantity change)</span>
                            )}
                          </div>

                          {nurses.length > 0 && (
                            <p className="mt-1.5 text-[10px] text-slate-500">Nurses: <span className="font-semibold text-slate-700">{nurses.join(', ')}</span></p>
                          )}

                          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-[10px] text-slate-500 min-w-0">
                              <User size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate">Users: <span className="font-black text-slate-700">{g.users.length ? g.users.join(', ') : '—'}</span></span>
                            </span>
                            {multi && (
                              <button onClick={() => toggleGroup(g.key)}
                                className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black text-sky-700 hover:text-sky-800">
                                {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />} {isOpen ? 'Hide' : 'Full'} details
                              </button>
                            )}
                          </div>

                          {/* Expandable full detail: every individual change in this session */}
                          {isOpen && multi && (
                            <div className="mt-2 space-y-2 border-l-2 border-slate-100 pl-2.5">
                              {g.changes.map((log, i) => {
                                const sD = (log.new_stock || 0) - (log.old_stock || 0);
                                const cD = (log.new_consumed || 0) - (log.old_consumed || 0);
                                const snD = (log.new_consumed_obs1 || 0) - (log.old_consumed_obs1 || 0);
                                const mD = (log.new_consumed_minor || 0) - (log.old_consumed_minor || 0);
                                return (
                                  <div key={i} className="text-[10px]">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-black text-slate-600">{log.updated_by}</span>
                                      <span className="text-slate-400">{new Date(log.updated_at).toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                      <DeltaChip label="Stock" delta={sD} variant="stock" />
                                      <DeltaChip label="Consumed" delta={cD} variant="consumed" />
                                      <DeltaChip label="STN1" delta={snD} variant="consumed" />
                                      <DeltaChip label="MINOR" delta={mD} variant="consumed" />
                                    </div>
                                    <div className="text-slate-400 mt-0.5">
                                      Stock {log.old_stock}→{log.new_stock} · Consumed {log.old_consumed}→{log.new_consumed}
                                      {log.old_user_stn1 !== log.new_user_stn1 && <> · STN1 nurse → <b className="text-sky-700">{log.new_user_stn1 || 'None'}</b></>}
                                      {log.old_user_minor !== log.new_user_minor && <> · MINOR nurse → <b className="text-emerald-700">{log.new_user_minor || 'None'}</b></>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-500 font-semibold text-xs">
                      {auditLogs.length === 0 ? 'No change logs found for this month.' : 'No changes match these filters.'}
                    </div>
                  )}

                  {!loadingLogs && groupedChangeLogs.length > logRenderLimit && (
                    <div className="pt-2 text-center">
                      <button onClick={() => setLogRenderLimit(l => l + LOG_PAGE_SIZE)}
                        className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl border border-sky-200 transition-all">
                        Show more ({groupedChangeLogs.length - logRenderLimit} remaining)
                      </button>
                      <p className="mt-1.5 text-[9px] text-slate-400 font-bold">Tip: use the filters above to narrow this down.</p>
                    </div>
                  )}
                </div>
              </div>
            </Modal>
          </div>
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
        ) : (
          <div className="space-y-6">
            {/* ── Beautiful Premium Persistent Tabs Navigation Bar ── */}
            <div className="flex flex-col md:flex-row justify-between items-center border-b border-slate-200 pb-0.5 select-none gap-4 mb-4 bg-white px-5 py-2.5 rounded-2xl border border-slate-200/50 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveTab('active_checkup')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider relative transition-all border-b-2 -mb-[11px] ${activeTab === 'active_checkup'
                    ? 'border-[#0369a1] text-[#0369a1]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <span>Active Checkup</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeTab === 'active_checkup' ? 'bg-sky-100 text-[#0369a1]' : 'bg-slate-100 text-slate-550'}`}>
                    {filteredActiveItems.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('expired_inventory')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider relative transition-all border-b-2 -mb-[11px] ${activeTab === 'expired_inventory'
                    ? 'border-red-500 text-red-650'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <span>Expired Inventory</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeTab === 'expired_inventory' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-550'}`}>
                    {filteredExpiredItems.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('matrix')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider relative transition-all border-b-2 -mb-[11px] ${activeTab === 'matrix'
                    ? 'border-[#0369a1] text-[#0369a1]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <Activity size={13} />
                  <span>Stock Changes</span>
                </button>
              </div>

              {/* Wards selector buttons (STATION 1, Minor Surgery) */}
              <div className={`flex items-center gap-2 shrink-0 bg-slate-50 p-1 rounded-xl border shadow-inner transition-all duration-500 ${
                !selectedWard ? 'border-amber-400 ring-4 ring-amber-400/20 bg-amber-50/50' : 'border-slate-200/60'
              }`}>
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 ${
                  !selectedWard ? 'text-amber-600 animate-pulse' : 'text-slate-400'
                }`}>
                  {selectedWard ? 'Ward Context:' : '⚠️ Select Ward to Edit:'}
                </span>
                <button
                  onClick={() => setSelectedWard('STN1')}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${selectedWard === 'STN1'
                    ? 'bg-[#003A44] border-[#002D35] text-white shadow-sm active:scale-95'
                    : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                    }`}
                >
                  STN1 (STATION 1)
                </button>
                <button
                  onClick={() => setSelectedWard('MINOR')}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${selectedWard === 'MINOR'
                    ? 'bg-[#003A44] border-[#002D35] text-white shadow-sm active:scale-95'
                    : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                    }`}
                >
                  MINOR (Minor Surgery)
                </button>
              </div>
            </div>

            {/* Render conditional views based on activeTab */}
            {(activeTab === 'active_checkup' || activeTab === 'expired_inventory') ? (
              <div className="space-y-6 select-none">

                {/* Horizontal Header: Session Selector */}
                <Card className="p-4 border border-slate-200/60 shadow-sm bg-white rounded-[24px]">
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-6">

                    {/* Left Side: Session Toggle & Period Indicator */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                      {/* Period Badge */}
                      <div className="bg-gradient-to-br from-sky-50 to-blue-50/50 border border-sky-100/80 rounded-2xl px-4 py-2 text-center shrink-0 w-full sm:w-auto">
                        <span className="text-[9px] font-black uppercase tracking-wider text-sky-600 bg-sky-100/50 px-2 py-0.5 rounded border border-sky-200/40 inline-block mb-1">Selected Period</span>
                        <h4 className="text-lg font-black text-sky-950 leading-none">Day {currentDay} {currentSession}</h4>
                        <p className="text-[9px] text-sky-700/80 font-bold mt-0.5 uppercase tracking-widest">{getMonthLabel(monthYear)}</p>
                      </div>

                      {/* AM/PM Switcher */}
                      <div className="flex bg-slate-100/80 p-1 rounded-2xl w-full sm:w-64 border border-slate-200/40 shadow-inner">
                        <button
                          onClick={() => setCurrentSession('AM')}
                          className={`flex-1 py-2 text-xs font-black rounded-xl uppercase transition-all ${currentSession === 'AM' ? 'bg-[#0369a1] text-white shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          AM Session
                        </button>
                        <button
                          onClick={() => setCurrentSession('PM')}
                          className={`flex-1 py-2 text-xs font-black rounded-xl uppercase transition-all ${currentSession === 'PM' ? 'bg-[#0369a1] text-white shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          PM Session
                        </button>
                      </div>
                    </div>

                    {/* Right Side: Week Selector & Day Buttons */}
                    <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto lg:justify-end">
                      {/* Week Tabs */}
                      <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Week:</span>
                        <div className="flex bg-slate-105 p-0.5 rounded-lg border border-slate-200/40 text-[10px] font-black select-none shrink-0 shadow-inner">
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
                                disabled={isNurse && (() => {
                                  if (monthYear < CURRENT_MONTH_STR) return true;
                                  if (monthYear > CURRENT_MONTH_STR) return false;
                                  const endOfWeekDay = wk === 4 ? 30 : wk * 7;
                                  return endOfWeekDay < new Date().getDate();
                                })()}
                                className={`px-3 py-1 rounded transition-all ${isCurrentWk
                                  ? 'bg-white text-slate-900 shadow-sm font-black'
                                  : 'text-slate-400 hover:text-slate-650'
                                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                                title={`Week ${wk}`}
                              >
                                W{wk}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Day Buttons */}
                      <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Day:</span>
                        <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
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
                                  disabled={isNurse && (() => {
                                    if (monthYear < CURRENT_MONTH_STR) return true;
                                    if (monthYear > CURRENT_MONTH_STR) return false;
                                    return dNum < new Date().getDate();
                                  })()}
                                  className={`w-8 h-8 text-xs font-black rounded-lg transition-all border flex items-center justify-center relative active:scale-95 shadow-sm ${isSelected
                                    ? 'bg-[#0369a1] border-transparent text-white font-black shadow-md'
                                    : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50 hover:border-slate-350'
                                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                                >
                                  {dNum}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>

                  </div>
                </Card>

                {/* Wide Expanded Inventory Items Table Container */}
                <div className="w-full space-y-6">
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

                        <div className="flex items-center gap-3">
                          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                            {displayItems.length} items &bull; {filteredExpiredItems.length} expired
                          </div>
                          {activeTab === 'expired_inventory' && filteredExpiredItems.length > 0 && (
                            <button
                              onClick={handleDeleteAllExpired}
                              title="Remove all expired items from roster"
                              className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all flex items-center gap-1.5 active:scale-[0.97] bg-red-50 hover:bg-red-100 border-red-200 text-red-750 hover:shadow-sm"
                            >
                              <Trash2 size={12} />
                              Delete All Expired
                            </button>
                          )}
                        </div>
                      </div>


                    </div>

                    {/* Main Session Focused Table */}
                    <div className="overflow-x-auto mt-4 custom-scrollbar">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50/50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                            <th className="py-3.5 px-4 w-[240px]">Items</th>
                            <th className="py-3.5 px-4 text-center w-[120px]">Category</th>
                            <th className="py-3.5 px-4 text-center w-[100px]">Batch #</th>
                            <th className="py-3.5 px-4 text-center w-[150px]">Expiration Date</th>
                            <th className="py-3.5 px-4 text-center w-[160px]">Status</th>
                            <th className="py-3.5 px-4 text-center w-[110px]">Stock in hands</th>
                            <th className="py-3.5 px-4 text-center w-[110px]">Consumed items</th>
                            <th className="py-3.5 px-4 text-center w-[110px]">Balance</th>
                            <th className="py-3.5 px-4">Responsible Name</th>
                            <th className="py-3.5 px-4 w-[110px] text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                          {displayItems.length > 0 ? (
                            displayItems.map(item => {
                              const cell = getCell(item);

                              // Determine item category color
                              const catKey = Object.keys(CATEGORIES).find(k => CATEGORIES[k].items.includes(item)) || cell.category || 'medical_supplies';
                              const categoryLabel = CATEGORIES[catKey]?.label || cell.category || 'Medical Supplies';

                              // Exquisite dot indicator styles
                              const dotColor =
                                catKey === 'medical_supplies' ? 'bg-blue-500 ring-blue-100' :
                                  catKey === 'medications' ? 'bg-emerald-500 ring-emerald-100' :
                                    catKey === 'anesthetics' ? 'bg-purple-500 ring-purple-100' :
                                      catKey === 'antiseptics' ? 'bg-amber-500 ring-amber-100' :
                                        catKey === 'sutures' ? 'bg-rose-500 ring-rose-100' :
                                          catKey === 'antidotes' ? 'bg-teal-500 ring-teal-100' : 'bg-pink-500 ring-pink-100';

                              const isExpired = cell.status === 'Expired';
                              const rowStyle = isExpired
                                ? 'bg-slate-100/60 opacity-60 text-slate-400 select-none'
                                : 'hover:bg-slate-50/40 text-slate-700';

                              return (
                                <tr key={item} className={`transition-all align-center ${rowStyle}`}>
                                  {/* Item label */}
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2.5">
                                      <span className={`w-2 h-2 rounded-full shrink-0 ring-4 ${dotColor}`} />
                                      <div className="text-slate-900 font-black text-[13px] tracking-tight">{item}</div>
                                    </div>
                                  </td>

                                  {/* Category Column */}
                                  <td className="py-3 px-4 text-center">
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-150 text-slate-700 border border-slate-200">
                                      {categoryLabel}
                                    </span>
                                  </td>

                                  {/* Batch # Column */}
                                  <td className="py-3 px-4 text-center">
                                    <span className="text-[10px] text-slate-400 font-bold">—</span>
                                  </td>

                                  {/* Expiration Date Column */}
                                  <td className="py-3 px-4 text-center">
                                    <input
                                      type="text"
                                      value={cell.expiration_date || ''}
                                      onChange={(e) => handleCellEdit(item, 'expiration_date', e.target.value)}
                                      placeholder="MM/YYYY or No Expiry"
                                      disabled={isExpired || (isNurse && checkIsPast(monthYear, currentDay, currentSession))}
                                      className={`w-36 text-center py-1.5 px-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none font-bold text-xs transition-all shadow-sm text-slate-800 ${(isExpired || (isNurse && checkIsPast(monthYear, currentDay, currentSession))) ? 'bg-slate-100/80 text-slate-400 cursor-not-allowed border-slate-200 hover:border-slate-200 shadow-none' : ''
                                        }`}
                                    />
                                  </td>

                                  {/* Status Column (Read-Only Pill Badge) */}
                                  <td className="py-3 px-4 text-center">
                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border shadow-sm ${cell.status === 'Expired' ? 'text-red-750 bg-red-50 border-red-200 ring-1 ring-red-50' :
                                      cell.status === 'Near Expiry' ? 'text-amber-700 bg-amber-50 border-amber-200 ring-1 ring-amber-50' :
                                        cell.status === 'Outstock' ? 'text-slate-500 bg-slate-50 border-slate-200 ring-1 ring-slate-50' : 'text-emerald-700 bg-emerald-50 border-emerald-200 ring-1 ring-emerald-50'
                                      }`}>
                                      {cell.status === 'Expired' ? 'EXPIRED' :
                                        cell.status === 'Near Expiry' ? 'Near Expiry (<6mo)' :
                                          cell.status === 'Outstock' ? 'Outstock' : 'Available'}
                                    </span>
                                  </td>

                                  {/* Stock in hands input */}
                                  <td className="py-3 px-4 text-center">
                                    <input
                                      value={cell.stock_in_hands}
                                      onChange={(e) => handleCellEdit(item, 'stock_in_hands', e.target.value)}
                                      placeholder="0"
                                      className={`w-20 text-center py-1.5 px-2 border rounded-xl outline-none font-black text-xs transition-all shadow-sm ${(lockStock || isExpired || (isNurse && checkIsPast(monthYear, currentDay, currentSession)))
                                        ? 'bg-slate-55 text-slate-400 border-slate-200 cursor-not-allowed select-none'
                                        : 'bg-white border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-slate-900'
                                        }`}
                                      type="number"
                                      disabled={lockStock || isExpired || (isNurse && checkIsPast(monthYear, currentDay, currentSession))}
                                    />
                                  </td>

                                  {/* Consumed items input */}
                                  <td className="py-3 px-4 text-center">
                                    <input
                                      value={cell.consumed}
                                      onChange={(e) => handleCellEdit(item, 'consumed', e.target.value)}
                                      placeholder="0"
                                      disabled={isExpired || (isNurse && checkIsPast(monthYear, currentDay, currentSession))}
                                      className={`w-20 text-center py-1.5 px-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none font-black text-xs transition-all shadow-sm ${(isExpired || (isNurse && checkIsPast(monthYear, currentDay, currentSession))) ? 'bg-slate-100/85 text-slate-400 cursor-not-allowed border-slate-200' : ''
                                        }`}
                                      type="number"
                                    />
                                  </td>

                                  {/* Balance view (formula stock - consumed) */}
                                  <td className="py-3 px-4 text-center">
                                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg border shadow-sm ${cell.balance < 0
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
                                      disabled={isExpired}
                                      className={`w-full max-w-[200px] py-1.5 px-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-xs font-semibold shadow-sm transition-all ${isExpired ? 'bg-slate-100/85 text-slate-400 cursor-not-allowed border-slate-200' : ''
                                        }`}
                                    />
                                  </td>

                                  {/* Actions Column */}
                                  <td className="py-3 px-4 text-center">
                                    {isExpired ? (
                                      <button
                                        onClick={() => handleDeleteItem(item)}
                                        title="Remove expired item from checkup roster"
                                        className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all flex items-center gap-1 mx-auto active:scale-[0.95] border-red-200 bg-red-50 text-red-650 hover:bg-red-100 hover:text-red-700 hover:shadow-sm"
                                      >
                                        <Trash2 size={12} />
                                        Delete
                                      </button>
                                    ) : !lockStock ? (
                                      <button
                                        onClick={() => handleDeleteItem(item)}
                                        title="Remove item from checkup roster"
                                        className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all flex items-center gap-1 mx-auto active:scale-[0.95] border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 hover:shadow-sm"
                                      >
                                        <Trash2 size={12} />
                                        Remove
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-bold">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                                No matching items found.
                              </td>
                            </tr>
                          )}
                          {/* ── Total Stock Volume Footer Row ── */}
                          {activeTab !== 'expired_inventory' && (
                            <tr className="bg-slate-900 text-white border-t-2 border-slate-700">
                              <td className="py-3.5 px-4 font-black text-[11px] tracking-tight" colSpan={2}>
                                Total Stock Volume (All Purchases)
                              </td>
                              <td className="py-3.5 px-4 text-center" colSpan={3} />
                              <td className="py-3.5 px-4 text-center">
                                <span className="text-[13px] font-black text-white">
                                  {filteredItems.reduce((sum, item) => {
                                    const cell = getCell(item);
                                    return sum + (parseInt(cell.stock_in_hands, 10) || 0);
                                  }, 0).toLocaleString()}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="text-[13px] font-black text-white">
                                  {filteredItems.reduce((sum, item) => {
                                    const cell = getCell(item);
                                    return sum + (parseInt(cell.consumed, 10) || 0);
                                  }, 0).toLocaleString()}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="text-[13px] font-black text-white">
                                  {filteredItems.reduce((sum, item) => {
                                    const cell = getCell(item);
                                    return sum + (parseInt(cell.balance, 10) || 0);
                                  }, 0).toLocaleString()}
                                </span>
                              </td>
                              <td className="py-3.5 px-4" colSpan={2} />
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </div>
            ) : (
              /* ── 2. STOCK CHANGES LIGHTWEIGHT OVERVIEW ── */
              <div className="space-y-6">
                {/* Header & Time Filters Card */}
                <Card className="p-6 border border-slate-200 shadow bg-white rounded-[24px]">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Activity className="h-4.5 w-4.5 text-[#003A44]" />
                        Consumption {logViewMode === 'daily' ? `— Day ${logDay}` : logViewMode === 'weekly' ? `— Week ${logWeek} (days ${weekRange(logWeek)[0]}–${weekRange(logWeek)[1]})` : '— Whole Month'}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-bold mt-1">Per item, split by session (AM / PM) and ward (Station 1 / Minor).</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Day navigator (daily mode) */}
                      {logViewMode === 'daily' && (
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                          <button onClick={() => { setLogDay(d => Math.max(1, d - 1)); setLogsPage(1); }}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-white disabled:opacity-40" disabled={logDay <= 1}>
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="px-2 text-[11px] font-black text-slate-700 tabular-nums">Day {logDay}</span>
                          <button onClick={() => { setLogDay(d => Math.min(31, d + 1)); setLogsPage(1); }}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-white disabled:opacity-40" disabled={logDay >= 31}>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      {/* Week navigator (weekly mode) */}
                      {logViewMode === 'weekly' && (
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                          <button onClick={() => { setLogWeek(w => Math.max(1, w - 1)); setLogsPage(1); }}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-white disabled:opacity-40" disabled={logWeek <= 1}>
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="px-2 text-[11px] font-black text-slate-700 tabular-nums">Week {logWeek}</span>
                          <button onClick={() => { setLogWeek(w => Math.min(5, w + 1)); setLogsPage(1); }}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-white disabled:opacity-40" disabled={logWeek >= 5}>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      {/* Daily / Weekly / Monthly toggle */}
                      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                        {[{ label: 'Daily', value: 'daily' }, { label: 'Weekly', value: 'weekly' }, { label: 'Monthly', value: 'monthly' }].map(m => (
                          <button key={m.value}
                            onClick={() => { setLogViewMode(m.value); setLogsPage(1); }}
                            className={`px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${logViewMode === m.value
                              ? 'bg-[#003A44] text-white shadow-sm'
                              : 'text-slate-655 hover:text-slate-900 hover:bg-white/50'}`}>
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Summary Stats Grid — split by session and ward */}
                  {(() => {
                    const amTot = activeConsumptionList.reduce((s, it) => s + (logViewMode === 'monthly' ? it.amTot : it.amStn + it.amMin), 0);
                    const pmTot = activeConsumptionList.reduce((s, it) => s + (logViewMode === 'monthly' ? it.pmTot : it.pmStn + it.pmMin), 0);
                    const stnTot = activeConsumptionList.reduce((s, it) => s + (logViewMode === 'monthly' ? it.stnTot : it.amStn + it.pmStn), 0);
                    const minTot = activeConsumptionList.reduce((s, it) => s + (logViewMode === 'monthly' ? it.minTot : it.amMin + it.pmMin), 0);
                    return (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 shadow-sm">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Items Consumed</span>
                          <div className="text-xl font-black text-[#003A44] leading-none mt-1.5">{activeConsumptionList.length}</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 shadow-sm">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Consumed</span>
                          <div className="text-xl font-black text-amber-600 leading-none mt-1.5">{totalConsumedUnits}</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 shadow-sm">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">AM / PM</span>
                          <div className="text-lg font-black leading-none mt-1.5"><span className="text-slate-700">{amTot}</span> <span className="text-slate-300">/</span> <span className="text-slate-700">{pmTot}</span></div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 shadow-sm">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Station 1 / Minor</span>
                          <div className="text-lg font-black leading-none mt-1.5"><span className="text-sky-700">{stnTot}</span> <span className="text-slate-300">/</span> <span className="text-emerald-700">{minTot}</span></div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Search filter */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by item name or username..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs font-bold text-slate-700 placeholder-slate-400 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:bg-white transition-all shadow-sm"
                    />
                  </div>

                  {/* Per-item consumption cards */}
                  {loadingLogs ? (
                    <div className="flex justify-center items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-sky-600" /></div>
                  ) : paginatedItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {paginatedItems.map((it) => (
                        <div key={it.item_name} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col hover:border-slate-300 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-black text-slate-800 text-sm leading-tight">{it.item_name}</h4>
                            <div className="text-right shrink-0">
                              <div className="text-2xl font-black text-amber-600 leading-none">{it.total}</div>
                              <div className="text-[8px] font-black uppercase tracking-wider text-slate-400 mt-0.5">consumed</div>
                            </div>
                          </div>

                          {logViewMode === 'monthly' ? (
                            /* Monthly: chart + session/ward split */
                            <div className="mt-3">
                              <ConsumptionBars days={it.days} peakVal={it.peakVal} />
                              <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mt-1">
                                <span>{it.days.length} active day{it.days.length !== 1 ? 's' : ''}</span>
                                {it.peakDay != null && <span>peak Day {it.peakDay} ({it.peakVal})</span>}
                              </div>
                              <div className="flex items-center flex-wrap gap-1.5 mt-2">
                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-slate-100 text-slate-600 border border-slate-200">AM {it.amTot} · PM {it.pmTot}</span>
                                {it.stnTot > 0 && <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-sky-50 text-sky-700 border border-sky-200">STN1 {it.stnTot}</span>}
                                {it.minTot > 0 && <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">MINOR {it.minTot}</span>}
                              </div>
                            </div>
                          ) : (
                            /* Daily / Weekly: Session × Ward grid (weekly is summed over the week) */
                            <>
                              <table className="w-full text-center text-[11px] mt-3 border border-slate-100 rounded-lg overflow-hidden">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-400 text-[8px] font-black uppercase tracking-wider">
                                    <th className="py-1.5 w-10"></th><th className="py-1.5 text-sky-600">Station 1</th><th className="py-1.5 text-emerald-600">Minor</th>
                                  </tr>
                                </thead>
                                <tbody className="font-black">
                                  <tr className="border-t border-slate-100">
                                    <td className="py-1.5 text-[8px] font-black text-slate-400 uppercase bg-slate-50/60">AM</td>
                                    <td className={it.amStn ? 'text-sky-700' : 'text-slate-300'}>{it.amStn || '·'}</td>
                                    <td className={it.amMin ? 'text-emerald-700' : 'text-slate-300'}>{it.amMin || '·'}</td>
                                  </tr>
                                  <tr className="border-t border-slate-100">
                                    <td className="py-1.5 text-[8px] font-black text-slate-400 uppercase bg-slate-50/60">PM</td>
                                    <td className={it.pmStn ? 'text-sky-700' : 'text-slate-300'}>{it.pmStn || '·'}</td>
                                    <td className={it.pmMin ? 'text-emerald-700' : 'text-slate-300'}>{it.pmMin || '·'}</td>
                                  </tr>
                                </tbody>
                              </table>
                              {logViewMode === 'weekly' && it.days && it.days.length > 1 && (
                                <div className="mt-2">
                                  <ConsumptionBars days={it.days} peakVal={it.peakVal} />
                                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mt-1">
                                    <span>{it.days.length} active days</span>
                                    {it.peakDay != null && <span>peak Day {it.peakDay} ({it.peakVal})</span>}
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          <div className="flex items-center mt-3 text-[9px] font-bold text-slate-400">
                            <span>on hand <b className="text-slate-600">{it.lastStock}</b> · bal <b className="text-indigo-600">{it.lastBalance}</b></span>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-start gap-1.5">
                            <User size={12} className="text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-[10px] text-slate-600 leading-snug">
                              <span className="font-black text-slate-700">{it.users.join(', ') || '—'}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-slate-400 font-bold">
                      {logViewMode === 'daily' ? `No consumption recorded on Day ${logDay}.` : logViewMode === 'weekly' ? `No consumption recorded in Week ${logWeek}.` : 'No consumption recorded this month.'}
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {activeConsumptionList.length > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 mt-2 border-t border-slate-100 select-none">
                      <div className="text-[11px] text-slate-500 font-medium">
                        Showing <span className="font-extrabold text-slate-750">{Math.min(activeConsumptionList.length, (safeLogsPage - 1) * itemsPerPage + 1)}</span> to{' '}
                        <span className="font-extrabold text-slate-750">{Math.min(activeConsumptionList.length, safeLogsPage * itemsPerPage)}</span> of{' '}
                        <span className="font-extrabold text-slate-750">{activeConsumptionList.length}</span> consumed items
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                          disabled={safeLogsPage === 1}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        {(() => {
                          const pages = [];
                          const maxVisible = 5;
                          let start = Math.max(1, safeLogsPage - 2);
                          let end = Math.min(totalPages, start + maxVisible - 1);
                          if (end - start + 1 < maxVisible) {
                            start = Math.max(1, end - maxVisible + 1);
                          }

                          for (let i = start; i <= end; i++) {
                            pages.push(
                              <button
                                key={i}
                                type="button"
                                onClick={() => setLogsPage(i)}
                                className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold transition-all border ${safeLogsPage === i
                                  ? 'bg-[#0369a1] text-white border-[#0369a1] shadow-sm'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                              >
                                {i}
                              </button>
                            );
                          }
                          return pages;
                        })()}

                        <button
                          type="button"
                          onClick={() => setLogsPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={safeLogsPage === totalPages}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Unlock Stock Password Modal ── */}
      <Modal
        isOpen={showUnlockModal}
        onClose={() => {
          setShowUnlockModal(false);
          setUnlockPassword('');
        }}
        title="Unlock Stock Editing"
        maxWidth="400px"
      >
        <form onSubmit={handleUnlockStock} className="space-y-4 text-left p-2">
          <p className="text-[11px] text-slate-500 font-bold leading-normal mb-4">
            Stock count editing is locked! Ask Admin for access.
          </p>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Unlock Password</label>
            <input
              required
              type="password"
              placeholder="Enter monthly password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-[#0369a1] outline-none transition-all"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 select-none">
            <Button
              type="button"
              onClick={() => {
                setShowUnlockModal(false);
                setUnlockPassword('');
              }}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={unlocking}
              className="px-4 py-2 bg-[#0369a1] hover:bg-[#075985] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5"
            >
              {unlocking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Unlock Stock
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Admin: Stock Lock Password Modal ── */}
      {isAdmin && (
        <Modal
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            setStockPassword(null);
            setStockPasswordVisible(false);
            setStockPasswordCopied(false);
          }}
          title="Stock Lock Password"
          maxWidth="440px"
        >
          <div className="space-y-5 text-left p-2">

            {/* Info banner */}
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
              <KeyRound size={16} className="text-rose-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-rose-700 font-bold leading-relaxed">
                This is the monthly password nurses must enter to unlock stock editing. Keep it confidential and only share directly with authorized personnel.
              </p>
            </div>

            {/* Month Selector */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Month Period</label>
              <select
                value={passwordMonth}
                onChange={(e) => {
                  setPasswordMonth(e.target.value);
                  setStockPassword(null);
                  setStockPasswordVisible(false);
                  setStockPasswordCopied(false);
                  fetchStockPassword(e.target.value);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black text-slate-800 focus:bg-white focus:border-rose-400 outline-none transition-all cursor-pointer"
              >
                {DYNAMIC_MONTHS.map(m => (
                  <option key={m} value={m}>{getMonthLabel(m)}</option>
                ))}
              </select>
            </div>

            {/* Password display */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Current Password</label>
              <div className="relative">
                {stockPasswordLoading ? (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <Loader2 size={14} className="animate-spin text-slate-400" />
                    <span className="text-xs text-slate-400 font-bold">Loading password...</span>
                  </div>
                ) : stockPassword ? (
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 pr-2">
                    <span className="flex-1 font-mono text-sm font-black tracking-[0.2em] text-emerald-400 select-all">
                      {stockPasswordVisible ? stockPassword : '••••••••'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setStockPasswordVisible(v => !v)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                        title={stockPasswordVisible ? 'Hide password' : 'Show password'}
                      >
                        {stockPasswordVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        className={`p-1.5 rounded-lg transition-all border-none bg-transparent cursor-pointer ${stockPasswordCopied ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                        title="Copy to clipboard"
                      >
                        {stockPasswordCopied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-400 font-bold text-center">
                    No password generated yet for this month.
                  </div>
                )}
              </div>
              {stockPasswordCopied && (
                <p className="text-[10px] text-emerald-600 font-black flex items-center gap-1">
                  <Check size={10} /> Copied to clipboard!
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-1 gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setStockPassword(null);
                  setStockPasswordVisible(false);
                }}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleRegeneratePassword}
                disabled={regenerating}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 disabled:opacity-60 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-rose-200 cursor-pointer border-none"
              >
                {regenerating
                  ? <Loader2 size={12} className="animate-spin" />
                  : <RefreshCw size={12} />
                }
                {regenerating ? 'Generating...' : 'Regenerate Password'}
              </button>
            </div>

            <p className="text-[9px] text-slate-400 font-bold text-center border-t border-slate-100 pt-3">
              Regenerating creates a new password and invalidates the old one. All admins will be notified.
            </p>
          </div>
        </Modal>
      )}

      {/* ── Create New Item Modal ── */}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Custom Inventory Item"
        maxWidth="500px"
      >
        <form onSubmit={handleCreateItem} className="space-y-4 text-left p-2">
          <p className="text-[11px] text-slate-500 font-bold leading-normal mb-4">
            Add a new custom medication or consumable item to the active daily checkup roster. This item will be saved persistently to the monthly ledger.
          </p>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Item Name</label>
            <input
              required
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="e.g. Ciprofloxacin 500mg IV"
              className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Category</label>
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm cursor-pointer"
            >
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <option key={key} value={key}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Initial Stock</label>
              <input
                type="number"
                min="0"
                value={newItemStock}
                onChange={(e) => setNewItemStock(e.target.value)}
                className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Status</label>
              <select
                value={newItemStatus}
                onChange={(e) => setNewItemStatus(e.target.value)}
                className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm cursor-pointer"
              >
                <option value="Available">Available</option>
                <option value="Near Expiry">Near Expiry</option>
                <option value="Expired">Expired</option>
                <option value="Outstock">Outstock</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Expiration Date</label>
            <input
              type="text"
              value={newItemExpDate}
              onChange={(e) => setNewItemExpDate(e.target.value)}
              placeholder="MM/YYYY or No Expiry"
              className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 rounded-xl text-slate-500 font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-sm"
            >
              Create Item
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Requisitions List Modal ── */}
      <Modal
        isOpen={showReqListModal}
        onClose={() => setShowReqListModal(false)}
        title="Nursing Stock Requisitions"
        maxWidth="700px"
      >
        <div className="space-y-5 p-2 text-left">
          
          {/* Summary Stats Grid */}
          {(() => {
            const total = reqList.length;
            const pending = reqList.filter(r => r.status === 'Pending').length;
            const approved = reqList.filter(r => r.status === 'Approved').length;
            const urgent = reqList.filter(r => (r.urgency === 'Critical' || r.urgency === 'High') && r.status === 'Pending').length;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-2">
                <div className="p-3 bg-slate-50 border border-slate-205 rounded-xl shadow-xs">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Requests</span>
                  <span className="text-base font-black text-slate-800 block mt-1">{total}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-205 rounded-xl shadow-xs">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Pending review</span>
                  <span className="text-base font-black text-amber-600 block mt-1 flex items-center gap-1">
                    {pending}
                    {pending > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-205 rounded-xl shadow-xs">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Urgent pending</span>
                  <span className="text-base font-black text-rose-600 block mt-1">{urgent}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-205 rounded-xl shadow-xs">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Approved / Sent</span>
                  <span className="text-base font-black text-emerald-600 block mt-1">{approved}</span>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 mb-2">
            <p className="text-[11px] text-slate-500 font-bold leading-normal">
              Track stock requests sent to the Central Store Hub, or request additional inventory items.
            </p>
            <Button
              onClick={() => {
                setShowCreateReqModal(true);
                setShowReqListModal(false);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-indigo-500/10 active:scale-[0.98] transition-all"
            >
              New Requisition
            </Button>
          </div>
 
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            {loadingReqs ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin text-[#0369a1]" size={20} />
              </div>
            ) : reqList.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-xs">
                No requisitions found for the NURSING department.
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                    <th className="py-3 px-4 text-left">Req ID</th>
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-center">Urgency</th>
                    <th className="py-3 px-4 text-center">Items count</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {reqList.map((req) => (
                    <tr key={req.id} className={`hover:bg-slate-50/60 transition-colors relative ${
                      req.urgency === 'Critical' ? 'bg-rose-50/10' :
                      req.urgency === 'High' ? 'bg-amber-50/5' : ''
                    }`}>
                      <td className="py-3 px-4 text-slate-900 font-black relative">
                        {/* Urgency indicator strip */}
                        {(req.urgency === 'Critical' || req.urgency === 'High') && (
                          <span className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md ${
                            req.urgency === 'Critical' ? 'bg-red-500' : 'bg-orange-400'
                          }`} />
                        )}
                        #{req.id}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-normal">{new Date(req.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={
                          req.urgency === 'Critical' ? 'bg-red-50 text-red-655 border-red-150' :
                            req.urgency === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              'bg-slate-50 text-slate-600 border-slate-200'
                        }>
                          {req.urgency || 'Normal'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-lg text-[11px] font-black">
                          {req.items_count || 0} items
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={
                          req.status === 'Received' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                            req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              req.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                'bg-amber-50 text-amber-700 border-amber-200'
                        }>
                          {req.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            handleViewReq(req);
                            setShowReqListModal(false);
                          }}
                          className="px-3 py-1.5 text-[10px] font-black text-[#0369a1] bg-sky-50 hover:bg-sky-100 rounded-xl border border-sky-150 cursor-pointer transition-all shadow-xs"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Modal>
 
      {/* ── Requisition Details Modal ── */}
      <Modal
        isOpen={showReqDetailModal}
        onClose={() => {
          setShowReqDetailModal(false);
          setShowReqListModal(true);
        }}
        title={`Requisition #${selectedReq?.id} Details`}
        maxWidth="650px"
      >
        <div className="space-y-5 p-2 text-left">
          
          {/* Stepper Progression */}
          <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 mb-2">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-4">Request Status Timeline</p>
            <div className="relative flex items-center justify-between">
              <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200" />
              
              {/* Step 1 */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-emerald-500/10">
                  <Check size={12} />
                </div>
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mt-1.5">Submitted</span>
              </div>

              {/* Step 2 */}
              <div className="relative z-10 flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                  selectedReq?.status === 'Pending' 
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/10 animate-pulse' 
                    : selectedReq?.status === 'Approved' || selectedReq?.status === 'Rejected'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10'
                    : 'bg-white text-slate-350 border-slate-200'
                }`}>
                  {selectedReq?.status === 'Pending' ? <Activity size={12} /> : (selectedReq?.status === 'Approved' || selectedReq?.status === 'Rejected' ? <Check size={12} /> : '2')}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wider mt-1.5 ${
                  selectedReq?.status === 'Pending' ? 'text-amber-500 font-extrabold' : selectedReq?.status === 'Approved' || selectedReq?.status === 'Rejected' ? 'text-emerald-600' : 'text-slate-400'
                }`}>In Review</span>
              </div>

              {/* Step 3 */}
              <div className="relative z-10 flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                  selectedReq?.status === 'Approved'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10'
                    : selectedReq?.status === 'Rejected'
                    ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/10'
                    : 'bg-white text-slate-350 border-slate-200'
                }`}>
                  {selectedReq?.status === 'Approved' ? <Check size={12} /> : (selectedReq?.status === 'Rejected' ? <X size={12} /> : '3')}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wider mt-1.5 ${
                  selectedReq?.status === 'Approved' ? 'text-emerald-600' : selectedReq?.status === 'Rejected' ? 'text-rose-500' : 'text-slate-400'
                }`}>{selectedReq?.status === 'Rejected' ? 'Rejected' : 'Dispatched'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 text-center">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Status</p>
              <Badge className={`mt-1 font-black uppercase tracking-wider text-[9px] ${selectedReq?.status === 'Received' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                selectedReq?.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                selectedReq?.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                  'bg-amber-50 text-amber-700 border-amber-200'
                }`}>{selectedReq?.status}</Badge>
            </div>
            <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 text-center">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Urgency</p>
              <Badge className={`mt-1 font-black uppercase tracking-wider text-[9px] ${selectedReq?.urgency === 'High' || selectedReq?.urgency === 'Critical' ? 'bg-red-50 text-red-700 border-red-200 font-bold' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {selectedReq?.urgency || 'Normal'}
              </Badge>
            </div>
            <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 text-center">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Date</p>
              <p className="text-xs font-black text-slate-705 mt-1">{selectedReq?.created_at ? new Date(selectedReq.created_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
 
          {selectedReq?.notes && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Notes / Instructions</p>
              <p className="text-xs text-slate-700 font-bold mt-1 leading-relaxed">{selectedReq.notes}</p>
            </div>
          )}
 
          {selectedReq?.rejection_reason && (
            <div className="bg-red-50 border border-red-250 rounded-xl p-3">
              <p className="text-[9px] font-black uppercase text-red-600 tracking-wider">Rejection Reason</p>
              <p className="text-xs text-red-800 font-extrabold mt-1 leading-relaxed">{selectedReq.rejection_reason}</p>
            </div>
          )}
 
          {/* Items table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            {reqItemsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin text-[#0369a1]" size={20} />
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                    <th className="py-2.5 px-4 text-left">Item Name</th>
                    <th className="py-2.5 px-4 text-left">UoM</th>
                    <th className="py-2.5 px-4 text-center">Requested Qty</th>
                    <th className="py-2.5 px-4 text-center">Approved Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700 bg-white">
                  {reqItems.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-400 font-bold">No items found in this requisition.</td>
                    </tr>
                  ) : (
                    reqItems.map(ri => (
                      <tr key={ri.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-4 text-slate-900 font-black">{ri.item_name}</td>
                        <td className="py-2.5 px-4 text-slate-500 font-normal">{ri.unit_of_measure || '—'}</td>
                        <td className="py-2.5 px-4 text-center text-slate-800 text-sm font-extrabold">{ri.requested_quantity}</td>
                        <td className="py-2.5 px-4 text-center text-sm font-black text-slate-905">{ri.approved_quantity ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
 
          {selectedReq?.status === 'Approved' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold text-emerald-800 leading-snug">
                This stock has been dispatched from the Central Store. Accept it to add these
                quantities into your Daily Stock Checkup for <span className="font-black">{monthYear} · Day {currentDay} · {currentSession}</span>.
              </p>
              <Button
                type="button"
                disabled={receivingReq}
                onClick={() => handleReceiveRequisition(selectedReq)}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-emerald-500/10 active:scale-[0.98] border-0 disabled:opacity-60"
              >
                {receivingReq ? 'Accepting…' : 'Accept into Stock'}
              </Button>
            </div>
          )}

          {selectedReq?.status === 'Received' && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px] font-bold text-sky-800">
              ✓ This requisition has been received and its items added to the Daily Stock Checkup.
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100 mt-4">
            <Button
              type="button"
              onClick={() => {
                setShowReqDetailModal(false);
                setShowReqListModal(true);
              }}
              className="bg-[#0369a1] hover:bg-[#075985] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-sky-500/10 active:scale-[0.98] border-0"
            >
              Back to List
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── New Requisition Modal ── */}
      <Modal
        isOpen={showCreateReqModal}
        onClose={() => {
          setShowCreateReqModal(false);
          setShowReqListModal(true);
        }}
        title="Create Nursing Stock Requisition"
        maxWidth="600px"
      >
        <form onSubmit={handleCreateRequisition} className="space-y-4 text-left p-2">
          <p className="text-[11px] text-slate-500 font-bold leading-normal mb-4">
            Select items from the master catalog and request their transfer from the Central Store to the NURSING department.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Department</label>
              <input
                disabled
                type="text"
                value="NURSING"
                className="w-full px-4 py-2.5 text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl outline-none shadow-sm cursor-not-allowed"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Urgency</label>
              <select
                value={newReqUrgency}
                onChange={(e) => setNewReqUrgency(e.target.value)}
                className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0369a1] focus:bg-white transition-all shadow-sm cursor-pointer"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Notes</label>
            <textarea
              value={newReqNotes}
              onChange={(e) => setNewReqNotes(e.target.value)}
              placeholder="e.g. Urgent need for maternity ward..."
              className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0369a1] focus:bg-white transition-all shadow-sm h-16 resize-none"
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Requisition Items</h4>
              <button
                type="button"
                onClick={() => setNewReqLines([...newReqLines, { item_id: '', quantity: '' }])}
                className="flex items-center gap-1 text-[10px] font-black text-indigo-650 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all cursor-pointer shadow-xs"
              >
                <Plus size={11} /> Add Item
              </button>
            </div>

            <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
              {newReqLines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <select
                      required
                      value={line.item_id}
                      onChange={(e) => {
                        const updated = [...newReqLines];
                        updated[idx].item_id = e.target.value;
                        setNewReqLines(updated);
                      }}
                      className="w-full px-3 py-2.5 text-xs font-bold text-slate-705 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0369a1] focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="">Select Item…</option>
                      {masterItems.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.sku || 'no SKU'})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <input
                      required
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={line.quantity}
                      onChange={(e) => {
                        const updated = [...newReqLines];
                        updated[idx].quantity = e.target.value;
                        setNewReqLines(updated);
                      }}
                      className="w-full px-3 py-2.5 text-xs font-bold text-slate-705 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0369a1] focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  {newReqLines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setNewReqLines(newReqLines.filter((_, i) => i !== idx))}
                      className="p-2.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-150 rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-6">
            <Button
              type="button"
              onClick={() => {
                setShowCreateReqModal(false);
                setShowReqListModal(true);
              }}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#0369a1] hover:bg-[#075985] text-white px-5 py-2 rounded-xl font-bold text-xs shadow-md shadow-sky-500/10 active:scale-[0.98] flex items-center gap-1.5 border-none cursor-pointer"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              Submit Requisition
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
