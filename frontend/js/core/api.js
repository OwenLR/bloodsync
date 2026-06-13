/**
 * api.js — HTTP infrastructure layer for BloodSync web app.
 *
 * Responsibilities:
 * - Attach credentials: 'include' so httpOnly cookies are sent automatically
 * - Set Content-Type: application/json (skipped for FormData uploads)
 * - Intercept 401 responses, attempt a token refresh, then retry once
 * - Redirect to login and throw if refresh fails
 *
 * Allowed:
 * - HTTP requests
 * - Credential handling
 * - Token refresh
 * - Retry logic
 *
 * Not allowed:
 * - DOM manipulation
 * - Toast notifications
 * - Modal display
 * - Feature logic
 * - Validation
 * - Business rules
 *
 * Network errors and session expiry are thrown as Error.
 * Error display is the caller's responsibility.
 */

import { API_BASE_URL, API_ENDPOINTS } from '../constants/apiConfig.js';
import { ROUTES }                      from '../constants/routes.js';

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

/**
 * apiFetch(path, options)
 *
 * @param {string} path     - API path, e.g. '/api/blood-requests'
 * @param {object} options  - Standard fetch options (method, body, headers, etc.)
 * @returns {Promise<Response>}
 *
 * Throws:
 * - Error('Session expired') if refresh fails — redirects to login first
 * - Error('Network error: ...') if fetch itself fails (offline, DNS, etc.)
 */
export async function apiFetch(path, options = {}) {
  const url    = `${API_BASE_URL}${path}`;
  const config = buildConfig(options);

  let res;

  try {
    res = await fetch(url, config);
  } catch (err) {
    throw new Error(`Network error: ${err.message}`);
  }

  if (res.status === 401) {
    const refreshed = await tryRefresh();

    if (!refreshed) {
      redirectToLogin();
      throw new Error('Session expired');
    }

    try {
      res = await fetch(url, config);
    } catch (err) {
      throw new Error(`Network error: ${err.message}`);
    }
  }

  return res;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildConfig(options) {
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  return {
    ...options,
    credentials: 'include',
    headers,
  };
}

/**
 * IMPORTANT: Never replace fetch() here with apiFetch().
 * Doing so causes recursive refresh attempts (infinite loop).
 */
async function tryRefresh() {
  try {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH_REFRESH}`, {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
    });

    return res.ok;
  } catch {
    return false;
  }
}

function redirectToLogin() {
  window.location.href = ROUTES.LOGIN;
}