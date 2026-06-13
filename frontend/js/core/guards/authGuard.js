/**
 * authGuard.js — Authentication guard for BloodSync web app.
 *
 * Responsibilities:
 * - requireAuth() — redirect to login if the user is not authenticated
 *
 * Does NOT perform role checks — that is roleGuard's responsibility.
 * Does NOT render any UI.
 *
 * Usage: call requireAuth() at the top of every protected page entry file.
 * Returns the current user on success so the entry file can use it
 * immediately without a second getCurrentUser() call.
 *
 * Example:
 *   const user = await requireAuth();
 *   if (!user) return;
 *   requireRole(user, [ROLES.ADMIN]);
 */

import { getCurrentUser } from '../auth.js';
import { ROUTES }         from '../../constants/routes.js';

/**
 * requireAuth()
 * Returns the current user if authenticated, otherwise redirects to login
 * and returns null.
 *
 * @returns {Promise<object|null>}
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = ROUTES.LOGIN;
    return null;
  }

  return user;
}