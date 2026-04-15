import api from './axios';

export const getAIStats          = ()       => api.get('/ai/stats');
export const classifyModule      = (module) => api.get(`/ai/classify/${module}`);
export const getExecutiveReport  = ()       => api.get('/ai/executive');
