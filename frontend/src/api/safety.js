import api from './axios';

// Safety Reports
export const createSafetyReport = (data) => api.post('/safety', data);
export const getSafetyReports = () => api.get('/safety');
export const getSafetyReport = (id) => api.get(`/safety/${id}`);
export const deleteSafetyReport = (id) => api.delete(`/safety/${id}`);
export const getSafetyPDF = (id) => api.get(`/safety/${id}/pdf`, { responseType: 'blob' });

// Risk Register
export const getRisks = (params) => api.get('/safety/risks', { params });
export const createRisk = (data) => api.post('/safety/risks', data);
export const updateRiskStatus = (id, data) => api.patch(`/safety/risks/${id}/status`, data);
export const deleteRisk = (id) => api.delete(`/safety/risks/${id}`);

// Infection Control & Hygiene Audits
export const getInfectionStats = () => api.get('/safety/infection-control/stats');
export const getInfectionCases = (params) => api.get('/safety/infection-control/cases', { params });
export const createInfectionCase = (data) => api.post('/safety/infection-control/cases', data);
export const updateInfectionCaseStatus = (id, data) => api.patch(`/safety/infection-control/cases/${id}/status`, data);
export const getHygieneAudits = () => api.get('/safety/infection-control/audits');
export const createHygieneAudit = (data) => api.post('/safety/infection-control/audits', data);


