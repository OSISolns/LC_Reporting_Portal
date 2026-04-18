'use strict';
const Notification = require('../models/notification');

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.getByUserId(userId);
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Notification.getUnreadCount(userId);
    res.json({ count });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await Notification.markAsRead(id, userId);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await Notification.markAllAsRead(userId);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await Notification.delete(id, userId);
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
