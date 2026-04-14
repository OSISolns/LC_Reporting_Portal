import api from './axios';

export const getIncidents = (params = {}) => api.get('/incidents', { params });
export const getIncidentById = (id) => api.get(`/incidents/${id}`);


/**
 * Secure Backend Operations (Axios)
 * Post operations and PDF generation stay on the backend for audit-logging and security.
 */
export const createIncident = (data) => api.post('/incidents', data);
export const reviewIncident = (id, comments) => api.patch(`/incidents/${id}/review`, { comments });
export const getIncidentPDF = (id) => api.get(`/incidents/${id}/pdf`, { responseType: 'blob' });
