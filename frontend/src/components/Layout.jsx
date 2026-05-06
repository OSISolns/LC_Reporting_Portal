import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar automatically on route change (mobile nav)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const rot13 = (s) => s.replace(/[a-zA-Z]/g, c => String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26));

  // Anti-tamper logic
  useEffect(() => {
    const checkSignature = () => {
      const sigId = rot13('if-fvt');
      const displayedText = 'Inyrel Fgehpgher';
      const el = document.getElementById(sigId);
      
      if (!el || el.innerText !== displayedText || rot13(el.innerText) !== 'Valery Structure') {
        const body = document.querySelector('body');
        if (body) body.style.display = 'none';
      }
    };
    
    const interval = setInterval(checkSignature, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>

      {/* ── Mobile backdrop ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            zIndex: 40,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* ── Sidebar (desktop: always visible | mobile: drawer) ── */}
      <div className={`sidebar-wrapper${sidebarOpen ? ' sidebar-open' : ''}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} />
        <main style={{ flex: 1, padding: 'var(--page-padding)', overflowY: 'auto' }}>
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Subtle Protected Signature */}
      <div 
        id={rot13('if-fvt')}
        style={{
          position: 'fixed',
          bottom: '8px',
          right: '8px',
          fontSize: '10px',
          fontFamily: 'monospace',
          color: 'rgba(0, 0, 0, 0.15)',
          userSelect: 'none',
          pointerEvents: 'none',
          zIndex: 9999,
          letterSpacing: '0.05em',
          opacity: 0.8
        }}
      >
        {rot13('Inyrel Fgehpgher') === 'Valery Structure' ? 'Inyrel Fgehpgher' : ''}
      </div>
    </div>
  );
};

export default Layout;
