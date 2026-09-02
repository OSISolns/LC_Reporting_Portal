import React from 'react';
import { useAuth } from '../context/AuthContext';
import ManagementDashboard from './ManagementDashboard';
import StaffDashboard from './StaffDashboard';
import HSFPDashboard from './HSFPDashboard';
import ITDashboard from './ITDashboard';

import DoctorDashboard from './DoctorDashboard';
import StockManagerDashboard from './StockManagerDashboard';
import ProcurementDashboard from './ProcurementDashboard';
import ImagingDashboard from './imaging/ImagingDashboard';
import DentalHodDashboard from './dental/DentalHodDashboard';
import DentalLabDashboard from './dental/DentalLabDashboard';
import DentistDashboard from './dental/DentistDashboard';
import PhysiotherapistDashboard from './physio/PhysiotherapistDashboard';
import PhysioManagerDashboard from './physio/PhysioManagerDashboard';
import LabManagerDashboard from './lab/LabManagerDashboard';
import LabHub from './lab/LabHub';

import { 
  FlaskConical, AlertTriangle, Activity, Stethoscope, 
  Server, ShieldAlert, ArrowRight, ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MGMT_ROLES = ['sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'principal_cashier'];
const STAFF_ROLES = ['cashier', 'customer_care', 'operations_staff', 'consultant', 'nurse', 'chef-nurse', 'pa'];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;

  // Dedicated role-based dashboard dispatch
  if (['lab_manager', 'lab_lead', 'lab_team_lead', 'quality_manager', 'qm'].includes(role)) {
    return <LabManagerDashboard />;
  }
  if (['lab_tech', 'lab'].includes(role)) {
    return <LabHub />;
  }
  if (role === 'hsfp') return <HSFPDashboard />;
  if (role === 'it_officer') return <ITDashboard />;
  if (role === 'stock-manager' || role === 'stock_manager') return <StockManagerDashboard />;
  if (role === 'procurement-manager' || role === 'procurement_manager') return <ProcurementDashboard />;
  if (role === 'imaging_manager' || role === 'imaging_tech') return <div className="p-6"><ImagingDashboard /></div>;
  if (role === 'dental_hod') return <DentalHodDashboard />;
  if (role === 'dentist' || role === 'dental') return <DentistDashboard />;
  if (['dental_lab_manager', 'dental_tech', 'dental_lab'].includes(role)) return <DentalLabDashboard />;
  if (role === 'physio_manager') return <PhysioManagerDashboard />;
  if (['physiotherapist', 'physio'].includes(role)) return <PhysiotherapistDashboard />;
  if (['doctor', 'consultant', 'medical_director'].includes(role)) return <DoctorDashboard />;
  if (MGMT_ROLES.includes(role)) return <ManagementDashboard />;
  if (STAFF_ROLES.includes(role)) return <StaffDashboard />;

  // Modern, Executive Portal Launcher for default / unmapped roles
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans text-slate-800 antialiased">
      <div className="bg-[#1B669E] p-8 rounded-2xl text-white shadow-md border border-[#155280] space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-blue-300" size={24} />
          <span className="text-xs font-semibold uppercase tracking-wider bg-[#155280] px-2.5 py-0.5 rounded border border-[#155280] text-blue-100">
            Lumina Portal Access
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Welcome to Legacy Clinics Lumina Reporting System
        </h1>
        <p className="text-sm text-blue-200/90 font-normal">
          Signed in as <strong className="text-white">{user?.fullName || user?.username || 'Authenticated User'}</strong> ({user?.role || 'General Staff'})
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-blue-950">Quick Workspace Access</h2>
        <p className="text-xs text-slate-500">Select a portal module below to begin your workflow:</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          <div 
            onClick={() => navigate('/lab')}
            className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <FlaskConical className="text-blue-900" size={20} />
              <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-900 transition-transform group-hover:translate-x-1" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Laboratory Hub</h3>
            <p className="text-xs text-slate-500">Specimen diagnostics, worklist, and result transfers.</p>
          </div>

          <div 
            onClick={() => navigate('/incidents')}
            className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <AlertTriangle className="text-amber-600" size={20} />
              <ArrowRight size={16} className="text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-1" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Incident Reporting</h3>
            <p className="text-xs text-slate-500">Log quality, clinical safety, or operational incidents.</p>
          </div>

          <div 
            onClick={() => navigate('/it-ticketing')}
            className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <Server className="text-indigo-600" size={20} />
              <ArrowRight size={16} className="text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">IT Support Hub</h3>
            <p className="text-xs text-slate-500">Submit IT ticketing requests or check equipment status.</p>
          </div>

        </div>
      </div>

      <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500">
        <div>Legacy Clinics • Lumina Reporting Portal</div>
        <div className="font-semibold text-blue-900 uppercase">ISO Compliant Health System</div>
      </div>
    </div>
  );
};

export default Dashboard;
