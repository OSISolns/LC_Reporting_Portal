const StatCard = ({ title, value, icon, trend, color = 'primary' }) => {
  const colorMap = {
    primary: 'var(--primary)',
    secondary: 'var(--secondary)',
    danger: 'var(--danger)',
    warning: 'var(--warning)',
    success: 'var(--success)',
  };

  return (
    <div className="glass card-shadow" style={{ padding: '1.5rem', flex: 1, backgroundColor: '#ffffff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem' }}>{title}</p>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>{value}</h3>
        </div>
        <div style={{
          padding: '12px',
          borderRadius: '12px',
          backgroundColor: `${colorMap[color]}15`,
          color: colorMap[color],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </div>
      </div>
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
          <span style={{ 
            color: trend.startsWith('+') ? 'var(--success)' : 'var(--danger)', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center'
          }}>
            {trend}
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>vs last month</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
