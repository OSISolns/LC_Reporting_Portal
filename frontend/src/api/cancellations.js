import api from './axios';

export const getCancellations = (params = {}) => api.get('/cancellations', { params });
export const getCancellationById = (id) => api.get(`/cancellations/${id}`);


/**
 * Secure Backend Operations (Axios)
 * Financial sign-offs and PDF export stay on the backend.
 */
export const createCancellation = (data) => api.post('/cancellations', data);
export const verifyCancellation = (id) => api.patch(`/cancellations/${id}/verify`);
export const approveCancellation = (id) => api.patch(`/cancellations/${id}/approve`);
export const rejectCancellation = (id, comment) => api.patch(`/cancellations/${id}/reject`, { comment });
export const deleteCancellation = (id) => api.delete(`/cancellations/${id}`);
export const getCancellationPDF = (id) => api.get(`/cancellations/${id}/pdf`, { responseType: 'blob' });
