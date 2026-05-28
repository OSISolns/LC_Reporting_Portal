import api from './axios';

export const getReportConfig = () => api.get('/reports/config');
export const getDailyReport = (date) => api.get(`/reports/daily?date=${date}`);
export const saveDailyReport = (data) => api.post('/reports/daily', data);
export const getMonthlyReport = (year, month) => api.get(`/reports/monthly?year=${year}&month=${month}`);
