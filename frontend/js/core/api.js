/**
 * api.js — apiFetch wrapper for BloodSync web app.
 *
 * Every API call in the app goes through this function — never raw fetch().
 *
 * Responsibilities:
 * - Attaches credentials: 'include' so httpOnly cookies are sent automatically
 * - Sets Content-Type: application/json by default
 * - Intercepts 401 responses, attempts a token refresh, then retries once
 * - Redirects to login if refresh fails (session truly expired)
 *
 * This file does NOT touch the DOM. Error display is the caller's responsibility.
 */

import { API_BASE_URL } from '../constants/config.js';

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

/**
 * apiFetch(path, options)
 *
 * @param {string} path     - API path, e.g. '/api/blood-requests'
 * @param {object} options  - Standard fetch options (method, body, headers, etc.)
 * @returns {Promise<Response>} - The fetch Response object
 *
 * Callers are responsible for:
 *   const res = await apiFetch('/api/...');
 *   const body = await res.json();
 *   if (!res.ok || !body.success) { // handle error }
 */
export async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  const config = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  let res = await fetch(url, config);

  // -------------------------------------------------------------------
  // 401 handling — attempt refresh then retry once
  // -------------------------------------------------------------------
  if (res.status === 401) {
    const refreshed = await tryRefresh();

    if (refreshed) {
      // Retry original request — new access token cookie is now set
      res = await fetch(url, config);
    } else {
      // Refresh failed — session is dead, send to login
      redirectToLogin();
      return;
    }
  }

  return res;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to refresh the access token using the refresh token cookie.
 * Returns true if successful, false if the session cannot be recovered.
 */
async function tryRefresh() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    return res.ok;
  } catch {
    // Network error during refresh — treat as failed
    return false;
  }
}

/**
 * Redirect to the login page.
 * Centralised here so the redirect target is changed in one place if needed.
 */
function redirectToLogin() {
  window.location.href = '/index.html';
}