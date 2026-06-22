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
 * User cache — two layers:
 *
 * 1. _currentUser (in-memory) — within a single page load. Fastest possible
 *    lookup; used when getCurrentUser() is called multiple times on one page.
 *
 * 2. sessionStorage key 'bs_user' — survives page navigations within the tab,
 *    cleared automatically when the tab closes. This is what eliminates the
 *    GET /api/auth/me round-trip on every navigation. The server is still the
 *    source of truth — if the cookie is invalid/expired, apiFetch's 401 handler
 *    will redirect to login and logout() will clear the cache.
 *
 * Security note: sessionStorage is not a security boundary — the httpOnly
 * cookie is. The cached user object only contains display data (name, role_id,
 * branch_id). Tokens are never stored here.
 */

import { apiFetch }                        from './api.js';
import { ROLES }                           from '../constants/roles.js';
import { ROUTES }                          from '../constants/routes.js';
import { API_BASE_URL, API_ENDPOINTS }     from '../constants/apiConfig.js';

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

const SESSION_KEY = 'bs_user';

let _currentUser = null;

function readSessionCache() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSessionCache(user) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // sessionStorage quota exceeded or unavailable — fail silently,
    // next page load will just do a fresh fetch
  }
}

function clearSessionCache() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

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
  writeSessionCache(_currentUser);
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
  clearSessionCache();
}

// ---------------------------------------------------------------------------
// getCurrentUser()
// Returns cached user if available, otherwise fetches from /api/auth/me.
// Returns null if unauthenticated.
//
// Cache hierarchy:
//   1. _currentUser in memory (same page load)
//   2. sessionStorage 'bs_user' (same tab, across navigations)
//   3. GET /api/auth/me (network — first load or after tab reopen)
// ---------------------------------------------------------------------------

export async function getCurrentUser() {
  // 1. In-memory cache — same page load
  if (_currentUser) return _currentUser;

  // 2. sessionStorage cache — previous navigation within this tab
  const cached = readSessionCache();
  if (cached) {
    _currentUser = cached;
    return _currentUser;
  }

  // 3. Network fetch — tab just opened, or cache was cleared
  // Uses apiFetch (not raw fetch) so the 401→refresh→retry flow fires
  // when the access token has expired. The refresh token (7-day cookie)
  // transparently issues a new access token and retries the request.
  // If the refresh token is also expired or missing, apiFetch redirects
  // to login — which is the correct behavior.
  //
  // Safe to use apiFetch here because:
  // - apiFetch's tryRefresh() uses raw fetch internally (no loop)
  // - The login page uses raw fetch for login() itself (no loop)
  // - authGuard only redirects to login if apiFetch throws 'Session expired',
  //   meaning refresh genuinely failed — not on the first 401
  try {
    const res  = await apiFetch(API_ENDPOINTS.AUTH_ME);
    const body = await res.json();

    if (!res.ok || !body.success) return null;

    _currentUser = body.data.user;
    writeSessionCache(_currentUser);
    return _currentUser;
  } catch {
    // apiFetch already redirected to login if refresh failed —
    // return null here so the caller's guard fires cleanly too
    return null;
  }
}

// ---------------------------------------------------------------------------
// getDashboardHref(roleId)
// Returns the dashboard path for a given role.
// Used by navbar brand link and redirectByRole().
// ---------------------------------------------------------------------------

export function getDashboardHref(roleId) {
  const destinations = {
    [ROLES.ADMIN]:        ROUTES.ADMIN.DASHBOARD,
    [ROLES.PRC_STAFF]:    ROUTES.STAFF.DASHBOARD,
    [ROLES.VOLUNTEER]:    ROUTES.VOLUNTEER.DASHBOARD,
    [ROLES.PHLEBOTOMIST]: ROUTES.PHLEBOTOMIST.DASHBOARD,
    [ROLES.REQUESTOR]:    ROUTES.REQUESTOR.DASHBOARD,
  };

  return destinations[roleId] || ROUTES.LOGIN;
}

// ---------------------------------------------------------------------------
// redirectByRole(roleId)
// Sends the user to the correct dashboard for their role.
// ---------------------------------------------------------------------------

export function redirectByRole(roleId) {
  window.location.href = getDashboardHref(roleId);
}