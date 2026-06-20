'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useInactivityTimer } from '../hooks/useInactivityTimer';
import SessionTimeoutModal from '../components/SessionTimeoutModal';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        } catch (err) {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('token', token);
    setUser(userData);
    return userData;
  };

  const devLogin = async (username) => {
    const res = await api.post('/auth/dev-login', { username });
    const { token, user: userData } = res.data;
    localStorage.setItem('token', token);
    setUser(userData);
    return userData;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    setShowWarning(false);
  }, []);

  const handleWarn   = useCallback(() => setShowWarning(true),  []);
  const handleResume = useCallback(() => setShowWarning(false), []);

  // Inactivity timer — only active when a user is logged in
  useInactivityTimer({
    onLogout: logout,
    onWarn:   handleWarn,
    onResume: handleResume,
    active:   !!user,
  });

  const hasPermission = (module, action) => {
    if (!user) return false;

    // Admins should NOT be able to verify (review) any request
    if (user.role === 'admin' && action === 'review') return false;

    if (user.role === 'admin') return true;
    return user.permissions?.[module]?.[action]?.granted === true;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, devLogin, logout, hasPermission }}>
      {children}

      {/* Session timeout warning overlay — rendered here so it floats above everything */}
      <SessionTimeoutModal
        visible={showWarning}
        onStay={handleResume}
        onLogout={logout}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
