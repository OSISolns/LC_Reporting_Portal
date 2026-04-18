
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../context/NotificationContext';
import { Bell, CheckCircle, Info, AlertCircle, X, ExternalLink, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const NotificationDropdown = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, markAsRead, deleteNotification, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = async (notif) => {
    if (notif.is_read === 0) {
      await markAsRead(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
    onClose();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} style={{ color: '#059669' }} />;
      case 'error': return <AlertCircle size={16} style={{ color: '#dc2626' }} />;
      case 'warning': return <AlertCircle size={16} style={{ color: '#d97706' }} />;
      default: return <Info size={16} style={{ color: '#2563eb' }} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile or to close when clicking outside */}
          <div 
            onClick={onClose} 
            style={{ 
              position: 'fixed', 
              inset: 0, 
              zIndex: 40 
            }} 
          />
          
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: '50px',
              right: '0',
              width: '360px',
              maxHeight: '480px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 50,
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{ 
              padding: '12px 16px', 
              borderBottom: '1px solid #f1f5f9', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>Notifications</h3>
                {unreadCount > 0 && (
                  <span style={{ 
                    backgroundColor: 'var(--primary)', 
                    color: '#fff', 
                    fontSize: '0.7rem', 
                    fontWeight: 700, 
                    padding: '2px 8px', 
                    borderRadius: '99px' 
                  }}>
                    {unreadCount} New
                  </span>
                )}
              </div>
              <button 
                onClick={markAllAsRead}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '0.75rem', 
                  color: 'var(--primary)', 
                  fontWeight: 600, 
                  cursor: 'pointer' 
                }}
              >
                Mark all as read
              </button>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                  <Bell size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      gap: '12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f8fafc',
                      backgroundColor: notif.is_read === 0 ? '#eff6ff' : 'transparent',
                      transition: 'background 0.2s',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = notif.is_read === 0 ? '#dbeafe' : '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = notif.is_read === 0 ? '#eff6ff' : 'transparent'}
                  >
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '8px', 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {getIcon(notif.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.4 }}>{notif.title}</h4>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p style={{ 
                        margin: '2px 0 0', 
                        fontSize: '0.8rem', 
                        color: '#475569', 
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <Link 
              to="/notifications" 
              onClick={onClose}
              style={{ 
                padding: '12px', 
                textAlign: 'center', 
                fontSize: '0.85rem', 
                fontWeight: 700, 
                color: 'var(--primary)', 
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #f1f5f9',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              View all notifications <ExternalLink size={14} />
            </Link>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationDropdown;
