import api from './axios';

// ─── Prosthetics Cases (Dental Lab) ──────────────────────────────────────────
export const listDentalCases          = (params) => api.get('/dental/cases', { params });
export const getDentalStats           = (period) => api.get('/dental/cases/stats', { params: { period } });
export const getDentalCase            = (id)     => api.get(`/dental/cases/${id}`);
export const createDentalCase         = (data)   => api.post('/dental/cases', data);
export const updateDentalCase         = (id, data) => api.put(`/dental/cases/${id}`, data);
export const deleteDentalCase         = (id)     => api.delete(`/dental/cases/${id}`);

// ─── Patient Worklist (Dental Clinic) ────────────────────────────────────────
export const listWorklist             = (params) => api.get('/dental/worklist', { params });
export const getWorklistStats         = (params) => api.get('/dental/worklist/stats', { params });
export const addWorklist              = (data)   => api.post('/dental/worklist', data);
export const updateWorklist           = (id, data) => api.put(`/dental/worklist/${id}`, data);
export const updateWorklistStatus     = (id, status) => api.patch(`/dental/worklist/${id}/status`, { status });
export const deleteWorklist           = (id)     => api.delete(`/dental/worklist/${id}`);

// ─── Dental Charting / Odontogram ────────────────────────────────────────────
export const listCharts               = (patient_id) => api.get('/dental/charts', { params: { patient_id } });
export const getChart                 = (id)         => api.get(`/dental/charts/${id}`);
export const saveChart                = (data)       => api.post('/dental/charts', data);
export const deleteChart              = (id)         => api.delete(`/dental/charts/${id}`);
export const generateDentalAiNote     = (data)       => api.post('/ai/clinical/dental-note', data);

// ─── Appointments (forward-looking scheduling) ───────────────────────────────
export const listAppointments         = (params) => api.get('/dental/appointments', { params });
export const getAppointmentStats      = (params) => api.get('/dental/appointments/stats', { params });
export const addAppointment           = (data)   => api.post('/dental/appointments', data);
export const updateAppointment        = (id, data) => api.put(`/dental/appointments/${id}`, data);
export const updateAppointmentStatus  = (id, status) => api.patch(`/dental/appointments/${id}/status`, { status });
export const checkInAppointment       = (id)     => api.post(`/dental/appointments/${id}/check-in`);
export const deleteAppointment        = (id)     => api.delete(`/dental/appointments/${id}`);
