import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const config = {
    pending: { label: 'Pending', color: '#FFC107', bg: 'rgba(255, 193, 7, 0.1)', icon: <Clock size={14} /> },
    verified: { label: 'Verified', color: '#17A2B8', bg: 'rgba(23, 162, 184, 0.1)', icon: <CheckCircle size={14} /> },
    approved: { label: 'Approved', color: '#28A745', bg: 'rgba(40, 167, 69, 0.1)', icon: <CheckCircle size={14} /> },
    rejected: { label: 'Rejected', color: '#DC3545', bg: 'rgba(220, 53, 69, 0.1)', icon: <XCircle size={14} /> },
  };

  const item = config[status] || { label: status, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', icon: <AlertCircle size={14} /> };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: 600,
      color: item.color,
      backgroundColor: item.bg,
      border: `1px solid ${item.color}33`,
      textTransform: 'capitalize'
    }}>
      {item.icon}
      {item.label}
    </span>
  );
};

export default StatusBadge;
