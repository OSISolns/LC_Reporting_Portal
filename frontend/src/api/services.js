import api from './axios';

export const getServices = (params = {}) => api.get('/services', { params });
export const getServiceById = (id) => api.get(`/services/${id}`);
