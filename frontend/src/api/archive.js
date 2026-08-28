import api from './axios';

export const listDocuments   = (params = {}) => api.get('/archive', { params });
export const uploadDocument  = (formData)    => api.post('/archive/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getDocumentMeta = (id)          => api.get(`/archive/${id}`);
export const downloadDocument= (id, params = {}) => api.get(`/archive/${id}/download`, { params });
export const updateDocumentMeta = (id, data) => api.patch(`/archive/${id}`, data);
export const deleteDocument  = (id)          => api.delete(`/archive/${id}`);
export const getAccessLog    = (id)          => api.get(`/archive/${id}/log`);
