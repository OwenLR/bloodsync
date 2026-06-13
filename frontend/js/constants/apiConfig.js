/**
 * apiConfig.js — API base URL and endpoint constants.
 *
 * Import from here instead of hardcoding URLs anywhere in the app.
 * Only auth endpoints live here — feature endpoints live in their
 * own feature API files (e.g. features/donors/donorApi.js).
 */

export const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : '';

export const API_ENDPOINTS = Object.freeze({
  AUTH_LOGIN:   '/api/auth/login',
  AUTH_REFRESH: '/api/auth/refresh',
  AUTH_LOGOUT:  '/api/auth/logout',
  AUTH_ME:      '/api/auth/me',
});