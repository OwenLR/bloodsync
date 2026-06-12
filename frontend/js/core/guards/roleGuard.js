/**
 * roleGuard.js — Role-based access guard for BloodSync web app.
 *
 * Responsibilities:
 * - requireRole() — redirect to login if the user's role is not allowed
 *
 * Always call requireAuth() first, then requireRole() with the returned user.
 * requireRole() does NOT re-fetch the user — it receives it as a parameter.
 *
 * Example:
 *   import { requireAuth }  from '../core/guards/authGuard.js';
 *   import { requireRole }  from '../core/guards/roleGuard.js';
 *   import { ROLES }        from '../constants/config.js';
 *
 *   const user = await requireAuth();
 *   requireRole(user, [ROLES.ADMIN, ROLES.PRC_STAFF]);
 *   // execution continues only if role is allowed
 */

/**
 * requireRole(user, allowedRoles)
 *
 * Checks whether the user's role_id is in the allowedRoles array.
 * If not, redirects to login and returns false.
 *
 * @param {object}   user         — user object returned by requireAuth()
 * @param {number[]} allowedRoles — array of role_id values allowed on this page
 * @returns {boolean} — true if allowed, false if redirected
 */
export function requireRole(user, allowedRoles) {
  if (!user || !allowedRoles.includes(user.role_id)) {
    window.location.href = '/index.html';
    return false;
  }

  return true;
}