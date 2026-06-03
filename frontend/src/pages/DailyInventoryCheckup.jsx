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
  X,
  ChevronDown,
  PackagePlus,
  RotateCw,
  Lock,
  Unlock,
  Download,
  Trash2
} from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { Card, Button, Badge } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

// Excel metadata source matching the provided spreadsheet
const EXCEL_DATA = {
  "Aquabloc 15cm": { qty: 70, expiry: "02/2028", status: "Available", category: "medical_supplies" },
  "Adrenaline": { qty: 2, expiry: "05/2026", status: "Available", category: "medications" },
  "Adrenaline 1mg": { qty: 10, expiry: "04/2026", status: "Expired", category: "medications" },
  "Alcohol pads": { qty: 30, expiry: "05/2026", status: "Available", category: "medical_supplies" },
  "Atropine 1mg": { qty: 10, expiry: "05/2026", status: "Expired", category: "medications" },
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
  "Dexamethasone": { qty: 8, expiry: "04/2026", status: "Expired", category: "medications" },
  "Dexamethasone 4mg": { qty: 17, expiry: "04/2028", status: "Available", category: "medications" },
  "Dexamethasone 8mg": { qty: 25, expiry: "05/2028", status: "Available", category: "medications" },
  "Dextrose 50%": { qty: 20, expiry: "01/2027", status: "Available", category: "antiseptics" },
  "Diazepam 10mg": { qty: 10, expiry: "10/2026", status: "Available", category: "medications" },
  "Diclo 100mg Supp": { qty: 33, expiry: "04/2028", status: "Available", category: "medications" },
  "Diclofenac 75mg": { qty: 22, expiry: "05/2028", status: "Available", category: "medications" },
  "Diclofenac IM 75mg": { qty: 40, expiry: "02/2028", status: "Available", category: "medications" },
  "Dicynone 250mg": { qty: 8, expiry: "04/2028", status: "Available", category: "medications" },
  "Eau oxygénée 3%": { qty: 7, expiry: "12/2027", status: "Available", category: "antiseptics" },
  "Emitino": { qty: 54, expiry: "04/2026", status: "Expired", category: "medications" },
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
  "Morphine 10mg": { qty: 8, expiry: "04/2026", status: "Expired", category: "anesthetics" },
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
  "Pause": { qty: 10, expiry: "04/2026", status: "Expired", category: "medications" },
  "Pethidine": { qty: 8, expiry: "05/2027", status: "Available", category: "anesthetics" },
  "Phenobarbital 100mg": { qty: 10, expiry: "04/2027", status: "Available", category: "medications" },
  "Phenytoin 250mg": { qty: 3, expiry: "02/2027", status: "Available", category: "medications" },
  "Phytomenadione 10mg": { qty: 3, expiry: "02/2028", status: "Available", category: "medications" },
  "Plaster": { qty: 2, expiry: "02/2026", status: "Expired", category: "medical_supplies" },
  "Polyglactin 3/0": { qty: 38, expiry: "04/2030", status: "Available", category: "sutures" },
  "Polyglactin 4/0": { qty: 32, expiry: "03/2030", status: "Available", category: "sutures" },
  "Polypropylene 6/0": { qty: 8, expiry: "02/2026", status: "Expired", category: "sutures" },
  "Povidone 10%": { qty: 8, expiry: "02/2026", status: "Expired", category: "antiseptics" },
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
      "Aquabloc 15cm", "Alcohol pads", "Bande 15cm", "Bande 7.5cm", 
      "Catheter G16", "Catheter G18", "Catheter G20", "Catheter G22", "Catheter G24",
      "Gants Sterile 8", "Gants propre", "Gloves 7.5", "Masque Neb Adulte", "Masque Neb Enfant",
      "Nasal Oxygen Masque Enfant", "Pap Smear", "Paraffin Gauze 5cm", "Plaster", "Sac à urine",
      "Seringue 10cc", "Seringue 1cc (Insuline)", "Seringue 20cc", "Seringue 2cc", "Seringue 5cc",
      "Sonde Vésicale G10", "Sonde Vésicale G12", "Sonde Vésicale G16", "Spatula", "Speculum",
      "Sterile Gauze 10cm", "Tongue Depressor", "Trousse", "Vaginal Swab"
    ]
  },
  medications: {
    label: "Medications",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    items: [
      "Adrenaline", "Adrenaline 1mg", "Atropine 1mg", "Buscopan", "Buscopan 20mg",
      "Ceftriaxone 1g", "Dexamethasone", "Dexamethasone 4mg", "Dexamethasone 8mg",
      "Diazepam 10mg", "Diclo 100mg Supp", "Diclofenac 75mg", "Diclofenac IM 75mg",
      "Dicynone 250mg", "Emitino", "Esomeprazole", "Flagyl", "Furosemide", "Furosemide 20mg",
      "Hydralazine 20mg", "Hydrocortisone 100mg", "IV Paracetamol 1g", "Largactil 25mg",
      "Metoclopramide", "Metronidazole", "Pantoprazole 40mg", "Paracet 125mg Supp",
      "Paracet 250mg Supp", "Paracetamol 125mg", "Paracetamol Ces", "Pause",
      "Phenobarbital 100mg", "Phenytoin 250mg", "Phytomenadione 10mg", "Salbutamol",
      "Vit B complex"
    ]
  },
  anesthetics: {
    label: "Anesthetics & Analgesics",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    items: [
      "Bupivacaine", "Fentanyl", "Ketamine 500mg", "Lidocaine", "Midazolam 5mg",
      "Morphine 10mg", "Pethidine", "Propofol 200mg", "Tramadol"
    ]
  },
  antiseptics: {
    label: "Antiseptics & Fluids",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    items: [
      "Dextrose 50%", "Eau oxygénée 3%", "Glucose 5%", "NS (Normal Saline)",
      "Povidone 10%", "RL (Ringer's Lactate)", "Water for injection"
    ]
  },
  sutures: {
    label: "Sutures & Blades",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    items: [
      "Nylon 2/0", "Nylon 4/0", "Nylon 5/0", "Polyglactin 3/0", "Polyglactin 4/0",
      "Polypropylene 6/0", "Surgical Blades N15", "Surgical Blades N23",
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

export default function DailyInventoryCheckup() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Active state
  const [monthYear, setMonthYear] = useState(CURRENT_MONTH_STR);
  const [currentDay, setCurrentDay] = useState(() => new Date().getDate());
  const [currentSession, setCurrentSession] = useState(() => new Date().getHours() < 13 ? 'AM' : 'PM');

  const matrixScrollRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSelectedMonth, setExportSelectedMonth] = useState(monthYear);
  const [customItems, setCustomItems] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // State for tracking custom or seeded items removed/deleted from the active roster
  const [deletedItems, setDeletedItems] = useState([]);

  // Audit Logs State
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const handleDeleteItem = (itemName) => {
    setDeletedItems(prev => [...prev, itemName]);
    toast.success(`Removed "${itemName}" from active checkup roster.`);
  };

  const handleDeleteAllExpired = () => {
    if (lockStock) {
      toast.error("Roster editing must be unlocked to delete expired items.");
      return;
    }
    if (filteredExpiredItems.length === 0) {
      toast.error("No expired items to delete.");
      return;
    }
    setDeletedItems(prev => [...new Set([...prev, ...filteredExpiredItems])]);
    toast.success(`Removed all ${filteredExpiredItems.length} expired items from the checkup roster.`);
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
    const cleanVal = ['responsible_name', 'expiration_date', 'status', 'category'].includes(field) ? val : (parseInt(val, 10) || 0);

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
          balance: carried,
          responsible_name: '',
          expiration_date: excelMeta.expiry || '',
          status: carried <= 0 ? 'Outstock' : (excelMeta.status || 'Available'),
          category: excelMeta.category || ''
        };
      }

      const cell = { ...monthMap[itemName][targetDay][targetSession] };
      cell[field] = cleanVal;

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
              responsible_name: cell.responsible_name || '',
              expiration_date: cell.expiration_date || '',
              status: cell.status || 'Active',
              category: cell.category || ''
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

    const name = newItemName.trim();

    // Add to local customItems state if not exists
    if (!ALL_ITEMS.includes(name)) {
      setCustomItems(prev => {
        if (prev.includes(name)) return prev;
        return [...prev, name];
      });
    }

    const stock = parseInt(newItemStock, 10) || 0;

    // Initialize in allMonthsMap for current month/day/session
    handleCellEdit(name, 'stock_in_hands', stock, currentDay, currentSession);
    handleCellEdit(name, 'consumed', 0, currentDay, currentSession);
    handleCellEdit(name, 'responsible_name', user?.fullName || '', currentDay, currentSession);
    handleCellEdit(name, 'expiration_date', newItemExpDate, currentDay, currentSession);
    handleCellEdit(name, 'status', newItemStatus, currentDay, currentSession);
    handleCellEdit(name, 'category', newItemCategory, currentDay, currentSession);

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

  const calculateExcelStatus = (expiryStr, balance) => {
    if (balance <= 0) return 'Outstock';
    
    const cleanExpiry = (expiryStr || '').trim();
    if (!cleanExpiry || cleanExpiry === 'No Expiry Listed' || !cleanExpiry.includes('/')) {
      return 'Available';
    }
    
    const parts = cleanExpiry.split('/');
    if (parts.length !== 2) return 'Available';
    
    const monthVal = parseInt(parts[0], 10);
    const yearVal = parseInt(parts[1], 10);
    if (isNaN(monthVal) || isNaN(yearVal)) return 'Available';
    
    // Create Date: 1st of that month
    const expiryDate = new Date(yearVal, monthVal - 1, 1);
    
    // DATE(2026,6,2) -> June 2, 2026
    const expiredThreshold = new Date(2026, 5, 2); // June is month index 5
    
    // DATE(2026,12,2) -> December 2, 2026
    const nearExpiryThreshold = new Date(2026, 11, 2); // Dec is month index 11
    
    if (expiryDate <= expiredThreshold) {
      return 'Expired';
    } else if (expiryDate <= nearExpiryThreshold) {
      return 'Near Expiry';
    } else {
      return 'Available';
    }
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

    const excelMeta = EXCEL_DATA[item] || {};
    const expiryValue = (record?.expiration_date !== undefined && record?.expiration_date !== '') ? record.expiration_date : (excelMeta.expiry || '');
    
    // Auto-calculate dynamic status based on Excel formula thresholds!
    const calculatedStatus = calculateExcelStatus(expiryValue, balance);

    const result = {
      stock_in_hands: stock,
      consumed: consumed,
      balance: balance,
      responsible_name: record?.responsible_name || '',
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
                <option key={m} value={m}>{getMonthLabel(m)}</option>
              ))}
            </select>
          </div>

          {/* Unified Lock & Save Controls */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
            <Button
              disabled={loading}
              onClick={() => {
                setLockStock(!lockStock);
                if (lockStock) {
                  toast.success('Stock count editing UNLOCKED. Edit carefully!', { icon: '🔓' });
                } else {
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

          {/* Roster Tools Dropdown Menu */}
          <div className="relative">
            <Button
              disabled={loading}
              onClick={() => setShowToolsDropdown(!showToolsDropdown)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 border-0 transition-all active:scale-[0.98]"
            >
              <RotateCw className="h-4 w-4" />
              Roster Tools
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
                      setShowCreateModal(true);
                      setShowToolsDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all border-none bg-transparent"
                  >
                    <span className="p-1 bg-emerald-50 text-emerald-600 rounded-lg"><PackagePlus size={14} /></span>
                    Create Custom Item
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
                      Export high-fidelity spreadsheets with reactive formulas. Select a single month, or bundle every recorded period as dedicated tabs in a single workbook.
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
            <Modal isOpen={showLogsModal} onClose={() => setShowLogsModal(false)} title={`Audit Logs - ${getMonthLabel(monthYear)}`}>
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                {loadingLogs ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
                  </div>
                ) : auditLogs.length > 0 ? (
                  <div className="space-y-3">
                    {auditLogs.map((log, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800">{log.item_name} (Day {log.day} {log.session})</span>
                          <span className="text-[10px] text-slate-500 font-semibold">{new Date(log.updated_at).toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] text-slate-600">
                          <p>Stock: <span className="font-mono text-slate-500">{log.old_stock}</span> &rarr; <span className="font-mono font-bold text-slate-800">{log.new_stock}</span></p>
                          <p>Consumed: <span className="font-mono text-slate-500">{log.old_consumed}</span> &rarr; <span className="font-mono font-bold text-slate-800">{log.new_consumed}</span></p>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">Updated by: <span className="font-bold">{log.updated_by}</span></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 font-semibold text-xs">
                    No change logs found for this month.
                  </div>
                )}
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
            <div className="flex border-b border-slate-200 pb-0.5 select-none gap-2 mb-2 bg-white px-5 py-2.5 rounded-2xl border border-slate-200/50 shadow-sm">
              <button
                onClick={() => setActiveTab('active_checkup')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider relative transition-all border-b-2 -mb-[11px] ${
                  activeTab === 'active_checkup'
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
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider relative transition-all border-b-2 -mb-[11px] ${
                  activeTab === 'expired_inventory'
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
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider relative transition-all border-b-2 -mb-[11px] ${
                  activeTab === 'matrix'
                    ? 'border-[#0369a1] text-[#0369a1]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileSpreadsheet size={13} />
                <span>Spreadsheet Matrix</span>
              </button>
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
                            className={`px-3 py-1 rounded transition-all ${
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
                              className={`w-8 h-8 text-xs font-black rounded-lg transition-all border flex items-center justify-center relative active:scale-95 shadow-sm ${
                                isSelected 
                                  ? 'bg-[#0369a1] border-transparent text-white font-black shadow-md' 
                                  : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50 hover:border-slate-350'
                              }`}
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
                          disabled={lockStock}
                          title={lockStock ? "Unlock stock editing to delete expired items" : "Remove all expired items from roster"}
                          className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all flex items-center gap-1.5 active:scale-[0.97] ${
                            lockStock
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none'
                              : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-750 hover:shadow-sm'
                          }`}
                        >
                          <Trash2 size={12} />
                          Delete All Expired
                        </button>
                      )}
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
                      All Items
                    </button>
                    {Object.entries(CATEGORIES).map(([key, cat]) => {
                      const isSelected = selectedCategory === key;
                      const niceLabel = 
                        key === 'medical_supplies' ? 'Supplies' :
                        key === 'medications' ? 'Meds' :
                        key === 'anesthetics' ? 'Anesth' :
                        key === 'antiseptics' ? 'Antisep' :
                        key === 'antidotes' ? 'Antidotes' :
                        key === 'sutures' ? 'Sutures' : key;
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
                                  disabled={isExpired}
                                  className={`w-36 text-center py-1.5 px-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none font-bold text-xs transition-all shadow-sm text-slate-800 ${
                                    isExpired ? 'bg-slate-100/80 text-slate-400 cursor-not-allowed border-slate-200 hover:border-slate-200 shadow-none' : ''
                                  }`}
                                />
                              </td>

                              {/* Status Column (Read-Only Pill Badge) */}
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border shadow-sm ${
                                  cell.status === 'Expired' ? 'text-red-750 bg-red-50 border-red-200 ring-1 ring-red-50' :
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
                                  className={`w-20 text-center py-1.5 px-2 border rounded-xl outline-none font-black text-xs transition-all shadow-sm ${
                                    (lockStock || isExpired)
                                      ? 'bg-slate-55 text-slate-400 border-slate-200 cursor-not-allowed select-none' 
                                      : 'bg-white border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-slate-900'
                                  }`}
                                  type="number"
                                  disabled={lockStock || isExpired}
                                />
                              </td>

                              {/* Consumed items input */}
                              <td className="py-3 px-4 text-center">
                                <input
                                  value={cell.consumed}
                                  onChange={(e) => handleCellEdit(item, 'consumed', e.target.value)}
                                  placeholder="0"
                                  disabled={isExpired}
                                  className={`w-20 text-center py-1.5 px-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none font-black text-xs transition-all shadow-sm ${
                                    isExpired ? 'bg-slate-100/85 text-slate-400 cursor-not-allowed border-slate-200' : ''
                                  }`}
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
                                  disabled={isExpired}
                                  className={`w-full max-w-[200px] py-1.5 px-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-xs font-semibold shadow-sm transition-all ${
                                    isExpired ? 'bg-slate-100/85 text-slate-400 cursor-not-allowed border-slate-200' : ''
                                  }`}
                                />
                              </td>

                              {/* Actions Column */}
                              <td className="py-3 px-4 text-center">
                                {isExpired ? (
                                  <button
                                    onClick={() => handleDeleteItem(item)}
                                    disabled={lockStock}
                                    title={lockStock ? "Unlock stock editing to delete expired items" : "Remove expired item from checkup roster"}
                                    className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all flex items-center gap-1 mx-auto active:scale-[0.95] ${
                                      lockStock
                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none'
                                        : 'border-red-200 bg-red-50 text-red-650 hover:bg-red-100 hover:text-red-700 hover:shadow-sm'
                                    }`}
                                  >
                                    <Trash2 size={12} />
                                    Delete
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
                        { label: 'Full Month (Slow)', value: 'all' },
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
        )}
      </div>

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
    </div>
  );
}
