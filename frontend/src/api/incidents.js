import api from './axios';

export const getIncidents = (params = {}) => api.get('/incidents', { params });
export const getIncidentById = (id) => api.get(`/incidents/${id}`);


/**
 * Secure Backend Operations (Axios)
 * Post operations and PDF generation stay on the backend for audit-logging and security.
 */
export const createIncident = (data) => api.post('/incidents', data);
export const approveIncident = (id, data) => api.patch(`/incidents/${id}/approve`, data);
export const deleteIncident = (id) => api.delete(`/incidents/${id}`);
export const getIncidentPDF = (id) => api.get(`/incidents/${id}/pdf`, { responseType: 'blob' });
