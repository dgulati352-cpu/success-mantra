import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup } from 'firebase/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('sm_token') || null);
  const [loading, setLoading] = useState(true);

  // Fetch current user details on boot if token exists
  useEffect(() => {
    if (token) {
      apiFetch('/auth/me')
        .then(res => {
          if (res.success) {
            setUser(res.user);
          } else {
            logout();
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const googleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const res = await apiFetch('/auth/firebase-login', {
        method: 'POST',
        body: JSON.stringify({
          idToken,
          email: result.user.email,
          name: result.user.displayName,
          picture: result.user.photoURL,
          uid: result.user.uid
        })
      });
      if (res.success) {
        localStorage.setItem('sm_token', res.token);
        setToken(res.token);
        setUser(res.user);
        return res;
      }
    } catch (err) {
      console.error('Firebase Google Login Error:', err);
      throw err;
    }
  };

  const login = async (email, password) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.success) {
      localStorage.setItem('sm_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res;
    }
  };

  const demoLogin = async (role) => {
    const res = await apiFetch('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role })
    });
    if (res.success) {
      localStorage.setItem('sm_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res;
    }
  };

  const register = async (userData) => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (res.success) {
      localStorage.setItem('sm_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res;
    }
  };

  const logout = () => {
    localStorage.removeItem('sm_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await apiFetch('/auth/me');
      if (res.success) setUser(res.user);
    } catch (e) {
      console.error('Refresh user error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        googleLogin,
        demoLogin,
        register,
        logout,
        refreshUser,
        isAuthenticated: !!user,
        isStudent: user?.role === 'student',
        isFaculty: user?.role === 'faculty',
        isAdmin: user?.role === 'admin' || user?.role === 'super_admin'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
