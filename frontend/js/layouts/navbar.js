/**
 * navbar.js — Top navigation bar for BloodSync web app.
 *
 * Responsibilities:
 * - Render the navbar based on the current user's role
 * - Render the notification badge placeholder (count passed in by caller)
 * - Handle logout button click
 *
 * Does NOT:
 * - Fetch notifications or unread counts
 * - Open or listen to sockets
 * - Call any feature APIs
 *
 * Usage:
 *   import { renderNavbar } from '../layouts/navbar.js';
 *   const user  = await requireAuth();
 *   const count = await getUnreadCount(); // from features/notifications/notificationApi.js
 *   renderNavbar(user, count);
 *
 * Expects <nav id="navbar"></nav> in the HTML page.
 * JS targets IDs — CSS targets classes.
 */

import { logout }    from '../core/auth.js';
import { ROLES }     from '../constants/roles.js';
import { ROUTES }    from '../constants/routes.js';
import { NAV_ITEMS } from '../constants/navItems.js';

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

  const items = NAV_ITEMS[user.role_id] || [];

  // --- Brand ---
  const brand     = document.createElement('div');
  brand.className = 'navbar-brand';
  const brandLink       = document.createElement('a');
  brandLink.href        = '/';
  brandLink.textContent = 'BloodSync';
  brand.appendChild(brandLink);

  // --- Nav links ---
  const ul     = document.createElement('ul');
  ul.className = 'navbar-links';

  items.forEach(item => {
    ul.appendChild(buildNavItem(item.label, item.href));
  });

  // Notifications — universal, always last before user section
  const notifHref = getNotificationsHref(user.role_id);
  const notifLi   = buildNavItem('Notifications', notifHref);

  if (unreadCount > 0) {
    const badge       = document.createElement('span');
    badge.id          = 'notif-badge';
    badge.className   = 'notif-badge';
    badge.textContent = unreadCount;
    notifLi.querySelector('a').appendChild(badge);
  }

  ul.appendChild(notifLi);

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

  // --- Assemble ---
  container.innerHTML = '';
  container.appendChild(brand);
  container.appendChild(ul);
  container.appendChild(userSection);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildNavItem(label, href) {
  const li      = document.createElement('li');
  const a       = document.createElement('a');
  a.href        = href;
  a.textContent = label;

  if (isActivePage(href)) {
    a.classList.add('nav-active');
  }

  li.appendChild(a);
  return li;
}

function isActivePage(href) {
  return window.location.pathname === href.split('?')[0].split('#')[0];
}

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