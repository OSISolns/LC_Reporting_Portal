import api from './axios';

export const getResultTransfers    = (params = {}) => api.get('/results-transfer', { params });
export const getResultTransferById = (id)           => api.get(`/results-transfer/${id}`);
export const createResultTransfer  = (data)         => api.post('/results-transfer', data);
export const reviewResultTransfer  = (id)           => api.put(`/results-transfer/${id}/review`);
export const approveResultTransfer = (id, editedByName) => api.put(`/results-transfer/${id}/approve`, { editedByName });
export const rejectResultTransfer  = (id, comment)  => api.put(`/results-transfer/${id}/reject`, { comment });
export const deleteResultTransfer  = (id)           => api.delete(`/results-transfer/${id}`);
export const getResultTransferPDF  = (id)           => api.get(`/results-transfer/${id}/pdf`, { responseType: 'blob' });
