/*
 * Auth Context — wired to the real Flask API.
 *
 * On mount: GET /api/auth/me  — restores session from cookie
 * login()  → POST /api/auth/login
 * signup() → POST /api/auth/signup
 * logout() → POST /api/auth/logout  (does NOT redirect on 401)
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { bypassAuth, bypassUser } from '../config/auth';

const AuthContext = createContext(null);

const BASE = '/api';

/* Raw fetch that never redirects on 401 — used only for auth calls */
async function authFetch(endpoint, options = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (typeof data === 'object' && data?.error) || data || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(bypassAuth ? bypassUser : null);
  const [loading, setLoading] = useState(!bypassAuth);

  /* ── Restore session on page load ── */
  useEffect(() => {
    if (bypassAuth) return;
    authFetch('/auth/me')
      .then((data) => {
        if (data?.authenticated && data.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ── Login ── */
  async function login(email, password) {
    const data = await authFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data?.data) setUser(data.data);
    return data;
  }

  /* ── Signup ── */
  async function signup(name, email, password, confirm_password) {
    const data = await authFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, confirm_password }),
    });
    if (data?.data) setUser(data.data);
    return data;
  }

  /* ── Logout — clears user state, never triggers 401 redirect ── */
  async function logout() {
    if (!bypassAuth) {
      // Fire-and-forget — we clear local state regardless of server response
      authFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    }
    setUser(bypassAuth ? bypassUser : null);
  }

  function updateUser(updates) {
    setUser((prev) => ({ ...prev, ...updates }));
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
