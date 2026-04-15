import React from 'react';

export const PrintHeader = ({ title, docType, docId }) => {
  const year = new Date().getFullYear();
  const formattedId = `LC-${docType || 'RQ'}-${year}-${String(docId || '0').padStart(5, '0')}`;
  
  return (
    <div className="no-screen">
      <img src="/legacy_header.svg" style={{ width: "100%", marginBottom: "10px", display: "block" }} alt="Document Header" />
      <div className="medical-form-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2pt' }}>
          <span style={{ fontSize: '10pt', opacity: 0.9 }}>LEGACY CLINICS / REPORTING PORTAL</span>
        <span style={{ fontSize: '13pt', fontWeight: 800 }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2pt' }}>
        <span style={{ fontSize: '8pt', opacity: 0.8 }}>OFFICIAL DOCUMENT ID</span>
        <span style={{ fontSize: '11pt', fontWeight: 800, fontFamily: 'monospace' }}>{formattedId}</span>
      </div>
      </div>
    </div>
  );
};


export const PrintWatermark = () => (
  <div className="no-screen" style={{
    position: 'absolute',
    top: '45%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-30deg)',
    opacity: 0.03,
    zIndex: -1,
    pointerEvents: 'none',
    width: '600px',
    textAlign: 'center'
  }}>
    <img src="/logo.png" alt="" style={{ width: '100%', filter: 'grayscale(100%)' }} />
    <div style={{ fontSize: '4rem', fontWeight: 900, color: '#000', marginTop: '20px' }}>OFFICIAL RECORD</div>
  </div>
);

export const PrintFooter = () => null;

