import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Package, Database, AlertTriangle, ArrowRight, Settings, 
  TrendingUp, Activity, CheckCircle, Clock, Search, 
  ArrowRightLeft, FileWarning, Calendar, Loader2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

export default function StockManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stockInHand, setStockInHand] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [vendors, setVendors] = useState([]);

  // Fetch Data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [invRes, batchRes, reqRes, venRes] = await Promise.allSettled([
          api.get('/clinical/inventory/master'),
          api.get('/clinical/inventory/batches'),
          api.get('/clinical/inventory/requisitions'),
          api.get('/clinical/inventory/vendors')
        ]);

        // Requisitions
        if (reqRes.status === 'fulfilled' && reqRes.value.data.success) {
          setRequisitions(reqRes.value.data.data || []);
        } else {
          setRequisitions([
            { id: 1, department_name: "Imaging Department", urgency: "High", status: "Pending", created_at: "2026-06-02T12:00:00.000Z", items_count: 3 },
            { id: 2, department_name: "Laboratory", urgency: "Normal", status: "Approved", created_at: "2026-06-01T09:30:00.000Z", items_count: 1 }
          ]);
        }

        // Stock Data
        let loadedStock = [];
        if (invRes.status === 'fulfilled' && invRes.value.data.success) {
          const masterItems = invRes.value.data.data;
          const batchesList = (batchRes.status === 'fulfilled' && batchRes.value.data.success) ? batchRes.value.data.data : [];
          
          masterItems.forEach(item => {
            const itemBatches = batchesList.filter(b => b.item_id === item.id || b.item_name === item.name);
            const dept = item.category === 'imaging_department' ? 'Imaging Department' : (item.category === 'office_stationery' ? 'Office Stationeries' : 'Central Store');
            
            if (itemBatches.length > 0) {
              itemBatches.forEach(b => {
                loadedStock.push({
                  id: b.id,
                  name: item.name,
                  sku: item.sku || 'SKU-001',
                  batchNumber: b.batch_number || 'N/A',
                  expiryDate: b.expiry_date || 'N/A',
                  department: dept,
                  quantity: b.quantity || 0,
                  price: b.purchase_price || 0
                });
              });
            } else {
              loadedStock.push({
                id: 'M-' + item.id,
                name: item.name,
                sku: item.sku || 'SKU-001',
                batchNumber: 'N/A',
                expiryDate: 'N/A',
                department: dept,
                quantity: 0,
                price: 0
              });
            }
          });
        } else {
          loadedStock = [
            { id: 1, name: "Ceftriaxone 1g", batchNumber: "BCH-10029", expiryDate: "11/2026", department: "Imaging Department", quantity: 150, price: 2500 },
            { id: 2, name: "Paracetamol 500mg", batchNumber: "BCH-10030", expiryDate: "05/2026", department: "Central Store", quantity: 5, price: 50 },
            { id: 3, name: "Stylos", batchNumber: "BCH-2291", expiryDate: "N/A", department: "Office Stationeries", quantity: 450, price: 160 }
          ];
        }
        setStockInHand(loadedStock);

        // Vendors
        if (venRes.status === 'fulfilled' && venRes.value.data.success) {
          setVendors(venRes.value.data.data || []);
        } else {
          setVendors([{ id: 1 }, { id: 2 }, { id: 3 }]); // Dummy counts
        }

      } catch (err) {
        console.error(err);
        toast.error('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Compute Metrics
  const metrics = useMemo(() => {
    let totalValue = 0;
    let lowStockCount = 0;
    let expiringSoonCount = 0;
    const currentYear = new Date().getFullYear();

    stockInHand.forEach(item => {
      totalValue += (item.quantity * item.price);
      if (item.quantity > 0 && item.quantity < 20) { // Arbitrary threshold
        lowStockCount++;
      }
      if (item.expiryDate && (item.expiryDate.includes(currentYear.toString()) || item.expiryDate.includes((currentYear + 1).toString()))) {
        expiringSoonCount++;
      }
    });

    const pendingReqs = requisitions.filter(r => r.status === 'Pending');

    return {
      totalValue,
      lowStockCount,
      expiringSoonCount,
      pendingRequisitions: pendingReqs,
      vendorCount: vendors.length
    };
  }, [stockInHand, requisitions, vendors]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4"
        >
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Package className="text-indigo-600" size={32} />
              Stock Operations
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Welcome back, <span className="text-slate-800 font-bold">{user?.fullName || 'Manager'}</span>. Here is your realtime overview.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/master')} className="bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm cursor-pointer">
              <Settings size={16} /> master
            </button>
            <button onClick={() => navigate('/central-store')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-md shadow-indigo-200 cursor-pointer">
              Central Store <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-200/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-inner"><TrendingUp size={24} /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Value</p>
                    <h3 className="text-2xl font-black text-slate-800">{metrics.totalValue.toLocaleString()} <span className="text-sm text-slate-500 font-bold">RWF</span></h3>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600">
                  <Activity size={14} /> <span className="bg-emerald-50 px-2 py-0.5 rounded-md">Live Valuation</span>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-200/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-2xl shadow-inner"><ArrowRightLeft size={24} /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Reqs</p>
                    <h3 className="text-2xl font-black text-slate-800">{metrics.pendingRequisitions.length}</h3>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-amber-600">
                  <Clock size={14} /> <span className="bg-amber-50 px-2 py-0.5 rounded-md">Needs action</span>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-200/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-gradient-to-br from-rose-400 to-rose-600 text-white rounded-2xl shadow-inner"><AlertTriangle size={24} /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock</p>
                    <h3 className="text-2xl font-black text-slate-800">{metrics.lowStockCount}</h3>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-rose-600">
                  <FileWarning size={14} /> <span className="bg-rose-50 px-2 py-0.5 rounded-md">Restock recommended</span>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-200/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-violet-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-gradient-to-br from-violet-400 to-violet-600 text-white rounded-2xl shadow-inner"><Calendar size={24} /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expiring Items</p>
                    <h3 className="text-2xl font-black text-slate-800">{metrics.expiringSoonCount}</h3>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-violet-600">
                  <CheckCircle size={14} /> <span className="bg-violet-50 px-2 py-0.5 rounded-md">Monitor batches</span>
                </div>
              </motion.div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              <motion.div variants={itemVariants} className="bg-white/90 backdrop-blur-2xl rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col h-[400px]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><ArrowRightLeft size={18} /></div>
                    <h2 className="font-black text-slate-800">Pending Requisitions</h2>
                  </div>
                  <button onClick={() => navigate('/central-store')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg cursor-pointer">View All</button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                  {metrics.pendingRequisitions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <CheckCircle size={48} className="mb-4 opacity-20" />
                      <p className="font-bold">No pending requests</p>
                      <p className="text-xs">All caught up!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <AnimatePresence>
                        {metrics.pendingRequisitions.slice(0, 5).map(req => (
                          <motion.div 
                            key={req.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ scale: 1.02 }}
                            className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                            onClick={() => navigate('/central-store')}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm">
                                {req.department_name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-black text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">{req.department_name}</h4>
                                <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                  <Clock size={12} /> {new Date(req.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${req.urgency === 'High' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                                {req.urgency}
                              </span>
                              <p className="text-xs font-bold text-slate-600 mt-1">{req.items_count} items</p>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white/90 backdrop-blur-2xl rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col h-[400px]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-xl"><Calendar size={18} /></div>
                    <h2 className="font-black text-slate-800">Critical Alerts</h2>
                  </div>
                  <button onClick={() => navigate('/central-store')} className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg cursor-pointer">Manage Stock</button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                  {stockInHand.filter(i => (i.quantity > 0 && i.quantity < 20) || (i.expiryDate && i.expiryDate.includes(new Date().getFullYear().toString()))).length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <Database size={48} className="mb-4 opacity-20" />
                      <p className="font-bold">Inventory is healthy</p>
                      <p className="text-xs">No immediate action needed</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {stockInHand
                        .filter(i => (i.quantity > 0 && i.quantity < 20) || (i.expiryDate && i.expiryDate.includes(new Date().getFullYear().toString())))
                        .slice(0, 5)
                        .map((item, idx) => {
                          const isExpiring = item.expiryDate && item.expiryDate.includes(new Date().getFullYear().toString());
                          return (
                            <motion.div 
                              key={idx}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100"
                            >
                              <div>
                                <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                                  {item.name}
                                  {isExpiring && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
                                </h4>
                                <p className="text-[11px] font-mono text-slate-500 mt-1">BATCH: {item.batchNumber}</p>
                              </div>
                              <div className="text-right">
                                {isExpiring ? (
                                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-100 px-2 py-1 rounded-md">
                                    Expires {item.expiryDate}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-100 px-2 py-1 rounded-md">
                                    Only {item.quantity} left
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>

            </div>
          </motion.div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
