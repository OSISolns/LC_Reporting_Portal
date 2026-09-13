import api from './axios';

export const getProviders = (params = {}) => api.get('/providers', { params });
export const getSpecializations = () => api.get('/providers/specializations');
export const createProvider = (data) => api.post('/providers', data);
export const updateProvider = (id, data) => api.patch(`/providers/${id}`, data);
export const deleteProvider = (id, adminPassword) => api.delete(`/providers/${id}`, { data: { adminPassword } });
