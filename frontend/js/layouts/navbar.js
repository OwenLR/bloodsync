/**
 * navbar.js — Top navigation bar for BloodSync web app.
 *
 * Identity and global actions ONLY — no feature navigation links.
 * All page navigation lives in the sidebar (see constants/sidebarItems.js).
 *
 * Responsibilities:
 * - Render brand/logo (links to user's own dashboard — no redirect hop)
 * - Render current user's avatar (photo or initials fallback) + display name
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
 * Avatar (added this session): user.profile_img now comes from
 * GET /api/auth/me (authController.js's me() — role-aware lookup across
 * staff_profiles / volunteer_profiles). Requestor has no photo support
 * anywhere in the system, so that role always falls back to initials.
 * isImageUrl()/initials() are duplicated here rather than imported from
 * features/userManagement/ — layouts/ cannot import from features/ per
 * the Import Pyramid in rules.md (features are downstream of layouts).
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
/**
 * navbar.js — Top navigation bar for BloodSync web app.
 * (header comment unchanged from prior version, see previous file)
 *
 * Role label added this session: shown next to the name as
 * "{Name} | {Role Label}". PRC Staff shows "PRC {branch_name}" (no
 * "Staff" suffix — matches the exact format requested, distinct from
 * the Users page's longer "PRC {branch} Staff" convention). branch_name
 * comes from GET /api/auth/me (authController.js — PRC Staff only).
 * Falls back to "PRC Staff" if branch_name is unavailable.
 */

import { logout, getDashboardHref } from '../core/auth.js';
import { ROLES }                    from '../constants/roles.js';
import { ROUTES }                   from '../constants/routes.js';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

export function renderNavbar(user, unreadCount = 0) {
  const container = document.getElementById('navbar');
  if (!container) return;

  const brand     = document.createElement('div');
  brand.className = 'navbar-brand';
  const brandLink       = document.createElement('a');
  brandLink.href        = getDashboardHref(user.role_id);
  brandLink.textContent = 'BloodSync';
  brand.appendChild(brandLink);

  const rightSection     = document.createElement('div');
  rightSection.className = 'navbar-right';

  const notifHref = getNotificationsHref(user.role_id);
  const notifLink = document.createElement('a');
  notifLink.href  = notifHref;
  notifLink.className = 'navbar-notif-link';
  notifLink.textContent = 'Notifications';

  const badge     = document.createElement('span');
  badge.id        = 'notif-badge';
  badge.className = 'notif-badge' + (unreadCount > 0 ? '' : ' notif-badge-hidden');
  badge.textContent = unreadCount > 0 ? unreadCount : '';
  notifLink.appendChild(badge);

  const userSection     = document.createElement('div');
  userSection.className = 'navbar-user';

  const avatarEl = buildAvatar(user);

  const usernameSpan       = document.createElement('span');
  usernameSpan.className   = 'navbar-username';
  usernameSpan.textContent = `${buildDisplayName(user)} | ${buildRoleLabel(user)}`;

  const logoutBtn       = document.createElement('button');
  logoutBtn.id          = 'btn-logout';
  logoutBtn.className   = 'btn-logout';
  logoutBtn.textContent = 'Logout';
  logoutBtn.addEventListener('click', async () => {
    await logout();
    window.location.href = ROUTES.LOGIN;
  });

  userSection.appendChild(avatarEl);
  userSection.appendChild(usernameSpan);
  userSection.appendChild(logoutBtn);

  rightSection.appendChild(notifLink);
  rightSection.appendChild(userSection);

  container.innerHTML = '';
  container.appendChild(brand);
  container.appendChild(rightSection);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildAvatar(user) {
  if (user.profile_img && isImageUrl(user.profile_img)) {
    const img = document.createElement('img');
    img.src = user.profile_img;
    img.alt = buildDisplayName(user);
    img.className = 'navbar-avatar';
    return img;
  }

  const placeholder = document.createElement('div');
  placeholder.className = 'navbar-avatar-placeholder';
  placeholder.textContent = initials(user.first_name, user.last_name);
  return placeholder;
}

function isImageUrl(url) {
  const lower = url.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lower.includes(ext));
}

function initials(firstName, lastName) {
  const a = (firstName || '').charAt(0);
  const b = (lastName || '').charAt(0);
  return (a + b).toUpperCase() || '?';
}

function buildDisplayName(user) {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.email || 'User';
}

function buildRoleLabel(user) {
  switch (user.role_id) {
    case ROLES.ADMIN:
      return 'Admin';
    case ROLES.PRC_STAFF:
      return user.branch_name ? `PRC ${user.branch_name}` : 'PRC Staff';
    case ROLES.VOLUNTEER:
      return 'Volunteer';
    case ROLES.PHLEBOTOMIST:
      return 'Phlebotomist';
    case ROLES.REQUESTOR:
      return 'Requestor';
    default:
      return '';
  }
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