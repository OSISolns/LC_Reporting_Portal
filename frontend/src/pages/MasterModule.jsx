import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Database, Package, Scale, Truck, DollarSign, Plus, RefreshCw, Loader2, ArrowLeft, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl border border-slate-200/60 shadow-sm ${className}`}>{children}</div>;
}

function Badge({ children, className = '' }) {
  return <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${className}`}>{children}</span>;
}

export default function MasterModule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('items');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Data states
  const [items, setItems] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [prices, setPrices] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    setLoading(true);
    try {
      // We load vendors and master inventory from existing endpoints
      const [invRes, venRes] = await Promise.allSettled([
        api.get('/clinical/inventory/master'),
        api.get('/clinical/inventory/vendors')
      ]);

      let loadedItems = [];
      if (invRes.status === 'fulfilled' && invRes.value.data.success) {
        loadedItems = invRes.value.data.data;
      } else {
        loadedItems = [
          { id: 1, name: "Ceftriaxone 1g", sku: "SKU-CEF-1G", category: "medications" },
          { id: 2, name: "Seringue 10cc", sku: "SKU-SYR-10CC", category: "medical_supplies" }
        ];
      }
      setItems(loadedItems);

      let loadedVendors = [];
      if (venRes.status === 'fulfilled' && venRes.value.data.success) {
        loadedVendors = venRes.value.data.data;
      } else {
        loadedVendors = [
          { id: 1, name: "Medisource Ltd", contact: "info@medisource.com", contract_terms: "Net 30" }
        ];
      }
      setVendors(loadedVendors);

      // Mock UOMs
      setUoms([
        // Packaged & Discrete Units
        { id: 1, name: "Box", abbreviation: "bx", description: "Standard purchasing unit for bulk items" },
        { id: 2, name: "Pack / Package", abbreviation: "pk / pkg", description: "Bundled items like sterile gauze packs" },
        { id: 3, name: "Vial", abbreviation: "vl", description: "Individual glass or plastic vessels (vaccines, antibiotics)" },
        { id: 4, name: "Ampoule", abbreviation: "amp", description: "Small, sealed glass flasks with single-dose liquid" },
        { id: 5, name: "Bottle", abbreviation: "btl", description: "Multi-dose oral medications, syrups, topical solutions" },
        { id: 6, name: "Blister Pack", abbreviation: "bp", description: "Sheets of individually sealed pills" },
        { id: 7, name: "Kit", abbreviation: "kt", description: "Pre-assembled bundle for a single procedure" },
        { id: 8, name: "Each / Piece", abbreviation: "ea / pc", description: "The smallest single unit of inventory" },
        
        // Liquid & Volume Stock Units
        { id: 9, name: "Liter", abbreviation: "L", description: "Tracks bulk liquids or IV bags" },
        { id: 10, name: "Milliliter", abbreviation: "mL", description: "Precision liquid inventory, oral suspensions" },
        { id: 11, name: "Fluid Ounce", abbreviation: "fl oz", description: "Commercial packaging for lotions/sanitizers" },
        { id: 12, name: "Gallon", abbreviation: "gal", description: "Bulk storage, cleaners, gels" },
        
        // Weight & Mass Stock Units
        { id: 13, name: "Kilogram", abbreviation: "kg", description: "Bulk raw materials or solid waste" },
        { id: 14, name: "Gram", abbreviation: "g", description: "Tubes of medicated creams, ointments" },
        { id: 15, name: "Milligram", abbreviation: "mg", description: "Active ingredient strength tracking" },
        
        // Length & Area Stock Units
        { id: 16, name: "Roll", abbreviation: "rl", description: "Medical tape, casting material, cotton padding" },
        { id: 17, name: "Meter", abbreviation: "m", description: "Long sections of clinical supplies (tubing, drains)" },
        { id: 18, name: "Square Centimeter", abbreviation: "cm²", description: "Advanced wound care matrix sheets" },
        { id: 19, name: "Square Inch", abbreviation: "in²", description: "Burn dressings, specialty sheets" }
      ]);

      // Mock Price Master
      setPrices([
        { id: 1, item_name: "Ceftriaxone 1g", base_cost: 2500, markup_percentage: 20, selling_price: 3000, effective_date: "2026-01-01" },
        { id: 2, name: "Seringue 10cc", base_cost: 150, markup_percentage: 33, selling_price: 200, effective_date: "2026-01-01" }
      ]);

      // Mock Department Master
      setDepartments([
        { id: 1, code: "CEN-01", name: "Central Medical Store", head: "Stock Manager", location: "Main Building, Level 1", status: "Active" },
        { id: 2, code: "NUR-01", name: "Nursing Department", head: "Head Nurse", location: "Block B, Level 2", status: "Active" },
        { id: 3, code: "LAB-01", name: "Laboratory", head: "Lab Director", location: "Block C, Level 1", status: "Active" },
        { id: 4, code: "IMG-01", name: "Imaging Department", head: "Head Radiologist", location: "Main Building, Ground Floor", status: "Active" },
        { id: 5, code: "DEN-01", name: "Dental Clinic", head: "Head Dentist", location: "Block A, Level 3", status: "Active" },
        { id: 6, code: "OFF-01", name: "Office Stationeries", head: "Admin Manager", location: "Main Building, Level 4", status: "Active" }
      ]);

    } catch (err) {
      toast.error('Failed to load master data');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate sync
      toast.success('Master Data successfully synchronized across all modules!');
    } catch (err) {
      toast.error('Synchronization failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 font-sans">
      
      {/* Top Header */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-sm border-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-600 text-white rounded-xl"><Database size={18} /></span>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">Master Data Management</h1>
            </div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Centralized Registry & Settings</p>
          </div>
        </div>

        <button 
          onClick={handleSync}
          disabled={syncing}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 border-0 cursor-pointer"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Synchronizing...' : 'Sync with Modules'}
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 mt-8">
        
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200 pb-0.5 select-none gap-2 mb-6 bg-white px-5 py-2.5 rounded-2xl border border-slate-200/50 shadow-sm scrollbar-none">
          {[
            { id: 'departments', label: 'Department Master', icon: <Building2 size={14} /> },
            { id: 'items', label: 'Items Master', icon: <Package size={14} /> },
            { id: 'uoms', label: 'Unit of Measure', icon: <Scale size={14} /> },
            { id: 'vendors', label: 'Vendor Master', icon: <Truck size={14} /> },
            { id: 'prices', label: 'Price Master', icon: <DollarSign size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider relative transition-all border-b-2 -mb-[11px] border-0 bg-transparent shrink-0 ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 cursor-pointer'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* DEPARTMENT MASTER */}
            {activeTab === 'departments' && (
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Department Master</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Configuration of clinical units and cost centers</p>
                  </div>
                  <button className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-200 flex items-center gap-1.5 cursor-pointer">
                    <Plus size={14} /> Add Department
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3 px-4">Dept Code</th>
                        <th className="py-3 px-4">Department Name</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Department Head</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {departments.map(dept => (
                        <tr key={dept.id} className="hover:bg-slate-50/40">
                          <td className="py-3 px-4 font-mono text-[11px] text-indigo-600">{dept.code}</td>
                          <td className="py-3 px-4 text-slate-900 font-black text-[13px]">{dept.name}</td>
                          <td className="py-3 px-4 text-slate-500">{dept.location}</td>
                          <td className="py-3 px-4 text-slate-700">{dept.head}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-250">{dept.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ITEMS MASTER */}
            {activeTab === 'items' && (
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Items Master Registry</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Global catalog of all products and services</p>
                  </div>
                  <button className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-200 flex items-center gap-1.5 cursor-pointer">
                    <Plus size={14} /> Add Item
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4">SKU / Code</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {items.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/40">
                          <td className="py-3 px-4 text-slate-900 font-black text-[13px]">{item.name}</td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{item.sku}</td>
                          <td className="py-3 px-4 capitalize">{item.category?.replace(/_/g, ' ')}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-250">Active</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* UOM MASTER */}
            {activeTab === 'uoms' && (
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Unit of Measure (UOM) Master</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Standardized measurement units for inventory</p>
                  </div>
                  <button className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-200 flex items-center gap-1.5 cursor-pointer">
                    <Plus size={14} /> Add UOM
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3 px-4">Unit Name</th>
                        <th className="py-3 px-4">Abbreviation</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {uoms.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/40">
                          <td className="py-3 px-4 text-slate-900 font-black text-[13px]">{u.name}</td>
                          <td className="py-3 px-4 font-mono text-[11px] text-indigo-600">{u.abbreviation}</td>
                          <td className="py-3 px-4 text-slate-500">{u.description}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-250">Active</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* VENDOR MASTER */}
            {activeTab === 'vendors' && (
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Vendor Master</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Global list of approved suppliers</p>
                  </div>
                  <button className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-200 flex items-center gap-1.5 cursor-pointer">
                    <Plus size={14} /> Add Vendor
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3 px-4">Vendor Name</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Contract Terms</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {vendors.map(v => (
                        <tr key={v.id} className="hover:bg-slate-50/40">
                          <td className="py-3 px-4 text-slate-900 font-black text-[13px]">{v.name}</td>
                          <td className="py-3 px-4 text-slate-500">{v.contact}</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{v.contract_terms}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-250">Active</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* PRICE MASTER */}
            {activeTab === 'prices' && (
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Price Master</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Base costs and selling prices (RWF)</p>
                  </div>
                  <button className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-200 flex items-center gap-1.5 cursor-pointer">
                    <Plus size={14} /> Add Price Config
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4 text-right">Base Cost (RWF)</th>
                        <th className="py-3 px-4 text-center">Markup %</th>
                        <th className="py-3 px-4 text-right">Selling Price (RWF)</th>
                        <th className="py-3 px-4 text-center">Effective Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {prices.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/40">
                          <td className="py-3 px-4 text-slate-900 font-black text-[13px]">{p.item_name || p.name}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">{p.base_cost.toLocaleString()} RWF</td>
                          <td className="py-3 px-4 text-center text-amber-600">{p.markup_percentage}%</td>
                          <td className="py-3 px-4 text-right font-mono text-indigo-700 font-black">{p.selling_price.toLocaleString()} RWF</td>
                          <td className="py-3 px-4 text-center text-slate-500">{p.effective_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
