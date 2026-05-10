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
import { bypassAuth, bypassUser } from '../config/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(bypassAuth ? bypassUser : null);
  const [loading, setLoading] = useState(!bypassAuth);

  // Check session on initial load (skipped when bypassing auth UI)
  useEffect(() => {
    if (bypassAuth) return;
    // ── DUMMY: skip session restore, just mark loading done ──
    setLoading(false);
  }, []);

  async function login(email, password) {
    // ── DUMMY AUTH — no API call ──
    // Accepts any non-empty email + password (min 6 chars)
    if (!email || !password || password.length < 6) {
      throw new Error('Invalid email or password.');
    }
    const mockUser = {
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      email,
      initials: email.slice(0, 2).toUpperCase(),
    };
    setUser(mockUser);
    return { data: mockUser };
  }

  async function signup(name, email, password, confirm_password) {
    // ── DUMMY AUTH — no API call ──
    if (!name || name.length < 2) throw new Error('Name must be at least 2 characters.');
    if (!email) throw new Error('Email is required.');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.');
    if (password !== confirm_password) throw new Error('Passwords do not match.');
    const mockUser = {
      name,
      email,
      initials: name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    };
    setUser(mockUser);
    return { data: mockUser };
  }

  async function logout() {
    // ── DUMMY: no API call, just clear user ──
    setUser(bypassAuth ? bypassUser : null);
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
