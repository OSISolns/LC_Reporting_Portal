import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';

import CancellationList from './pages/cancellations/CancellationList';
import CancellationForm from './pages/cancellations/CancellationForm';
import CancellationDetail from './pages/cancellations/CancellationDetail';

import IncidentList from './pages/incidents/IncidentList';
import IncidentForm from './pages/incidents/IncidentForm';
import IncidentDetail from './pages/incidents/IncidentDetail';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            
            <Route path="/cancellations" element={<CancellationList />} />
            <Route path="/cancellations/new" element={<CancellationForm />} />
            <Route path="/cancellations/:id" element={<CancellationDetail />} />
            
            <Route path="/incidents" element={<IncidentList />} />
            <Route path="/incidents/new" element={<IncidentForm />} />
            <Route path="/incidents/:id" element={<IncidentDetail />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
