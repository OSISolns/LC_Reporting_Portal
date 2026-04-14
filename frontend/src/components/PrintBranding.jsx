import React from 'react';

export const PrintHeader = ({ title, docType, docId }) => {
  const year = new Date().getFullYear();
  const formattedId = `LC-${docType || 'RQ'}-${year}-${String(docId || '0').padStart(5, '0')}`;
  
  return (
    <div className="print-only-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1.5rem' }}>
      <div style={{ alignSelf: 'flex-end', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
        <img src="/logo.png" alt="Legacy Clinics" style={{ height: '70px', objectFit: 'contain' }} />
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', fontFamily: 'monospace' }}>
          DOCUMENT ID: {formattedId}
        </div>
      </div>
      <div style={{ textAlign: 'center', width: '100%' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, textDecoration: 'none', color: '#1a365d' }}>
          {title}
        </h2>
      </div>
    </div>
  );
};


export const PrintWatermark = () => (
  <div className="no-screen" style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    opacity: 0.05,
    zIndex: -1,
    pointerEvents: 'none',
    width: '500px'
  }}>
    <img src="/logo.png" alt="" style={{ width: '100%', filter: 'grayscale(100%)' }} />
  </div>
);

export const PrintFooter = () => (
  <div className="print-only-footer" style={{ marginTop: '3rem', width: '100%', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem', padding: '0 1rem', fontSize: '10pt', fontWeight: 700, color: '#1e3a8a' }}>
      <span style={{ fontSize: '11pt' }}>SPECIALITY CLINIC I DIAGNOSTICS I DENTAL</span>
      <span style={{ fontSize: '10pt', fontWeight: 500, color: '#4b5563' }}>Code: 103672011</span>
    </div>
    
    <div style={{ display: 'flex', width: '100%', height: '55px', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      {/* Left green bar */}
      <div style={{ flex: 1.2, backgroundColor: '#1b4332', display: 'flex', alignItems: 'center', paddingLeft: '25px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '0.02em' }}>HEALTH FOR LIFE</h2>
      </div>
      
      {/* Right blue/darker bar with contact info */}
      <div style={{ flex: 2, backgroundColor: '#002651', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '25px', textAlign: 'right', fontSize: '8.5pt', lineHeight: 1.3, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <div style={{ fontWeight: 700 }}>KK3 RD 134 KICUKIRO District NYARUGUNGA Sector RWANDA</div>
        <div>Tel: 0788122100 | 0788382000 | 800</div>
        <div style={{ fontWeight: 600 }}>info@legacyclinics.rw www.legacyclinics.rw</div>
      </div>
    </div>
  </div>
);

