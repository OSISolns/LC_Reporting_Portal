import api from './axios';

export const getProformas = (params = {}) => api.get('/sales/proformas', { params });
export const getSalesStats = () => api.get('/sales/proformas/stats');
export const getProformaById = (id) => api.get(`/sales/proformas/${id}`);
export const createProforma = (data) => api.post('/sales/proformas', data);
export const updateProforma = (id, data) => api.put(`/sales/proformas/${id}`, data);
export const deleteProforma = (id) => api.delete(`/sales/proformas/${id}`);
export const sendProformaEmail = (id, data) => api.post(`/sales/proformas/${id}/email`, data);

export const getSalesCatalog = () => api.get('/sales/catalog');
export const addCatalogItem = (data) => api.post('/sales/catalog', data);
export const deleteCatalogItem = (id) => api.delete(`/sales/catalog/${id}`);
