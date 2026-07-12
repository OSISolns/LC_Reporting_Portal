import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { Toaster } from 'react-hot-toast';

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
import RiskRegister from './pages/RiskRegister';
import InfectionControlTracker from './pages/InfectionControlTracker';
import RevenueLeakageTracker from './pages/RevenueLeakageTracker';
import CompliancePortal from './pages/CompliancePortal';
import ITAssetTicketing from './pages/ITAssetTicketing';
import ClinicalSheet from './pages/ClinicalSheet';
import ClinicalSheetsList from './pages/ClinicalSheetsList';
import ClinicalObservationList from './pages/ClinicalObservationList';
import NursingHub from './pages/NursingHub';
import DoctorHub from './pages/DoctorHub';
import PatientRecords from './pages/PatientRecords';
import FeedbackList from './pages/feedbacks/FeedbackList';
import EPrescriptions from './pages/EPrescriptions';
import DailyInventoryCheckup from './pages/DailyInventoryCheckup';
import DailyOperationalReport from './pages/DailyOperationalReport';
import DailyOperationalReportBoard from './pages/DailyOperationalReportBoard';
import CentralStoreHub from './pages/CentralStoreHub';
import MasterModule from './pages/MasterModule';
import SupplierPortalPublic from './pages/SupplierPortalPublic';
import ProcurementHub from './pages/ProcurementHub';
import SupplierPortalManager from './pages/SupplierPortalManager';
import ConsumablesLog from './pages/ConsumablesLog';
import ImagingHub from './pages/imaging/ImagingHub';

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
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/supplier-portal" element={<SupplierPortalPublic />} />
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            
            <Route path="/users" element={<ProtectedRoute allowedRoles={['admin', 'it_officer']}><Users /></ProtectedRoute>} />
            <Route path="/permissions" element={<ProtectedRoute allowedRoles={['admin']}><Permissions /></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogs /></ProtectedRoute>} />
            <Route path="/safety-management" element={<ProtectedRoute allowedRoles={['hsfp', 'admin', 'deputy_coo', 'medical_director']}><SafetyManagement /></ProtectedRoute>} />
            <Route path="/risk-register" element={<ProtectedRoute allowedRoles={['hsfp', 'admin', 'deputy_coo', 'medical_director']}><RiskRegister /></ProtectedRoute>} />
            <Route path="/infection-control" element={<ProtectedRoute allowedRoles={['hsfp', 'admin', 'deputy_coo', 'medical_director']}><InfectionControlTracker /></ProtectedRoute>} />
            <Route path="/revenue-tracker" element={<ProtectedRoute allowedRoles={['sales_manager', 'chairman', 'admin', 'principal_cashier', 'deputy_coo']}><RevenueLeakageTracker /></ProtectedRoute>} />
            <Route path="/compliance" element={<ProtectedRoute allowedRoles={['admin', 'hsfp']}><CompliancePortal /></ProtectedRoute>} />
            <Route path="/it-ticketing" element={<ITAssetTicketing />} />
            <Route path="/ai-insights" element={<ProtectedRoute allowedRoles={['sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'principal_cashier', 'consultant', 'medical_director']}><AIInsights /></ProtectedRoute>} />
            
            <Route path="/cancellations" element={<ProtectedRoute allowedRoles={['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant']}><CancellationList /></ProtectedRoute>} />
            
            <Route path="/refunds" element={<ProtectedRoute allowedRoles={['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant']}><RefundList /></ProtectedRoute>} />
            
            <Route path="/incidents" element={<ProtectedRoute allowedRoles={['nurse', 'admin', 'doctor', 'consultant', 'hsfp', 'operations_staff', 'customer_care', 'it_officer', 'chef-nurse', 'pa', 'stock-manager', 'coo', 'deputy_coo', 'medical_director', 'procurement-manager']}><IncidentList /></ProtectedRoute>} />

            
            <Route path="/results-transfer" element={<ProtectedRoute allowedRoles={['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'lab_team_lead', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant']}><ResultTransferList /></ProtectedRoute>} />
            <Route path="/performance" element={<ProtectedRoute allowedRoles={['sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'cashier', 'principal_cashier', 'customer_care', 'operations_staff']}><PerformanceDashboard /></ProtectedRoute>} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/clinical-observation" element={<ProtectedRoute allowedRoles={['nurse', 'admin', 'chef-nurse']}><NursingHub /></ProtectedRoute>} />
            <Route path="/nursing-hub" element={<ProtectedRoute allowedRoles={['nurse', 'admin', 'chef-nurse']}><NursingHub /></ProtectedRoute>} />
            <Route path="/doctor-hub" element={<ProtectedRoute allowedRoles={['doctor', 'consultant', 'admin', 'medical_director']}><DoctorHub /></ProtectedRoute>} />
            <Route path="/e-prescriptions" element={<ProtectedRoute allowedRoles={['doctor', 'consultant', 'medical_director']}><EPrescriptions /></ProtectedRoute>} />
            <Route path="/nursing-hub/inventory" element={<ProtectedRoute allowedRoles={['nurse', 'chef-nurse', 'admin']}><DailyInventoryCheckup /></ProtectedRoute>} />
            <Route path="/nursing-hub/daily-report" element={<ProtectedRoute allowedRoles={['nurse', 'chef-nurse']}><DailyOperationalReport /></ProtectedRoute>} />
            <Route path="/daily-reports-board" element={<ProtectedRoute allowedRoles={['sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'principal_cashier', 'consultant', 'chef-nurse', 'pa', 'medical_director']}><DailyOperationalReportBoard /></ProtectedRoute>} />
            <Route path="/feedbacks" element={<ProtectedRoute allowedRoles={['coo', 'deputy_coo', 'chef-nurse', 'medical_director']}><FeedbackList /></ProtectedRoute>} />
            <Route path="/central-store" element={<ProtectedRoute allowedRoles={['admin', 'deputy_coo', 'chef-nurse', 'nurse', 'stock-manager']}><CentralStoreHub /></ProtectedRoute>} />
            <Route path="/master" element={<ProtectedRoute allowedRoles={['admin', 'stock-manager']}><MasterModule /></ProtectedRoute>} />
            <Route path="/procurement" element={<ProtectedRoute allowedRoles={['admin', 'deputy_coo', 'procurement-manager']}><ProcurementHub /></ProtectedRoute>} />
            <Route path="/supplier-portal-manager" element={<ProtectedRoute allowedRoles={['admin', 'deputy_coo', 'procurement-manager']}><SupplierPortalManager /></ProtectedRoute>} />

            <Route path="/consumables-log" element={<ProtectedRoute allowedRoles={['admin', 'deputy_coo', 'stock-manager', 'chef-nurse', 'nurse']}><ConsumablesLog /></ProtectedRoute>} />

            <Route path="/imaging" element={<ProtectedRoute allowedRoles={['radiographer', 'sonographer', 'radiologist', 'imaging_receptionist', 'imaging_manager', 'admin', 'coo', 'deputy_coo', 'medical_director']}><ImagingHub /></ProtectedRoute>} />

            <Route path="/patients/:patientId/clinical-sheet" element={<ProtectedRoute allowedRoles={['nurse', 'admin', 'doctor', 'consultant', 'chef-nurse', 'medical_director']}><ClinicalSheet /></ProtectedRoute>} />
            <Route path="/clinical-sheet/:patientId" element={<ProtectedRoute allowedRoles={['nurse', 'admin', 'doctor', 'consultant', 'chef-nurse', 'medical_director']}><ClinicalSheet /></ProtectedRoute>} />
            <Route path="/clinical-sheets" element={<ProtectedRoute allowedRoles={['nurse', 'admin', 'doctor', 'consultant', 'chef-nurse', 'medical_director']}><ClinicalSheetsList /></ProtectedRoute>} />
            <Route path="/patients/:patientId/records" element={<ProtectedRoute allowedRoles={['nurse', 'admin', 'doctor', 'consultant', 'chef-nurse', 'medical_director']}><PatientRecords /></ProtectedRoute>} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* ── Shift Module ── */}
            <Route path="/shifts/open" element={
              <ProtectedRoute allowedRoles={['cashier','customer_care','lab_team_lead','admin','deputy_coo','staff', 'nurse', 'chef-nurse']}>
                <OpenShift />
              </ProtectedRoute>
            } />
            <Route path="/shifts/close/:id" element={
              <ProtectedRoute allowedRoles={['cashier','customer_care','lab_team_lead','admin','deputy_coo','staff', 'nurse', 'chef-nurse']}>
                <CloseShift />
              </ProtectedRoute>
            } />
            <Route path="/shifts/:id" element={<ShiftDetail />} />
            <Route path="/shifts" element={
              <ProtectedRoute allowedRoles={['principal_cashier','sales_manager','deputy_coo','coo','admin', 'operations_staff', 'nurse', 'cashier', 'customer_care', 'chef-nurse', 'pa']}>
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
