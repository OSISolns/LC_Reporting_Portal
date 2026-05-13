import api from './axios';

export const createSafetyReport = (data) => api.post('/safety', data);
export const getSafetyReports = () => api.get('/safety');
export const getSafetyReport = (id) => api.get(`/safety/${id}`);
export const deleteSafetyReport = (id) => api.delete(`/safety/${id}`);
export const getSafetyPDF = (id) => api.get(`/safety/${id}/pdf`, { responseType: 'blob' });

