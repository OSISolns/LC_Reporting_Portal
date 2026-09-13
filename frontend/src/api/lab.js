import api from './axios';

export const getAnalyzers = () => api.get('/lab/analyzers');
export const createAnalyzer = (data) => api.post('/lab/analyzers', data);
export const updateAnalyzer = (id, data) => api.put(`/lab/analyzers/${id}`, data);
export const deleteAnalyzer = (id) => api.delete(`/lab/analyzers/${id}`);

export const getEquipment = () => api.get('/lab/equipment');
export const createEquipment = (data) => api.post('/lab/equipment', data);
export const updateEquipment = (id, data) => api.put(`/lab/equipment/${id}`, data);
export const deleteEquipment = (id) => api.delete(`/lab/equipment/${id}`);
