import { useEffect, useRef, useCallback } from 'react';

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
const WARNING_BEFORE_MS = 30 * 1000;          // warn 30s before logout

const ACTIVITY_EVENTS = [
  'mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click',
];

/**
 * useInactivityTimer
 * Calls `onWarn` when the user has been idle for (timeout - warningBefore),
 * then calls `onLogout` after the remaining warningBefore ms.
 * Resets on any detected user activity.
 *
 * @param {Function} onLogout   – called when session should terminate
 * @param {Function} onWarn     – called when the warning countdown should start
 * @param {Function} onResume   – called when activity is detected during the warning window
 * @param {boolean}  active     – set false to disable the timer (e.g. user not logged in)
 */
export function useInactivityTimer({ onLogout, onWarn, onResume, active }) {
  const warnTimerRef   = useRef(null);
  const logoutTimerRef = useRef(null);
  const inWarningRef   = useRef(false);

  const clearTimers = useCallback(() => {
    clearTimeout(warnTimerRef.current);
    clearTimeout(logoutTimerRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    clearTimers();

    if (inWarningRef.current) {
      // User became active during warning window — cancel logout
      inWarningRef.current = false;
      onResume?.();
    }

    // Schedule the warning
    warnTimerRef.current = setTimeout(() => {
      inWarningRef.current = true;
      onWarn?.();

      // After warning period, log out
      logoutTimerRef.current = setTimeout(() => {
        inWarningRef.current = false;
        onLogout?.();
      }, WARNING_BEFORE_MS);
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);
  }, [clearTimers, onLogout, onWarn, onResume]);

  useEffect(() => {
    if (!active) {
      clearTimers();
      return;
    }

    // Kick off the timer immediately
    resetTimer();

    const handleActivity = () => resetTimer();

    ACTIVITY_EVENTS.forEach(evt =>
      window.addEventListener(evt, handleActivity, { passive: true })
    );

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach(evt =>
        window.removeEventListener(evt, handleActivity)
      );
    };
  }, [active, resetTimer, clearTimers]);

  return { resetTimer };
}

export const WARNING_COUNTDOWN_SECONDS = WARNING_BEFORE_MS / 1000;
