import api from './axiosConfig';

export const getExecutiveDirectives = async (params = {}) => {
  const response = await api.get('/executive-directives', { params });
  return response.data;
};

export const postExecutiveDirective = async (data) => {
  const response = await api.post('/executive-directives', data);
  return response.data;
};

export const respondToExecutiveDirective = async (id, explanation_response) => {
  const response = await api.post(`/executive-directives/${id}/respond`, { explanation_response });
  return response.data;
};

export const resolveExecutiveDirective = async (id, status = 'resolved') => {
  const response = await api.post(`/executive-directives/${id}/resolve`, { status });
  return response.data;
};
