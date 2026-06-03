import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Database,
  Truck,
  Plus,
  AlertTriangle,
  ArrowRightLeft,
  DollarSign,
  ShoppingBag,
  Trash2,
  Package,
  Calendar,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { Card, Button, Badge } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

export default function CentralStoreHub() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Navigation Tabs matching new requirements
  const [activeTab, setActiveTab] = useState('stock_in_hand'); 
  const [activeDepartment, setActiveDepartment] = useState('All Departments');
  // 'stock_in_hand', 'vendors', 'requisitions', 'pos', 'expiring', 'disposals'

  const [loading, setLoading] = useState(true);

  // Core Data States
  const [stockInHand, setStockInHand] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [disposals, setDisposals] = useState([]);

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [invRes, batchRes, reqRes, venRes] = await Promise.allSettled([
        api.get('/clinical/inventory/master'),
        api.get('/clinical/inventory/batches'),
        api.get('/clinical/inventory/requisitions'),
        api.get('/clinical/inventory/vendors')
      ]);

      // VENDORS
      let venList = [];
      if (venRes.status === 'fulfilled' && venRes.value.data.success) {
        venList = venRes.value.data.data;
      } else {
        venList = [
          { id: 1, name: "Medisource Ltd", contact: "info@medisource.com", contract_terms: "Net 30", is_active: 1 },
          { id: 2, name: "KIPHARMA", contact: "sales@kipharma.com", contract_terms: "COD", is_active: 1 },
          { id: 3, name: "Best stationary", contact: "best@stationary.rw", contract_terms: "Net 15", is_active: 1 }
        ];
      }
      setVendors(venList);

      // STOCK IN HAND (Combines batches with master items and adds department/category)
      let loadedStock = [];
      if (invRes.status === 'fulfilled' && invRes.value.data.success) {
        const masterItems = invRes.value.data.data;
        const batchesList = (batchRes.status === 'fulfilled' && batchRes.value.data.success) ? batchRes.value.data.data : [];
        
        masterItems.forEach(item => {
          const itemBatches = batchesList.filter(b => b.item_id === item.id || b.item_name === item.name);
          
          const dept = item.category === 'imaging_department' ? 'Imaging Department' : (item.category === 'office_stationery' ? 'Office Stationeries' : 'Central Store');
          const cat = item.category?.replace(/_/g, ' ') || 'General';
          
          if (itemBatches.length > 0) {
            itemBatches.forEach(b => {
              loadedStock.push({
                id: b.id,
                name: item.name,
                sku: item.sku || 'SKU-001',
                batchNumber: b.batch_number || 'N/A',
                uom: item.unit_of_measure || 'Box',
                expiryDate: b.expiry_date || 'N/A',
                purchaseTime: b.created_at ? new Date(b.created_at).toLocaleDateString() : 'N/A',
                department: dept,
                category: cat,
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
              uom: item.unit_of_measure || 'Box',
              expiryDate: 'N/A',
              purchaseTime: 'N/A',
              department: dept,
              category: cat,
              quantity: 0,
              price: 0
            });
          }
        });
      } else {
        loadedStock = [
          { id: 1, name: "Ceftriaxone 1g", sku: "SKU-CEF-1G", batchNumber: "BCH-10029", uom: "vial", expiryDate: "11/2026", purchaseTime: "01/05/2026", department: "Imaging Department", category: "Medications", quantity: 150, price: 2500 },
          { id: 2, name: "Stylos", sku: "SKU-STY-001", batchNumber: "BCH-2291", uom: "piece", expiryDate: "N/A", purchaseTime: "15/04/2026", department: "Office Stationeries", category: "Office Supplies", quantity: 450, price: 160 }
        ];
      }
      setStockInHand(loadedStock);

      // REQUISITIONS
      let reqList = [];
      if (reqRes.status === 'fulfilled' && reqRes.value.data.success) {
        reqList = reqRes.value.data.data;
      } else {
        reqList = [
          { id: 1, department_name: "Imaging Department", urgency: "High", status: "Pending", created_at: "2026-06-02T12:00:00.000Z", items_count: 3 },
          { id: 2, department_name: "Laboratory", urgency: "Normal", status: "Approved", created_at: "2026-06-01T09:30:00.000Z", items_count: 1 }
        ];
      }
      setRequisitions(reqList);

      // POs
      setPurchaseOrders([
        { id: 'PO-10029', vendor_name: 'KIPHARMA', item_name: 'Visipaque 320mg', quantity: 200, unit_price: 44500, total: 8900000, status: 'Completed', date: '2026-05-20' },
        { id: 'PO-10030', vendor_name: 'Best stationary', item_name: 'Registres', quantity: 100, unit_price: 4000, total: 400000, status: 'Ordered', date: '2026-06-02' }
      ]);

      // Disposals History Mock
      setDisposals([
        { id: 1, item_name: 'Ceftriaxone 1g', batch_number: 'BCH-10020', quantity: 15, reason: 'Expired', date: '2026-05-15', department: 'Central Store' }
      ]);

    } catch (err) {
      console.error(err);
      toast.error('Failed to load Central Store Hub data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 font-sans">
      {/* Top Header */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-sm border-0 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#0369a1] text-white rounded-xl"><Database size={18} /></span>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">Central Store Hub</h1>
            </div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Global Stock & Procurement Management</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 mt-6">
        
        {/* Navigation Tabs (Exactly as requested) */}
        <div className="flex overflow-x-auto border-b border-slate-200 pb-0.5 select-none gap-2 mb-6 bg-white px-5 py-2.5 rounded-2xl border border-slate-200/50 shadow-sm scrollbar-none">
          {[
            { id: 'stock_in_hand', label: 'Stock In Hand', icon: <Package size={14} /> },
            { id: 'vendors', label: 'Vendors', icon: <Truck size={14} /> },
            { id: 'requisitions', label: 'Requisitions', icon: <ArrowRightLeft size={14} /> },
            { id: 'pos', label: 'Purchase Orders', icon: <ShoppingBag size={14} /> },
            { id: 'expiring', label: 'Expiring Items', icon: <Calendar size={14} /> },
            { id: 'disposals', label: 'Disposal Management', icon: <Trash2 size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider relative transition-all border-b-2 -mb-[11px] border-0 bg-transparent shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#0369a1] text-[#0369a1]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0369a1]" />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* TAB 1: STOCK IN HAND */}
            {activeTab === 'stock_in_hand' && (
              <Card className="p-6 border border-slate-200/60 shadow-sm bg-white rounded-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Stock In Hand Per Departments</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Comprehensive view of all departmental stock</p>
                  </div>
                  
                  {/* Department Sub-Tabs */}
                  <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
                    {['All Departments', ...new Set(stockInHand.map(item => item.department))].map(dept => (
                      <button
                        key={dept}
                        onClick={() => setActiveDepartment(dept)}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                          activeDepartment === dept 
                            ? 'bg-white text-[#0369a1] shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4">SKU</th>
                        <th className="py-3 px-4">Batch Number</th>
                        <th className="py-3 px-4">UoM</th>
                        <th className="py-3 px-4">Expiry Date</th>
                        <th className="py-3 px-4">Purchase Time</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-center">Number (Qty)</th>
                        <th className="py-3 px-4 text-right">Price (RWF)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {stockInHand
                        .filter(item => activeDepartment === 'All Departments' || item.department === activeDepartment)
                        .map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/40">
                          <td className="py-3 px-4 text-slate-900 font-black text-[13px]">{item.name}</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{item.sku}</td>
                          <td className="py-3 px-4 font-mono text-[#0369a1]">{item.batchNumber}</td>
                          <td className="py-3 px-4">{item.uom}</td>
                          <td className="py-3 px-4">{item.expiryDate}</td>
                          <td className="py-3 px-4 text-slate-500">{item.purchaseTime}</td>
                          <td className="py-3 px-4 text-[#0369a1]">{item.department}</td>
                          <td className="py-3 px-4 capitalize">{item.category}</td>
                          <td className="py-3 px-4 text-center text-slate-900 font-black">{item.quantity}</td>
                          <td className="py-3 px-4 text-right font-mono">{item.price?.toLocaleString()} RWF</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* TAB 2: VENDORS */}
            {activeTab === 'vendors' && (
              <Card className="p-6 border border-slate-200/60 shadow-sm bg-white rounded-2xl">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Vendors & Suppliers</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Approved medical and stationery suppliers</p>
                  </div>
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
                          <td className="py-3 px-4 text-slate-500">{v.contact || 'N/A'}</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{v.contract_terms || 'N/A'}</td>
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

            {/* TAB 3: REQUISITIONS */}
            {activeTab === 'requisitions' && (
              <Card className="p-6 border border-slate-200/60 shadow-sm bg-white rounded-2xl">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Department Requisitions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Urgency</th>
                        <th className="py-3 px-4 text-center">Items Requested</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {requisitions.map(req => (
                        <tr key={req.id} className="hover:bg-slate-50/40 cursor-pointer">
                          <td className="py-3 px-4 text-[#0369a1] font-black text-[13px]">{req.department_name}</td>
                          <td className="py-3 px-4">{new Date(req.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <Badge className={req.urgency === 'High' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-655 border-slate-200'}>
                              {req.urgency}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">{req.items_count} Types</td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={req.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-250' : 'bg-emerald-50 text-emerald-700'}>
                              {req.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* TAB 4: PURCHASE ORDERS */}
            {activeTab === 'pos' && (
              <Card className="p-6 border border-slate-200/60 shadow-sm bg-white rounded-2xl">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Purchase Order Manager</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Manage and track external procurement</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3 px-4">PO Number</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Supplier</th>
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4 text-center">Qty</th>
                        <th className="py-3 px-4 text-right">Unit Price (RWF)</th>
                        <th className="py-3 px-4 text-right">Total (RWF)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {purchaseOrders.map(po => (
                        <tr key={po.id} className="hover:bg-slate-50/40">
                          <td className="py-3 px-4 font-mono text-[#0369a1]">{po.id}</td>
                          <td className="py-3 px-4 text-slate-500">{po.date}</td>
                          <td className="py-3 px-4 text-slate-900 font-black text-[13px]">{po.vendor_name}</td>
                          <td className="py-3 px-4">{po.item_name}</td>
                          <td className="py-3 px-4 text-center">{po.quantity}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">{po.unit_price.toLocaleString()} RWF</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-900">{po.total.toLocaleString()} RWF</td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={po.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>
                              {po.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* TAB 5: EXPIRING ITEMS */}
            {activeTab === 'expiring' && (
              <Card className="p-6 border border-slate-200/60 shadow-sm bg-white rounded-2xl">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Expiring Items</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Expiring items per departments and per batch</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Batch Number</th>
                        <th className="py-3 px-4">Expiry Date</th>
                        <th className="py-3 px-4 text-center">Quantity Left</th>
                        <th className="py-3 px-4 text-center">Risk Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {stockInHand
                        .filter(item => item.expiryDate && (item.expiryDate.includes('2026') || item.expiryDate.includes('2025')))
                        .map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/40">
                          <td className="py-3 px-4 text-slate-900 font-black text-[13px]">{item.name}</td>
                          <td className="py-3 px-4 text-[#0369a1]">{item.department}</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{item.batchNumber}</td>
                          <td className="py-3 px-4 font-bold text-red-600">{item.expiryDate}</td>
                          <td className="py-3 px-4 text-center text-slate-900 font-black">{item.quantity}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge className="bg-red-50 text-red-700 border-red-200 animate-pulse">Critical</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* TAB 6: DISPOSALS */}
            {activeTab === 'disposals' && (
              <div className="space-y-6">
                <Card className="p-6 border border-slate-200/60 shadow-sm bg-white rounded-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Items to Dispose</h3>
                      <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Expired or damaged items pending disposal approval</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                          <th className="py-3 px-4">Item Name</th>
                          <th className="py-3 px-4">Batch Number</th>
                          <th className="py-3 px-4">Reason</th>
                          <th className="py-3 px-4 text-center">Quantity</th>
                          <th className="py-3 px-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {stockInHand
                          .filter(item => item.expiryDate && (item.expiryDate.includes('2024') || item.expiryDate.includes('2025')))
                          .map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/40">
                            <td className="py-3 px-4 text-slate-900 font-black text-[13px]">{item.name}</td>
                            <td className="py-3 px-4 font-mono text-slate-500">{item.batchNumber}</td>
                            <td className="py-3 px-4 text-red-600">Expired</td>
                            <td className="py-3 px-4 text-center text-slate-900 font-black">{item.quantity}</td>
                            <td className="py-3 px-4 text-center">
                              <button className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg border border-red-200 text-[10px] font-black uppercase tracking-wider hover:bg-red-100 transition-colors cursor-pointer">
                                Confirm Disposal
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <Card className="p-6 border border-slate-200/60 shadow-sm bg-white rounded-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">History of Disposed Items</h3>
                      <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Audit log of successfully disposed items</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                          <th className="py-3 px-4">Date Disposed</th>
                          <th className="py-3 px-4">Department</th>
                          <th className="py-3 px-4">Item Name</th>
                          <th className="py-3 px-4">Batch Number</th>
                          <th className="py-3 px-4">Reason</th>
                          <th className="py-3 px-4 text-center">Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {disposals.map(disp => (
                          <tr key={disp.id} className="hover:bg-slate-50/40">
                            <td className="py-3 px-4 text-slate-500">{disp.date}</td>
                            <td className="py-3 px-4 text-[#0369a1]">{disp.department}</td>
                            <td className="py-3 px-4 text-slate-900 font-black text-[13px]">{disp.item_name}</td>
                            <td className="py-3 px-4 font-mono text-slate-500">{disp.batch_number}</td>
                            <td className="py-3 px-4 text-red-600">{disp.reason}</td>
                            <td className="py-3 px-4 text-center text-slate-900 font-black">{disp.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}
