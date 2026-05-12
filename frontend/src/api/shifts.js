import api from './axios';

/**
 * Open a new shift.
 * @param {{ shift_role: string, equipment: Array, opening_float?: number }} payload
 */
export const openShift = (payload) => api.post('/shifts/open', payload);

/**
 * Get the current user's active (open/draft) shift.
 */
export const getMyActiveShift = () => api.get('/shifts/my-active');

/**
 * Auto-save draft of closing data.
 * @param {number} shiftId
 * @param {object} payload
 */
export const saveDraft = (shiftId, payload) => api.patch(`/shifts/${shiftId}/draft`, payload);

/**
 * Finalise and close a shift.
 * @param {number} shiftId
 * @param {object} payload
 */
export const closeShift = (shiftId, payload) => api.patch(`/shifts/${shiftId}/close`, payload);

/**
 * Get all shifts (management/reviewer only).
 * @param {object} params - query filters
 */
export const getAllShifts = (params = {}) => api.get('/shifts', { params });

/**
 * Get a single shift by ID.
 * @param {number} id
 */
export const getShiftById = (id) => api.get(`/shifts/${id}`);

/**
 * Mark a shift as reviewed.
 * @param {number} id
 */
export const markShiftReviewed = (id) => api.patch(`/shifts/${id}/review`);

/**
 * Reactivate a closed shift (Supervisor only).
 * @param {number} id
 * @param {string} password
 */
export const reactivateShift = (id, password) => api.patch(`/shifts/${id}/reactivate`, { password });

/**
 * Bulk review multiple shifts (Management only).
 * @param {Array<number>} ids
 * @param {string} password
 */
export const bulkReviewShifts = (ids, password) => api.post('/shifts/bulk-review', { ids, password });

/**
 * Manually update shift details (Supervisor only).
 * @param {number} id
 * @param {object} payload
 */
export const updateShiftByAdmin = (id, payload) => api.patch(`/shifts/${id}/admin-update`, payload);

/**
 * Manually trigger auto-close (Admin only).
 */
export const triggerAutoClose = () => api.post('/shifts/admin/auto-close');

/**
 * Delete a shift record (Admin only).
 * @param {number} id
 */
export const deleteShift = (id) => api.delete(`/shifts/${id}`);
