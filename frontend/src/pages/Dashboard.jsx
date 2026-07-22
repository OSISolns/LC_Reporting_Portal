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

const MGMT_ROLES = ['sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'principal_cashier'];
const STAFF_ROLES = ['cashier', 'customer_care', 'operations_staff', 'lab_team_lead', 'consultant', 'nurse', 'chef-nurse', 'pa'];

const Dashboard = () => {
  const { user } = useAuth();
  const role = user?.role;

  if (role === 'hsfp') return <HSFPDashboard />;
  if (role === 'it_officer') return <ITDashboard />;
  if (role === 'stock-manager' || role === 'stock_manager') return <StockManagerDashboard />;
  if (role === 'procurement-manager' || role === 'procurement_manager') return <ProcurementDashboard />;
  if (role === 'imaging_manager' || role === 'imaging_tech') return <div className="p-6"><ImagingDashboard /></div>;
  if (role === 'dental_hod') return <DentalHodDashboard />;
  if (['doctor', 'consultant', 'medical_director'].includes(role)) return <DoctorDashboard />;
  if (MGMT_ROLES.includes(role)) return <ManagementDashboard />;
  if (STAFF_ROLES.includes(role)) return <StaffDashboard />;

  // Fallback (unknown role)
  return (
    <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
      <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Welcome to the Legacy Clinics Lumina Portal.</p>
      <p>Your dashboard is being configured. Please contact your administrator.</p>
    </div>
  );
};

export default Dashboard;
