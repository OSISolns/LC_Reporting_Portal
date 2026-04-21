import React from 'react';

export const PrintHeader = ({ title, docType, docId }) => {
  const year = new Date().getFullYear();
  const formattedId = `LC-${docType || 'RQ'}-${year}-${String(docId || '0').padStart(5, '0')}`;
  
  return (
    <div className="no-screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <img src="/logo.png" style={{ height: "55px", width: "auto", display: "block" }} alt="Legacy Clinics Logo" />
          <div style={{ fontSize: '7.5pt', color: '#64748b', lineHeight: '1.4', fontWeight: 500 }}>
            Legacy Medical Center Rwanda<br/>
            KK3 RD 134, Kicukiro, Kigali<br/>
            Contact: +250 788 122 100/+250 788 382 000
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: '20pt', fontWeight: 800, color: '#003B44', textTransform: 'uppercase', margin: 0, letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          <div style={{ marginTop: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '6px', display: 'inline-block' }}>
            <span style={{ fontSize: '7pt', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
              Official Document ID
            </span>
            <span style={{ fontSize: '11pt', fontWeight: 800, color: '#007B8A', fontFamily: 'monospace' }}>
              {formattedId}
            </span>
          </div>
          <div style={{ fontSize: '6.5pt', color: '#94a3b8', marginTop: '4px', fontWeight: 600 }}>
            ISSUED: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
      
      <div style={{ 
        backgroundColor: '#003B44', 
        color: '#ffffff', 
        padding: '10px 20px', 
        fontSize: '10pt', 
        fontWeight: 700, 
        textTransform: 'uppercase', 
        letterSpacing: '0.05em',
        borderRadius: '8px 8px 0 0',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>Official Verification Audit</span>
        <span style={{ fontSize: '8pt', opacity: 0.8 }}>Legacy Medical Center</span>
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
    width: '140mm',
    textAlign: 'center'
  }}>
    <img src="/logo.png" alt="" style={{ width: '100%', filter: 'grayscale(100%)' }} />
    <div style={{ fontSize: '40pt', fontWeight: 900, color: '#000', marginTop: '20px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
      OFFICIAL RECORD
    </div>
  </div>
);

export const PrintFooter = () => (
  <div className="print-only-footer no-screen" style={{ marginTop: 'auto' }}>
    <div style={{ padding: '20px 0 0', borderTop: '1.5px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontSize: '7.5pt', color: '#94a3b8', fontWeight: 600 }}>
        Legacy Clinics • Specialized Healthcare Solutions • info@legacyclinics.rw • www.legacyclinics.rw
      </div>
      <div style={{ fontSize: '7.5pt', color: '#cbd5e1', fontWeight: 700 }}>
        Page 1 of 1
      </div>
    </div>
  </div>
);
