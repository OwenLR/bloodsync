/**
 * roleGuard.js — Authorization guard for BloodSync web app.
 *
 * Responsibilities:
 * - requireRole() — redirect if the user's role is not allowed on this page
 *
 * Does NOT fetch the current user — receives it as a parameter.
 * Does NOT perform authentication checks — that is authGuard's responsibility.
 * Does NOT render any UI.
 *
 * Authorization failure (wrong role) redirects to the user's own dashboard —
 * NOT to login. The user is authenticated, just not authorized for this page.
 * Authentication failure (no user) is authGuard's concern.
 *
 * Usage:
 *   const user = await requireAuth();
 *   if (!user) return;
 *   if (!requireRole(user, [ROLES.ADMIN, ROLES.PRC_STAFF])) return;
 */

import { redirectByRole } from '../auth.js';
import { ROUTES }         from '../../constants/routes.js';

/**
 * requireRole(user, allowedRoles)
 *
 * @param {object}   user         — user object from requireAuth()
 * @param {number[]} allowedRoles — role_id values allowed on this page
 * @returns {boolean} — true if allowed, false if redirected
 */
export function requireRole(user, allowedRoles) {
  if (!user) {
    window.location.href = ROUTES.LOGIN;
    return false;
  }

  if (!allowedRoles.includes(user.role_id)) {
    // Authenticated but wrong role — send to their own dashboard
    redirectByRole(user.role_id);
    return false;
  }

  return true;
}