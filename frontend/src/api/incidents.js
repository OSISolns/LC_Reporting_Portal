import api from './axios';

export const getIncidents = (params) => api.get('/incidents', { params });
export const getIncidentById = (id) => api.get(`/incidents/${id}`);
export const createIncident = (data) => api.post('/incidents', data);
export const getIncidentPDF = (id) => api.get(`/incidents/${id}/pdf`, { responseType: 'blob' });
