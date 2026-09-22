import api from './axios';

export const getAIStats          = ()       => api.get('/ai/stats');
export const classifyModule      = (module) => api.get(`/ai/classify/${module}`);
export const getExecutiveReport  = ()       => api.get('/ai/executive');

// Lumina AI Insight — per-department intelligence
export const getDeptStats        = (dept)   => api.get(`/ai/dept-stats/${dept}`);
export const compileLuminaReport = (dept)   => api.post('/ai/lumina-report', { dept });
