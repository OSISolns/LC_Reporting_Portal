import api from './axios';

export const getProviders = (params = {}) => api.get('/providers', { params });
export const getPhysiotherapists = () => api.get('/providers/physiotherapists').then(r => r.data);
export const getSpecializations = () => api.get('/providers/specializations');
export const getLinkableUsers = () => api.get('/providers/linkable-users');
export const createProvider = (data) => api.post('/providers', data);
export const updateProvider = (id, data) => api.patch(`/providers/${id}`, data);
export const linkProviderUser = (id, userId) => api.post(`/providers/${id}/link-user`, { userId });
export const deleteProvider = (id, adminPassword) => api.delete(`/providers/${id}`, { data: { adminPassword } });

