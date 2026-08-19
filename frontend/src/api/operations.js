import api from './axios';

// ── Summary ───────────────────────────────────────────────────────────────────
export const getOperationsSummary = () => api.get('/operations/summary');

// ── Task Logs ─────────────────────────────────────────────────────────────────
export const getTodayTaskLog = () => api.get('/operations/tasks/today');

export const getAllTaskLogs = (params = {}) =>
  api.get('/operations/tasks', { params });

export const getTaskLogById = (id) => api.get(`/operations/tasks/${id}`);

export const saveTaskLog = (payload) => api.post('/operations/tasks', payload);

export const updateTaskLog = (id, payload) =>
  api.patch(`/operations/tasks/${id}`, payload);

export const deleteTaskLog = (id) => api.delete(`/operations/tasks/${id}`);
