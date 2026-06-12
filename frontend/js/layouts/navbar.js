/**
 * navbar.js — Top navigation bar for BloodSync web app.
 *
 * Responsibilities:
 * - Render the navbar based on the current user's role
 * - Fetch and display the unread notification badge count
 * - Handle logout button click
 *
 * Usage: call renderNavbar(user) in every protected page entry file
 * after requireAuth() and requireRole() pass.
 *
 * Example:
 *   import { renderNavbar } from '../layouts/navbar.js';
 *   const user = await requireAuth();
 *   await renderNavbar(user);
 *
 * Expects a <nav id="navbar"></nav> element in the HTML page.
 * JS targets IDs — CSS targets classes.
 */

import { apiFetch } from '../core/api.js';
import { logout }   from '../core/auth.js';
import { ROLES }    from '../constants/config.js';

// ---------------------------------------------------------------------------
// Nav items per role
// ---------------------------------------------------------------------------

const NAV_ITEMS = {
  [ROLES.ADMIN]: [
    { label: 'Dashboard',      href: '/pages/admin/dashboard.html'       },
    { label: 'Blood Drives',   href: '/pages/admin/blood-drives.html'    },
    { label: 'Donors',         href: '/pages/admin/donors.html'          },
    { label: 'Blood Units',    href: '/pages/admin/blood-units.html'     },
    { label: 'Blood Requests', href: '/pages/admin/blood-requests.html'  },
    { label: 'Users',          href: '/pages/admin/users.html'           },
    { label: 'Reports',        href: '/pages/admin/reports.html'         },
  ],
  [ROLES.PRC_STAFF]: [
    { label: 'Dashboard',      href: '/pages/staff/dashboard.html'       },
    { label: 'Blood Drives',   href: '/pages/staff/blood-drives.html'    },
    { label: 'Donors',         href: '/pages/staff/donors.html'          },
    { label: 'Blood Units',    href: '/pages/staff/blood-units.html'     },
    { label: 'Blood Requests', href: '/pages/staff/blood-requests.html'  },
    { label: 'Reports',        href: '/pages/staff/reports.html'         },
  ],
  [ROLES.VOLUNTEER]: [
    { label: 'Dashboard',      href: '/pages/volunteer/dashboard.html'   },
    { label: 'Donors',         href: '/pages/volunteer/donors.html'      },
  ],
  [ROLES.PHLEBOTOMIST]: [
    { label: 'Dashboard',      href: '/pages/phlebotomist/dashboard.html' },
    { label: 'Donors',         href: '/pages/phlebotomist/donors.html'    },
  ],
  [ROLES.REQUESTOR]: [
    { label: 'Dashboard',      href: '/pages/requestor/dashboard.html'   },
    { label: 'My Requests',    href: '/pages/requestor/requests.html'    },
  ],
};

// ---------------------------------------------------------------------------
// renderNavbar(user)
// ---------------------------------------------------------------------------

/**
 * Render the navbar into <nav id="navbar">.
 * Fetches unread notification count automatically.
 *
 * @param {object} user — current user object from requireAuth()
 */
export async function renderNavbar(user) {
  const container = document.getElementById('navbar');
  if (!container) return;

  const items    = NAV_ITEMS[user.role_id] || [];
  const badge    = await fetchUnreadCount();
  const fullName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user.email;

  container.innerHTML = `
    <div class="navbar-brand">
      <a href="/">BloodSync</a>
    </div>

    <ul class="navbar-links">
      ${items.map(item => `
        <li>
          <a href="${item.href}" class="${isActivePage(item.href) ? 'nav-active' : ''}">
            ${item.label}
          </a>
        </li>
      `).join('')}

      <li>
        <a href="${getNotificationsHref(user.role_id)}" class="${isActivePage(getNotificationsHref(user.role_id)) ? 'nav-active' : ''}">
          Notifications
          ${badge > 0 ? `<span id="notif-badge" class="notif-badge">${badge}</span>` : ''}
        </a>
      </li>
    </ul>

    <div class="navbar-user">
      <span class="navbar-username">${fullName}</span>
      <button id="btn-logout" class="btn-logout">Logout</button>
    </div>
  `;

  document.getElementById('btn-logout').addEventListener('click', handleLogout);
}

// ---------------------------------------------------------------------------
// updateBadge(count)
// Call this from feature files when a new notification socket event arrives.
// ---------------------------------------------------------------------------

/**
 * Update the notification badge count in the navbar without re-rendering.
 *
 * @param {number} count
 */
export function updateBadge(count) {
  const badge = document.getElementById('notif-badge');

  if (count > 0) {
    if (badge) {
      badge.textContent = count;
    } else {
      // Badge didn't exist before (was 0) — re-render the notifications link
      // by inserting a new badge span next to the notifications anchor
      const notifLink = document.querySelector('a[href*="notification"]');
      if (notifLink) {
        const span = document.createElement('span');
        span.id        = 'notif-badge';
        span.className = 'notif-badge';
        span.textContent = count;
        notifLink.appendChild(span);
      }
    }
  } else {
    // Count dropped to 0 — remove the badge
    if (badge) badge.remove();
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function fetchUnreadCount() {
  try {
    const res  = await apiFetch('/api/notifications/unread-count');
    if (!res || !res.ok) return 0;

    const body = await res.json();
    return body?.data?.count ?? 0;
  } catch {
    return 0;
  }
}

function handleLogout() {
  logout();
}

/**
 * Check if the given href matches the current page path.
 */
function isActivePage(href) {
  return window.location.pathname === href;
}

/**
 * Notifications page href by role.
 */
function getNotificationsHref(roleId) {
  const routes = {
    [ROLES.ADMIN]:        '/pages/admin/notifications.html',
    [ROLES.PRC_STAFF]:    '/pages/staff/notifications.html',
    [ROLES.VOLUNTEER]:    '/pages/volunteer/notifications.html',
    [ROLES.PHLEBOTOMIST]: '/pages/phlebotomist/notifications.html',
    [ROLES.REQUESTOR]:    '/pages/requestor/notifications.html',
  };

  return routes[roleId] || '/index.html';
}