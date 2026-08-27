import api from './axios';

export const getAnalyzers = () => api.get('/lab/analyzers');
export const createAnalyzer = (data) => api.post('/lab/analyzers', data);
export const updateAnalyzer = (id, data) => api.put(`/lab/analyzers/${id}`, data);
export const deleteAnalyzer = (id) => api.delete(`/lab/analyzers/${id}`);
