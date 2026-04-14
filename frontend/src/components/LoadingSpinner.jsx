const LoadingSpinner = ({ size = '40px', color = 'var(--primary)' }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ 
        width: size, 
        height: size, 
        border: '3px solid var(--border-color)', 
        borderTopColor: color, 
        borderRadius: '50%', 
        animation: 'spin 1s linear infinite' 
      }}></div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default LoadingSpinner;
