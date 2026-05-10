/*
 * API Client
 * ----------
 * Centralized fetch wrapper for all backend calls.
 * Every component uses this instead of raw fetch() so we get:
 *   - Consistent error handling
 *   - Automatic JSON parsing
 *   - Auth redirect on 401
 *   - Single place to change base URL
 */

import { bypassAuth } from '../config/auth';

const BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE}${endpoint}`;

  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',  // Send session cookies with every request
    ...options,
  };

  // Serialize body if it's an object
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);

  const contentType = response.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  // Session missing — bounce to login unless we are bypassing the auth UI only
  if (response.status === 401) {
    if (!bypassAuth) {
      window.location.href = '/login';
      return null;
    }
    const errorMsg =
      typeof data === 'object' && data != null ? (data.error || data.message) : null;
    throw new Error(errorMsg || 'Not authenticated');
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || 'Something went wrong';
    throw new Error(errorMsg);
  }

  return data;
}

/* Convenience methods — keep call sites clean */
export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body }),
  del: (endpoint) => request(endpoint, { method: 'DELETE' }),
};
