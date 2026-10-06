import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = '600px' }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimated, setIsAnimated] = useState(isOpen);
  const cardRef = useRef(null);

  // Synchronize shouldRender and animation state with isOpen prop cleanly
  useEffect(() => {
    let animFrame;
    let timer;
    let closeTimer;

    if (isOpen) {
      setShouldRender(true);
      // Double requestAnimationFrame or small timeout ensures DOM is painted before transition
      animFrame = requestAnimationFrame(() => {
        timer = setTimeout(() => {
          setIsAnimated(true);
        }, 10);
      });
    } else {
      setIsAnimated(false);
      closeTimer = setTimeout(() => {
        setShouldRender(false);
      }, 180);
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (timer) clearTimeout(timer);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  const handleClose = () => {
    setIsAnimated(false);
    setTimeout(() => {
      onClose();
    }, 180);
  };

  const modalContent = (
    <div 
      onClick={handleClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '1rem',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        opacity: isAnimated ? 1 : 0,
        transition: 'opacity 0.2s ease-out',
        boxSizing: 'border-box'
      }}
    >
      <div 
        ref={cardRef}
        onClick={(e) => e.stopPropagation()} // Prevent clicking within modal from closing it
        style={{
          width: '100%',
          maxWidth: `min(${maxWidth}, calc(100vw - 2rem))`,
          maxHeight: '90vh',
          height: 'auto',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.08)',
          borderRadius: '16px',
          transformOrigin: 'center center',
          transform: isAnimated ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(8px)',
          opacity: isAnimated ? 1 : 0,
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease-out',
          position: 'relative',
          zIndex: 1000000,
          boxSizing: 'border-box'
        }}
      >
        <div style={{
          padding: '1.1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          flexShrink: 0
        }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', margin: 0, fontFamily: "'Poppins', sans-serif", letterSpacing: '0.01em' }}>{title}</h2>
          <button 
            onClick={handleClose} 
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              color: '#ffffff', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              transition: 'all 0.2s' 
            }} 
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'} 
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1.75rem 2rem', backgroundColor: '#ffffff', color: '#1e293b', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;


