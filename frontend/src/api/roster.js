import api from './axios';

/**
 * Uploads a DOCX roster file to backend for extraction & cleansing.
 * @param {File} file - DOCX file selected or dropped by user
 */
export const parseRosterFile = (file, overwrite = false) => {
  const formData = new FormData();
  formData.append('file', file);
  if (overwrite) formData.append('overwrite', 'true');
  return api.post('/roster/parse', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * Fetches list of past generated doctor schedules.
 */
export const fetchRosterHistory = () => {
  return api.get('/roster/history');
};

/**
 * Downloads stored DOCX file for a past schedule.
 */
export const downloadRosterDocx = async (id, fileName) => {
  const response = await api.get(`/roster/download/${id}`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName || `Roster_${id}.docx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Analyzes roster changes and coverage with Lumina AI.
 */
export const analyzeRosterAI = (scheduleId1, scheduleId2) => {
  return api.post('/roster/analyze-ai', { scheduleId1, scheduleId2 });
};

/**
 * Deletes a single archived doctor schedule by ID.
 */
export const deleteRosterHistory = (id) => {
  return api.delete(`/roster/history/${id}`);
};

/**
 * Deletes multiple archived doctor schedules in bulk.
 */
export const bulkDeleteRosterHistory = (ids) => {
  return api.post('/roster/history/bulk-delete', { ids });
};

