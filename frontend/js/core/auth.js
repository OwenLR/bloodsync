/**
 * auth.js — Authentication helpers for BloodSync web app.
 *
 * Responsibilities:
 * - login()           — POST credentials, cache user, redirect by role
 * - logout()          — POST logout, clear cache, redirect to login
 * - getCurrentUser()  — return cached user or fetch from /api/auth/me
 * - redirectByRole()  — send user to the correct dashboard for their role
 *
 * This file does NOT touch the DOM directly.
 * Error display is the caller's responsibility.
 */

import { apiFetch } from './api.js';
import { ROLES }    from '../constants/config.js';

// ---------------------------------------------------------------------------
// In-memory user cache
// Survives navigation within the SPA but resets on page reload.
// getCurrentUser() re-fetches from /api/auth/me on reload.
// ---------------------------------------------------------------------------

let _currentUser = null;

// ---------------------------------------------------------------------------
// login(email, password)
// Returns the user object on success, throws on failure.
// ---------------------------------------------------------------------------

export async function login(email, password) {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const body = await res.json();

  if (!res.ok || !body.success) {
    throw new Error(body.message || 'Login failed.');
  }

  _currentUser = body.data.user;
  redirectByRole(_currentUser.role_id);

  return _currentUser;
}

// ---------------------------------------------------------------------------
// logout()
// Clears server session and local cache, redirects to login.
// ---------------------------------------------------------------------------

export async function logout() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Even if the request fails, clear local state and redirect
  }

  _currentUser = null;
  window.location.href = '/index.html';
}

// ---------------------------------------------------------------------------
// getCurrentUser()
// Returns the cached user if available, otherwise fetches from /api/auth/me.
// Returns null if the user is not authenticated.
// ---------------------------------------------------------------------------

export async function getCurrentUser() {
  if (_currentUser) return _currentUser;

  try {
    const res  = await apiFetch('/api/auth/me');

    // apiFetch returns undefined if refresh failed and redirect is happening
    if (!res) return null;

    const body = await res.json();

    if (!res.ok || !body.success) return null;

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
  const routes = {
    [ROLES.ADMIN]:        '/pages/admin/dashboard.html',
    [ROLES.PRC_STAFF]:    '/pages/staff/dashboard.html',
    [ROLES.VOLUNTEER]:    '/pages/volunteer/dashboard.html',
    [ROLES.PHLEBOTOMIST]: '/pages/phlebotomist/dashboard.html',
    [ROLES.REQUESTOR]:    '/pages/requestor/dashboard.html',
  };

  const destination = routes[roleId];

  if (!destination) {
    // Unknown role — send back to login
    window.location.href = '/index.html';
    return;
  }

  window.location.href = destination;
}