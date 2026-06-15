/**
 * auth.js — Authentication functions for BloodSync web app.
 *
 * Responsibilities:
 * - login()           — POST credentials, cache user, return user object
 * - logout()          — POST logout, clear cache
 * - getCurrentUser()  — return cached user or fetch from /api/auth/me
 * - redirectByRole()  — send user to correct dashboard for their role
 *
 * Does NOT navigate after login() or logout() — that is the caller's job.
 * Entry files call redirectByRole() after login(), and redirect after logout().
 *
 * User cache note:
 * _currentUser is an in-memory variable. It does NOT survive page navigation
 * or page reload — this is a multi-page app, not an SPA. On every new page
 * load, getCurrentUser() re-fetches from /api/auth/me via the cookie.
 */

import { apiFetch }                        from './api.js';
import { ROLES }                           from '../constants/roles.js';
import { ROUTES }                          from '../constants/routes.js';
import { API_BASE_URL, API_ENDPOINTS }     from '../constants/apiConfig.js';

// ---------------------------------------------------------------------------
// In-memory user cache — current page load only
// ---------------------------------------------------------------------------

let _currentUser = null;

// ---------------------------------------------------------------------------
// login(email, password)
// Returns the user object on success, throws on failure.
// Caller is responsible for calling redirectByRole() after login().
// ---------------------------------------------------------------------------

export async function login(email, password) {
  // Raw fetch — not apiFetch — because login is not an authenticated request.
  // apiFetch would intercept a 401 (wrong credentials) and attempt a refresh,
  // then redirect to login — causing a redirect loop from the login page itself.
  const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH_LOGIN}`, {
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({ email, password }),
  });

  const body = await res.json();

  if (!res.ok || !body.success) {
    throw new Error(body.message || 'Login failed.');
  }

  _currentUser = body.data.user;
  return _currentUser;
}

// ---------------------------------------------------------------------------
// logout()
// Clears server session and local cache.
// Caller is responsible for redirecting after logout().
// ---------------------------------------------------------------------------

export async function logout() {
  try {
    await apiFetch(API_ENDPOINTS.AUTH_LOGOUT, { method: 'POST' });
  } catch {
    // If the request fails, clear local state anyway
  }

  _currentUser = null;
}

// ---------------------------------------------------------------------------
// getCurrentUser()
// Returns cached user if available, otherwise fetches from /api/auth/me.
// Returns null if unauthenticated.
// ---------------------------------------------------------------------------

export async function getCurrentUser() {
  if (_currentUser) return _currentUser;

  try {
    // Raw fetch — not apiFetch — because a 401 here means "not logged in",
    // not "session expired". apiFetch would intercept the 401, attempt a
    // refresh, then redirect to login — causing an infinite loop on the
    // login page itself. This is a session probe, not an authenticated request.
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH_ME}`, {
      credentials: 'include',
    });

    if (!res.ok) return null;

    const body = await res.json();
    if (!body.success) return null;

    _currentUser = body.data.user;
    return _currentUser;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// redirectByRole(roleId)
// Sends the user to the correct dashboard for their role.
// ---------------------------------------------------------------------------

export function redirectByRole(roleId) {
  const destinations = {
    [ROLES.ADMIN]:        ROUTES.ADMIN.DASHBOARD,
    [ROLES.PRC_STAFF]:    ROUTES.STAFF.DASHBOARD,
    [ROLES.VOLUNTEER]:    ROUTES.VOLUNTEER.DASHBOARD,
    [ROLES.PHLEBOTOMIST]: ROUTES.PHLEBOTOMIST.DASHBOARD,
    [ROLES.REQUESTOR]:    ROUTES.REQUESTOR.DASHBOARD,
  };

  window.location.href = destinations[roleId] || ROUTES.LOGIN;
}