import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useState, useEffect, useLayoutEffect, useRef } from 'react';

// Global click/mouse tracker to capture coordinates of the button that triggered the modal
let lastClickCoords = null;
if (typeof window !== 'undefined') {
  window.addEventListener('mousedown', (e) => {
    lastClickCoords = { x: e.clientX, y: e.clientY };
  }, { capture: true, passive: true });
}

const Modal = ({ isOpen, onClose, title, children, maxWidth = '600px' }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimated, setIsAnimated] = useState(isOpen);
  const [transformOrigin, setTransformOrigin] = useState('center center');
  const cardRef = useRef(null);

  // Synchronize shouldRender and animation state with isOpen prop cleanly
  useEffect(() => {
    let animFrame;
    let closeTimer;
    if (isOpen) {
      setShouldRender(true);
      animFrame = requestAnimationFrame(() => {
        setIsAnimated(true);
      });
    } else {
      setIsAnimated(false);
      closeTimer = setTimeout(() => {
        setShouldRender(false);
      }, 180);
    }
    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [isOpen]);

  // Compute transform-origin based on last click
  useLayoutEffect(() => {
    if (shouldRender && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      if (lastClickCoords && rect.width > 0) {
        const x = Math.max(0, Math.min(rect.width, lastClickCoords.x - rect.left));
        const y = Math.max(0, Math.min(rect.height, lastClickCoords.y - rect.top));
        setTransformOrigin(`${x}px ${y}px`);
      } else {
        setTransformOrigin('center center');
      }
    }
  }, [shouldRender]);

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
        padding: '1.5rem',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        opacity: isAnimated ? 1 : 0,
        transition: 'opacity 0.2s ease-out',
      }}
    >
      <div 
        ref={cardRef}
        onClick={(e) => e.stopPropagation()} // Prevent clicking within modal from closing it
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.08)',
          borderRadius: '16px',
          transformOrigin,
          transform: isAnimated ? 'scale(1)' : 'scale(0.97)',
          opacity: isAnimated ? 1 : 0,
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease-out',
          position: 'relative',
          zIndex: 1000000
        }}
      >
        <div style={{
          padding: '1.1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
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
        <div style={{ padding: '1.75rem 2rem', overflowY: 'auto', backgroundColor: '#ffffff', color: '#1e293b' }}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;

