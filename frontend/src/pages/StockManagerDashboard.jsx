import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Package, Database, AlertTriangle, ArrowRight, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 ${className}`}>{children}</div>;
}

export default function StockManagerDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans bg-slate-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Stock Manager Dashboard</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Welcome back, {user?.fullName}. Here is your operational overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Database size={24} /></div>
            <h3 className="font-black text-slate-800 text-lg">Central Store</h3>
          </div>
          <p className="text-sm text-slate-500 font-medium mb-6">Manage master inventory, track FIFO batches, and fulfill department requisitions.</p>
          <Link to="/central-store" className="mt-auto inline-flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-colors">
            Go to Central Store <ArrowRight size={16} />
          </Link>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Settings size={24} /></div>
            <h3 className="font-black text-slate-800 text-lg">Master Data</h3>
          </div>
          <p className="text-sm text-slate-500 font-medium mb-6">Configure global settings, items, units of measure, and vendor price lists.</p>
          <Link to="/master-module" className="mt-auto inline-flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-colors">
            Manage Master Data <ArrowRight size={16} />
          </Link>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><AlertTriangle size={24} /></div>
            <h3 className="font-black text-slate-800 text-lg">Safety Alerts</h3>
          </div>
          <p className="text-sm text-slate-500 font-medium mb-6">Review low stock warnings and expiring product batches across departments.</p>
          <Link to="/central-store" className="mt-auto inline-flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors">
            Review Alerts <ArrowRight size={16} />
          </Link>
        </Card>
      </div>
      
      <Card>
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Recent System Activity</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
            <Package className="text-slate-400 mt-0.5" size={16} />
            <div>
              <p className="text-sm font-bold text-slate-700">Stock Requisition Approved</p>
              <p className="text-xs text-slate-500">Nursing Department requested 50 units of Ceftriaxone.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
            <Database className="text-slate-400 mt-0.5" size={16} />
            <div>
              <p className="text-sm font-bold text-slate-700">New Item Added to Master</p>
              <p className="text-xs text-slate-500">Paracetamol 500mg was added to the Global Catalog.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
