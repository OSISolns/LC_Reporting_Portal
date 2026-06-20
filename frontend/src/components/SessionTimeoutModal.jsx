import { useEffect, useState } from 'react';
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react';
import { WARNING_COUNTDOWN_SECONDS } from '../hooks/useInactivityTimer';

/**
 * SessionTimeoutModal
 * Displayed when the inactivity warning fires. Counts down and auto-closes
 * if the user stays active (parent dismisses via `visible=false`).
 *
 * Props:
 *   visible  {boolean}  – whether the modal is shown
 *   onStay   {Function} – user clicked "Stay Logged In"
 *   onLogout {Function} – countdown reached zero (or user clicked log out early)
 */
export default function SessionTimeoutModal({ visible, onStay, onLogout }) {
  const [seconds, setSeconds] = useState(WARNING_COUNTDOWN_SECONDS);

  // Reset + run countdown whenever the modal becomes visible
  useEffect(() => {
    if (!visible) {
      setSeconds(WARNING_COUNTDOWN_SECONDS);
      return;
    }

    setSeconds(WARNING_COUNTDOWN_SECONDS);
    const interval = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onLogout?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const progress = (seconds / WARNING_COUNTDOWN_SECONDS) * 100;
  const urgentColor = seconds <= 10 ? '#ef4444' : seconds <= 20 ? '#f59e0b' : '#38bdf8';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(6px)',
      animation: 'stmFadeIn 0.25s ease',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        margin: '0 1rem',
        backgroundColor: '#0f172a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '2rem 2rem 1.75rem',
        boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
        animation: 'stmSlideUp 0.3s ease',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>

        {/* Icon */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: `2px solid ${urgentColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: urgentColor,
          transition: 'border-color 0.5s, color 0.5s',
        }}>
          <AlertTriangle size={28} />
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Session Expiring Soon
          </h2>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.5 }}>
            You've been inactive for a while. Your session will automatically expire to protect your account.
          </p>
        </div>

        {/* Countdown ring */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
        }}>
          <div style={{
            fontSize: '3rem',
            fontWeight: 900,
            color: urgentColor,
            lineHeight: 1,
            transition: 'color 0.5s',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {String(seconds).padStart(2, '0')}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            seconds remaining
          </span>

          {/* Progress bar */}
          <div style={{
            width: '200px',
            height: '4px',
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: '99px',
            overflow: 'hidden',
            marginTop: '4px',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: urgentColor,
              borderRadius: '99px',
              transition: 'width 1s linear, background-color 0.5s',
            }} />
          </div>
        </div>

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          gap: '10px',
          width: '100%',
          marginTop: '0.25rem',
        }}>
          <button
            onClick={onLogout}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
              backgroundColor: 'rgba(255,255,255,0.04)',
              color: '#94a3b8',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <LogOut size={14} /> Log Out Now
          </button>

          <button
            onClick={onStay}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#0284c7',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(2,132,199,0.3)',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0369a1'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0284c7'; }}
          >
            <RefreshCw size={14} /> Stay Logged In
          </button>
        </div>
      </div>

      <style>{`
        @keyframes stmFadeIn  { from { opacity: 0; }                            to { opacity: 1; } }
        @keyframes stmSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
