/**
 * authGuard.js — Authentication guard for BloodSync web app.
 *
 * Responsibilities:
 * - requireAuth() — redirect to login if the user is not authenticated
 *
 * Usage: call requireAuth() at the top of every protected page entry file.
 * It returns the current user on success so the entry file can use it
 * immediately without a second getCurrentUser() call.
 *
 * Example:
 *   import { requireAuth } from '../core/guards/authGuard.js';
 *   const user = await requireAuth();
 *   // user is guaranteed to be non-null past this point
 */

import { getCurrentUser } from '../auth.js';

/**
 * requireAuth()
 *
 * Fetches the current user. If none is found (unauthenticated or session
 * expired), redirects to the login page and returns null.
 *
 * @returns {Promise<object|null>} — the current user object, or null if redirected
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = '/index.html';
    return null;
  }

  return user;
}