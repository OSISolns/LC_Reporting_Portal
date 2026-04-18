import { useAuth } from '../context/AuthContext';
import ManagementDashboard from './ManagementDashboard';
import StaffDashboard from './StaffDashboard';
import QADashboard from './QADashboard';

const MGMT_ROLES  = ['sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo'];
const STAFF_ROLES = ['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'lab_team_lead', 'consultant'];

const Dashboard = () => {
  const { user } = useAuth();
  const role = user?.role;

  if (role === 'quality_assurance')    return <QADashboard />;
  if (MGMT_ROLES.includes(role))       return <ManagementDashboard />;
  if (STAFF_ROLES.includes(role))      return <StaffDashboard />;

  // Fallback (unknown role)
  return (
    <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
      <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Welcome to the Legacy Clinics Reporting Portal.</p>
      <p>Your dashboard is being configured. Please contact your administrator.</p>
    </div>
  );
};

export default Dashboard;
