import api from './axios';

export const searchPatients = (q, config) => api.get(`/patients/search?q=${encodeURIComponent(q)}`, config);
export const getPatientByPid = (pid) => api.get(`/patients/${pid}`);
