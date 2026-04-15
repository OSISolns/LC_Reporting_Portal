import api from './axios';

export const getRefunds       = (params = {}) => api.get('/refunds', { params });
export const getRefundById    = (id)           => api.get(`/refunds/${id}`);
export const createRefund     = (data)         => api.post('/refunds', data);
export const verifyRefund     = (id)           => api.patch(`/refunds/${id}/verify`);
export const approveRefund    = (id)           => api.patch(`/refunds/${id}/approve`);
export const rejectRefund     = (id, comment)  => api.patch(`/refunds/${id}/reject`, { comment });
export const deleteRefund     = (id)           => api.delete(`/refunds/${id}`);
export const getRefundPDF     = (id)           => api.get(`/refunds/${id}/pdf`, { responseType: 'blob' });
