import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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
import CancellationForm from './pages/cancellations/CancellationForm';
import CancellationDetail from './pages/cancellations/CancellationDetail';

import RefundList from './pages/refunds/RefundList';
import RefundForm from './pages/refunds/RefundForm';
import RefundDetail from './pages/refunds/RefundDetail';

import IncidentList from './pages/incidents/IncidentList';
import IncidentForm from './pages/incidents/IncidentForm';
import IncidentDetail from './pages/incidents/IncidentDetail';
import ResultTransferList from './pages/results-transfer/ResultTransferList';
import PerformanceDashboard from './pages/performance/PerformanceDashboard';
import Permissions from './pages/Permissions';
import Unauthorized from './pages/Unauthorized';

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
            <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={['admin', 'it_officer']}><AuditLogs /></ProtectedRoute>} />
            <Route path="/ai-insights" element={<ProtectedRoute allowedRoles={['sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'quality_assurance', 'principal_cashier', 'consultant']}><AIInsights /></ProtectedRoute>} />
            
            <Route path="/cancellations" element={<ProtectedRoute allowedRoles={['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant']}><CancellationList /></ProtectedRoute>} />
            <Route path="/cancellations/new" element={<ProtectedRoute allowedRoles={['cashier', 'customer_care', 'admin']}><CancellationForm /></ProtectedRoute>} />
            <Route path="/cancellations/:id" element={<ProtectedRoute allowedRoles={['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant']}><CancellationDetail /></ProtectedRoute>} />

            <Route path="/refunds" element={<ProtectedRoute allowedRoles={['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant']}><RefundList /></ProtectedRoute>} />
            <Route path="/refunds/new" element={<ProtectedRoute allowedRoles={['cashier', 'customer_care', 'admin']}><RefundForm /></ProtectedRoute>} />
            <Route path="/refunds/:id" element={<ProtectedRoute allowedRoles={['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant']}><RefundDetail /></ProtectedRoute>} />
            
            <Route path="/incidents" element={<IncidentList />} />
            <Route path="/incidents/new" element={<IncidentForm />} />
            <Route path="/incidents/:id" element={<IncidentDetail />} />
            <Route path="/results-transfer" element={<ProtectedRoute allowedRoles={['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'lab_team_lead', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant']}><ResultTransferList /></ProtectedRoute>} />
            <Route path="/performance" element={<ProtectedRoute allowedRoles={['sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'cashier', 'principal_cashier', 'customer_care']}><PerformanceDashboard /></ProtectedRoute>} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
          </Route>


          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
