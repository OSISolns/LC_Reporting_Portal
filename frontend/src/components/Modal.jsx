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
  const [isAnimated, setIsAnimated] = useState(false);
  const [transformOrigin, setTransformOrigin] = useState('center center');
  const cardRef = useRef(null);

  // Synchronize shouldRender state with the isOpen prop
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      setIsAnimated(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 250); // Wait for exit transition to complete
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Trigger the entry animation on the frame immediately following DOM mounting
  useEffect(() => {
    if (shouldRender && isOpen) {
      const timer = setTimeout(() => {
        setIsAnimated(true);
      }, 25);
      return () => clearTimeout(timer);
    }
  }, [shouldRender, isOpen]);

  // Compute the correct transform-origin relative to the click coordinates
  useLayoutEffect(() => {
    if (shouldRender && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      if (lastClickCoords) {
        const x = lastClickCoords.x - rect.left;
        const y = lastClickCoords.y - rect.top;
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
    }, 220); // trigger the parent's onClose after exit animation
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
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '2rem',
        backdropFilter: isAnimated ? 'blur(8px)' : 'blur(0px)',
        opacity: isAnimated ? 1 : 0,
        transition: 'opacity 0.25s ease, backdrop-filter 0.25s ease',
      }}
    >
      <div 
        ref={cardRef}
        className="glass" 
        onClick={(e) => e.stopPropagation()} // Prevent clicking within modal from closing it
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--sidebar-bg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          transformOrigin,
          transform: isAnimated ? 'scale(1)' : 'scale(0.01)',
          opacity: isAnimated ? 1 : 0,
          transition: isAnimated 
            ? 'transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease-out'
            : 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.18s ease-in'
        }}
      >
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.2)'
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>{title}</h2>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}>
            <X size={24} />
          </button>
        </div>
        <div style={{ padding: '2rem', overflowY: 'auto', backgroundColor: '#ffffff', color: 'var(--text-primary)' }}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;

