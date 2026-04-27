import api from './axios';

/** Get all staff scores (sales_manager view) */
export const getAllScores = () => api.get('/performance/scores');

/** Get score for the logged-in staff member */
export const getMyScore = () => api.get('/performance/my-score');

/** Get all ratings (sales_manager view) */
export const getAllRatings = () => api.get('/performance/ratings');

/** Get ratings for a specific staff member */
export const getRatingsForStaff = (userId) =>
  api.get(`/performance/ratings/${userId}`);

/** Get severity distribution stats for charts */
export const getSeverityStats = () => api.get('/performance/stats');

/** Submit a new rating (sales_manager only) */
export const submitRating = (data) => api.post('/performance/rate', data);

/** Get unrated requests for a staff member and context */
export const getUnratedRequests = (staffId, type) => api.get(`/performance/unrated-requests?staffId=${staffId}&type=${type}`);
