import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

export const getNotifications = async () => {
  const response = await axios.get(`${API_URL}/notifications`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const getUnreadCount = async () => {
  const response = await axios.get(`${API_URL}/notifications/unread-count`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const markAsRead = async (id) => {
  const response = await axios.put(`${API_URL}/notifications/${id}/read`, {}, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const markAllAsRead = async () => {
  const response = await axios.put(`${API_URL}/notifications/mark-all-read`, {}, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await axios.delete(`${API_URL}/notifications/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};
