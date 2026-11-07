import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('conceptcards_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state and verify token validity with backend on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('conceptcards_token');
      const storedUser = localStorage.getItem('conceptcards_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);

          // Verify token fresh status with /me
          const res = await api.get('/auth/me');
          if (res.data.success && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('conceptcards_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('Session verification failed, logging out:', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();

    // Listen for 401 session expiration from Axios interceptor
    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('conceptcards_auth_expired', handleAuthExpired);

    return () => {
      window.removeEventListener('conceptcards_auth_expired', handleAuthExpired);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        const { token: receivedToken, user: receivedUser } = res.data;
        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('conceptcards_token', receivedToken);
        localStorage.setItem('conceptcards_user', JSON.stringify(receivedUser));
        return { success: true };
      }
      return { success: false, message: res.data.message || 'Login failed' };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || 'An error occurred during login',
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await api.post('/auth/register', { name, email, password });
      if (res.data.success) {
        const { token: receivedToken, user: receivedUser } = res.data;
        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('conceptcards_token', receivedToken);
        localStorage.setItem('conceptcards_user', JSON.stringify(receivedUser));
        return { success: true };
      }
      return { success: false, message: res.data.message || 'Registration failed' };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || 'An error occurred during registration',
        errors: err.response?.data?.errors,
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('conceptcards_token');
    localStorage.removeItem('conceptcards_user');
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        localStorage.setItem('conceptcards_user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.warn('Failed to refresh user:', err.message);
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    refreshUser,
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

