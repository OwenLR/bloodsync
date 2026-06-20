/**
 * navbar.js — Top navigation bar for BloodSync web app.
 *
 * Identity and global actions ONLY — no feature navigation links.
 * All page navigation lives in the sidebar (see constants/sidebarItems.js).
 *
 * Responsibilities:
 * - Render brand/logo (links to user's own dashboard — no redirect hop)
 * - Render current user's display name
 * - Render the notification badge placeholder (count passed in by caller)
 * - Handle logout button click
 *
 * Does NOT:
 * - Render feature navigation links (Dashboard, Blood Drives, Donors, etc.)
 *   — those belong in the sidebar only, to avoid duplicate navigation surfaces
 * - Fetch notifications or unread counts
 * - Open or listen to sockets
 * - Call any feature APIs
 *
 * Usage:
 *   import { renderNavbar } from '../layouts/navbar.js';
 *   const user = await requireAuth();
 *   renderNavbar(user, 0);                              // render immediately, count 0
 *   getUnreadCount().then(count => updateBadge(count));  // update later, non-blocking
 *
 * Expects <nav id="navbar"></nav> in the HTML page.
 * JS targets IDs — CSS targets classes.
 */

import { logout, getDashboardHref } from '../core/auth.js';
import { ROLES }                    from '../constants/roles.js';
import { ROUTES }                   from '../constants/routes.js';

// ---------------------------------------------------------------------------
// renderNavbar(user, unreadCount)
// ---------------------------------------------------------------------------

/**
 * @param {object} user         — current user object from requireAuth()
 * @param {number} unreadCount  — unread notification count (default 0)
 */
export function renderNavbar(user, unreadCount = 0) {
  const container = document.getElementById('navbar');
  if (!container) return;

  // --- Brand ---
  // Links directly to the user's dashboard — avoids the index.html → redirect
  // hop that caused a visible flash on every "home" navigation.
  const brand     = document.createElement('div');
  brand.className = 'navbar-brand';
  const brandLink       = document.createElement('a');
  brandLink.href        = getDashboardHref(user.role_id);
  brandLink.textContent = 'BloodSync';
  brand.appendChild(brandLink);

  // --- Right section: notifications + user info + logout ---
  const rightSection     = document.createElement('div');
  rightSection.className = 'navbar-right';

  // Notifications — universal, links to role-specific notifications page
  const notifHref = getNotificationsHref(user.role_id);
  const notifLink = document.createElement('a');
  notifLink.href  = notifHref;
  notifLink.className = 'navbar-notif-link';
  notifLink.textContent = 'Notifications';

  // Always render the badge element so notificationUI.js can call
  // document.getElementById('notif-badge') after a socket event fires,
  // even if unreadCount was 0 at page load. Visibility toggled via CSS class.
  const badge     = document.createElement('span');
  badge.id        = 'notif-badge';
  badge.className = 'notif-badge' + (unreadCount > 0 ? '' : ' notif-badge-hidden');
  badge.textContent = unreadCount > 0 ? unreadCount : '';
  notifLink.appendChild(badge);

  // --- User section ---
  const userSection     = document.createElement('div');
  userSection.className = 'navbar-user';

  const usernameSpan       = document.createElement('span');
  usernameSpan.className   = 'navbar-username';
  usernameSpan.textContent = buildDisplayName(user);

  const logoutBtn       = document.createElement('button');
  logoutBtn.id          = 'btn-logout';
  logoutBtn.className   = 'btn-logout';
  logoutBtn.textContent = 'Logout';
  logoutBtn.addEventListener('click', async () => {
    await logout();
    window.location.href = ROUTES.LOGIN;
  });

  userSection.appendChild(usernameSpan);
  userSection.appendChild(logoutBtn);

  rightSection.appendChild(notifLink);
  rightSection.appendChild(userSection);

  // --- Assemble ---
  container.innerHTML = '';
  container.appendChild(brand);
  container.appendChild(rightSection);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildDisplayName(user) {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.email || 'User';
}

function getNotificationsHref(roleId) {
  const routes = {
    [ROLES.ADMIN]:        ROUTES.ADMIN.NOTIFICATIONS,
    [ROLES.PRC_STAFF]:    ROUTES.STAFF.NOTIFICATIONS,
    [ROLES.VOLUNTEER]:    ROUTES.VOLUNTEER.NOTIFICATIONS,
    [ROLES.PHLEBOTOMIST]: ROUTES.PHLEBOTOMIST.NOTIFICATIONS,
    [ROLES.REQUESTOR]:    ROUTES.REQUESTOR.NOTIFICATIONS,
  };

  return routes[roleId] || ROUTES.LOGIN;
}