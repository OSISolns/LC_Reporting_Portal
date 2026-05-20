import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';
import AIInsights from './pages/AIInsights';
import Notifications from './pages/Notifications';


import CancellationList from './pages/cancellations/CancellationList';
import RefundList from './pages/refunds/RefundList';
import IncidentList from './pages/incidents/IncidentList';
import ResultTransferList from './pages/results-transfer/ResultTransferList';
import PerformanceDashboard from './pages/performance/PerformanceDashboard';
import Permissions from './pages/Permissions';
import Unauthorized from './pages/Unauthorized';
import OpenShift from './pages/shifts/OpenShift';
import CloseShift from './pages/shifts/CloseShift';
import ShiftDashboard from './pages/shifts/ShiftDashboard';
import ShiftDetail from './pages/shifts/ShiftDetail';
import NurseShiftDashboard from './pages/shifts/NurseShiftDashboard';
import StaffShiftDashboard from './pages/shifts/StaffShiftDashboard';
import SafetyManagement from './pages/SafetyManagement';
import ClinicalSheet from './pages/ClinicalSheet';
import ClinicalObservationList from './pages/ClinicalObservationList';
import PatientRecords from './pages/PatientRecords';


const ShiftDashboardRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'nurse') return <NurseShiftDashboard />;
  if (['cashier', 'customer_care'].includes(user?.role)) return <StaffShiftDashboard />;
  return <ShiftDashboard />;
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            
            <Route path="/users" element={<ProtectedRoute allowedRoles={['admin', 'it_officer']}><Users /></ProtectedRoute>} />
            <Route path="/permissions" element={<ProtectedRoute allowedRoles={['admin']}><Permissions /></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={['admin', 'coo', 'deputy_coo', 'hsfp']}><AuditLogs /></ProtectedRoute>} />
            <Route path="/safety-management" element={<ProtectedRoute allowedRoles={['hsfp', 'admin', 'reviewer']}><SafetyManagement /></ProtectedRoute>} />
            <Route path="/ai-insights" element={<ProtectedRoute allowedRoles={['sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'principal_cashier', 'consultant', 'reviewer']}><AIInsights /></ProtectedRoute>} />
            
            <Route path="/cancellations" element={<ProtectedRoute allowedRoles={['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant', 'reviewer']}><CancellationList /></ProtectedRoute>} />
            
            <Route path="/refunds" element={<ProtectedRoute allowedRoles={['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant', 'reviewer']}><RefundList /></ProtectedRoute>} />
            
            <Route path="/incidents" element={<ProtectedRoute allowedRoles={['nurse', 'admin', 'hsfp', 'operations_staff', 'customer_care', 'it_officer', 'reviewer', 'chef-nurse']}><IncidentList /></ProtectedRoute>} />

            
            <Route path="/results-transfer" element={<ProtectedRoute allowedRoles={['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'lab_team_lead', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant', 'reviewer']}><ResultTransferList /></ProtectedRoute>} />
            <Route path="/performance" element={<ProtectedRoute allowedRoles={['sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'reviewer']}><PerformanceDashboard /></ProtectedRoute>} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/clinical-observation" element={<ProtectedRoute allowedRoles={['nurse', 'admin', 'doctor', 'consultant', 'reviewer', 'chef-nurse']}><ClinicalObservationList /></ProtectedRoute>} />
            <Route path="/patients/:patientId/clinical-sheet" element={<ProtectedRoute allowedRoles={['nurse', 'admin', 'doctor', 'consultant', 'reviewer', 'chef-nurse']}><ClinicalSheet /></ProtectedRoute>} />
            <Route path="/patients/:patientId/records" element={<ProtectedRoute allowedRoles={['nurse', 'admin', 'doctor', 'consultant', 'reviewer', 'chef-nurse']}><PatientRecords /></ProtectedRoute>} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* ── Shift Module ── */}
            <Route path="/shifts/open" element={
              <ProtectedRoute allowedRoles={['cashier','customer_care','lab_team_lead','admin','deputy_coo','it_officer','staff', 'nurse', 'reviewer', 'chef-nurse']}>
                <OpenShift />
              </ProtectedRoute>
            } />
            <Route path="/shifts/close/:id" element={
              <ProtectedRoute allowedRoles={['cashier','customer_care','lab_team_lead','admin','deputy_coo','it_officer','staff', 'nurse', 'reviewer', 'chef-nurse']}>
                <CloseShift />
              </ProtectedRoute>
            } />
            <Route path="/shifts/:id" element={<ShiftDetail />} />
            <Route path="/shifts" element={
              <ProtectedRoute allowedRoles={['principal_cashier','sales_manager','deputy_coo','coo','admin', 'it_officer', 'operations_staff', 'nurse', 'reviewer', 'cashier', 'customer_care', 'chef-nurse']}>
                <ShiftDashboardRedirect />
              </ProtectedRoute>
            } />
          </Route>


          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
