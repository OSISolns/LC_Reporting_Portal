
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as notificationApi from '../api/notifications';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await notificationApi.getNotifications();
      setNotifications(data);
      
      const countData = await notificationApi.getUnreadCount();
      setUnreadCount(countData.count);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationApi.deleteNotification(id);
      const wasUnread = notifications.find(n => n.id === id)?.is_read === 0;
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll every 1 minute for "live" updates
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications]);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      loading, 
      fetchNotifications, 
      markAsRead, 
      markAllAsRead,
      deleteNotification 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
