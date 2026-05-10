/*
 * Auth Context
 * ------------
 * Global authentication state shared across all components via React Context.
 * 
 * Why Context instead of prop drilling?
 *   - User state is needed in sidebar, dashboard, trip pages, profile
 *   - Passing it through every component tree level is messy
 *   - Context + useAuth() hook gives clean access anywhere
 *
 * On mount, checks /api/auth/me to see if the session is still valid.
 * This handles page refreshes without re-logging in.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check session on initial load
  useEffect(() => {
    api.get('/auth/me')
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
        }
      })
      .catch(() => {
        // Session expired or server down — user stays null
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    setUser(data.data);
    return data;
  }

  async function signup(name, email, password, confirm_password) {
    const data = await api.post('/auth/signup', { name, email, password, confirm_password });
    setUser(data.data);
    return data;
  }

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
  }

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
