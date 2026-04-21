'use strict';
import api from './axios';

/**
 * Get all available modules and their supported actions.
 */
export const getModules = async () => {
  const response = await api.get('/permissions/modules');
  return response.data;
};

/**
 * Get the full role-based permissions matrix.
 */
export const getRoleMatrix = async () => {
  const response = await api.get('/permissions/matrix');
  return response.data;
};

/**
 * Update permissions for a specific role.
 */
export const updateRolePermissions = async (roleName, permissions) => {
  const response = await api.put(`/permissions/role/${roleName}`, { permissions });
  return response.data;
};

/**
 * Get effective permissions for a specific user (including overrides).
 */
export const getUserEffectivePermissions = async (userId) => {
  const response = await api.get(`/permissions/user/${userId}`);
  return response.data;
};

/**
 * Set or remove a permission override for a specific user.
 */
export const setUserOverride = async (userId, module, action, granted, reason) => {
  const response = await api.post(`/permissions/user/${userId}/override`, { module, action, granted, reason });
  return response.data;
};
/**
 * Reset a role's permissions to system defaults.
 */
export const resetRolePermissions = async (roleName, adminPassword) => {
  const response = await api.post(`/permissions/role/${roleName}/reset`, { adminPassword });
  return response.data;
};
