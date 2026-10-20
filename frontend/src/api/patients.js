import api from './axios';

export const searchPatients = (q, config) => api.get(`/patients/search?q=${encodeURIComponent(q)}`, config);
export const getPatientByPid = (pid) => api.get(`/patients/${pid}`);
export const bulkLookupPatients = (data) => api.post('/patients/bulk-lookup', data);
export const getSukraaSyncStatus = () => api.get('/patients/sync/status');
