import api from './axios';

export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.patch(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const resetPassword = (id, password) => api.post(`/users/${id}/reset-password`, { password });
export const getRoles = () => api.get('/users/roles');
export const getStaffList = () => api.get('/users/staff');
