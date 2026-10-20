import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { preparationService } from '../services/preparationService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('prepagent_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('prepagent_token') || null);
  const [loading, setLoading] = useState(true);

  // Restore session on startup
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('prepagent_token');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('prepagent_user', JSON.stringify(res.user));
          }
        } catch (error) {
          console.warn('[Auth] Session validation failed or token expired:', error.message);
          localStorage.removeItem('prepagent_token');
          localStorage.removeItem('prepagent_user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Determine if user has any existing preparation sessions
  const checkUserSessions = useCallback(async () => {
    try {
      const res = await preparationService.getPreparations();
      return res.sessions ? res.sessions.length : 0;
    } catch (e) {
      return 0;
    }
  }, []);

  // Sign in
  const login = async (credentials) => {
    const res = await authService.login(credentials);
    if (res.success) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('prepagent_token', res.token);
      localStorage.setItem('prepagent_user', JSON.stringify(res.user));

      // Check preparation sessions count for first-time vs returning flow
      let sessionCount = 0;
      try {
        const prepRes = await preparationService.getPreparations();
        sessionCount = prepRes.sessions ? prepRes.sessions.length : 0;
      } catch (err) {
        sessionCount = 0;
      }

      return { success: true, user: res.user, sessionCount };
    }
    return { success: false, message: res.message };
  };

  // Register
  const register = async (data) => {
    const res = await authService.register(data);
    if (res.success) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('prepagent_token', res.token);
      localStorage.setItem('prepagent_user', JSON.stringify(res.user));
      // Newly registered user always has 0 sessions (must go to /preparation/setup)
      return { success: true, user: res.user, sessionCount: 0 };
    }
    return { success: false, message: res.message };
  };

  // Logout
  const logout = async () => {
    await authService.logout();
    setToken(null);
    setUser(null);
  };

  // Update profile
  const updateProfile = async (profileData) => {
    const res = await authService.updateProfile(profileData);
    if (res.success && res.user) {
      setUser(res.user);
      localStorage.setItem('prepagent_user', JSON.stringify(res.user));
      return { success: true, user: res.user };
    }
    return { success: false, message: res.message };
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    register,
    logout,
    checkUserSessions,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
