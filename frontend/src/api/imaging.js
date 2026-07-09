import api from './axios';

// Reference data
export const getModalities = () => api.get('/imaging/modalities');

// Manager analytics dashboard
export const getImagingDashboard = (months = 12) => api.get('/imaging/dashboard', { params: { months } });

// Daily exam board (the 4 units)
export const getDailyBoard = (date) => api.get('/imaging/daily-board', { params: { date } });
export const getDailyRegister = (date, modality) => api.get('/imaging/daily-register', { params: { date, modality } });

// Worklist / studies
export const getStudies = (params) => api.get('/imaging/studies', { params });
export const getStudy = (id) => api.get(`/imaging/studies/${id}`);
export const scheduleStudy = (data) => api.post('/imaging/studies', data);

// Radiographer workflow transitions
export const checkInStudy = (id) => api.patch(`/imaging/studies/${id}/check-in`);
export const startStudy = (id, data) => api.patch(`/imaging/studies/${id}/start`, data);
export const completeStudy = (id, data) => api.patch(`/imaging/studies/${id}/complete`, data);
export const cancelStudy = (id) => api.patch(`/imaging/studies/${id}/cancel`);

// Terminology lookups (system = 'loinc' | 'snomed' | 'icd11')
export const searchTerminology = (system, q) => api.get(`/imaging/terminology/${system}`, { params: { q } });

// Radiologist reporting
export const getReportingQueue = () => api.get('/imaging/reporting/queue');
export const getReport = (id) => api.get(`/imaging/studies/${id}/report`);
export const saveReport = (id, data) => api.put(`/imaging/studies/${id}/report`, data);
export const finalizeReport = (id) => api.post(`/imaging/studies/${id}/report/finalize`);
export const verifyReport = (id) => api.post(`/imaging/studies/${id}/report/verify`);
export const amendReport = (id, data) => api.post(`/imaging/studies/${id}/report/amend`, data);
export const reportPdfUrl = (id) => `/imaging/studies/${id}/report/pdf`;
export const downloadReportPdf = (id) => api.get(`/imaging/studies/${id}/report/pdf`, { responseType: 'blob' });

// DICOM
export const getDicomStatus = () => api.get('/imaging/dicom/status');
export const getDicomImages = (id) => api.get(`/imaging/studies/${id}/dicom`);
export const linkDicom = (id, study_instance_uid) => api.post(`/imaging/studies/${id}/dicom/link`, { study_instance_uid });
export const getRenderedFrame = (id, params) => api.get(`/imaging/studies/${id}/dicom/rendered`, { params, responseType: 'blob' });
export const stowUpload = (id, files, study_instance_uid) => api.post(`/imaging/studies/${id}/dicom/stow`, { files, study_instance_uid });
