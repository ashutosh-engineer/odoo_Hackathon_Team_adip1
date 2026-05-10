/*
 * Auth Context
 * ------------
 * Global authentication state — wired to the real Flask API.
 *
 * On mount: calls /api/auth/me to restore session from Redis-backed cookie.
 * login()  → POST /api/auth/login
 * signup() → POST /api/auth/signup
 * logout() → POST /api/auth/logout
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { bypassAuth, bypassUser } from '../config/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(bypassAuth ? bypassUser : null);
  const [loading, setLoading] = useState(!bypassAuth);

  /* ── Restore session on page load ── */
  useEffect(() => {
    if (bypassAuth) return;

    api.get('/auth/me')
      .then((data) => {
        if (data?.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        // Network error or server down — stay logged out
      })
      .finally(() => setLoading(false));
  }, []);

  /* ── Login ── */
  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    if (data?.data) {
      setUser(data.data);
    }
    return data;
  }

  /* ── Signup ── */
  async function signup(name, email, password, confirm_password) {
    const data = await api.post('/auth/signup', { name, email, password, confirm_password });
    if (data?.data) {
      setUser(data.data);
    }
    return data;
  }

  /* ── Logout ── */
  async function logout() {
    if (!bypassAuth) {
      try {
        await api.post('/auth/logout', {});
      } catch {
        // Ignore — clear local state regardless
      }
    }
    setUser(bypassAuth ? bypassUser : null);
  }

  /* ── Update local user state after profile edit ── */
  function updateUser(updates) {
    setUser((prev) => ({ ...prev, ...updates }));
  }

  const value = { user, loading, login, signup, logout, updateUser };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
