import api from './axios';

export const getAnalyzers = () => api.get('/lab/analyzers');
export const createAnalyzer = (data) => api.post('/lab/analyzers', data);
export const updateAnalyzer = (id, data) => api.put(`/lab/analyzers/${id}`, data);
export const deleteAnalyzer = (id) => api.delete(`/lab/analyzers/${id}`);

export const getEquipment = () => api.get('/lab/equipment');
export const createEquipment = (data) => api.post('/lab/equipment', data);
export const updateEquipment = (id, data) => api.put(`/lab/equipment/${id}`, data);
export const deleteEquipment = (id) => api.delete(`/lab/equipment/${id}`);

export const getTeamLeadSummary = () => api.get('/lab/team-lead-summary');
export const batchVerifyOrders = (data) => api.post('/lab/batch-verify', data);
export const verifyOrder = (id, data) => api.post(`/lab/orders/${id}/verify`, data);
export const recordQCRun = (data) => api.post('/lab/qc-run', data);
export const getInhandInventory = (params) => api.get('/lab/inhand-inventory', { params });
export const createInhandInventory = (data) => api.post('/lab/inhand-inventory', data);
export const updateInhandInventory = (id, data) => api.put(`/lab/inhand-inventory/${id}`, data);
export const deleteInhandInventory = (id) => api.delete(`/lab/inhand-inventory/${id}`);

export const getStorageUnits = () => api.get('/lab/storage-units');
export const saveStorageUnit = (data) => api.post('/lab/storage-units', data);

export const getLabRequisitions = (params) => api.get('/clinical/inventory/requisitions', { params });
export const createLabRequisition = (data) => api.post('/clinical/inventory/requisitions', data);
