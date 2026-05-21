import api from './axios';

export const searchPatients = (q) => api.get(`/patients/search?q=${encodeURIComponent(q)}`);
export const getPatientByPid = (pid) => api.get(`/patients/${pid}`);
