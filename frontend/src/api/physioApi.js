import api from './axios';

export const getPhysioSessions = async (params = {}) => {
  const response = await api.get('/clinical/physio/sessions', { params });
  return response.data;
};

export const createPhysioSession = async (data) => {
  const response = await api.post('/clinical/physio/sessions', data);
  return response.data;
};

export const updatePhysioSessionStatus = async (id, statusData) => {
  const response = await api.put(`/clinical/physio/sessions/${id}/status`, statusData);
  return response.data;
};

export const getPhysioAssessments = async (params = {}) => {
  const response = await api.get('/clinical/physio/assessments', { params });
  return response.data;
};

export const createPhysioAssessment = async (data) => {
  const response = await api.post('/clinical/physio/assessments', data);
  return response.data;
};
