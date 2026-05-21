import api from './axios';

export const submitFeedback = (data) => api.post('/feedbacks', data);
export const getFeedbacks = (params = {}) => api.get('/feedbacks', { params });
export const deleteFeedback = (id) => api.delete(`/feedbacks/${id}`);
