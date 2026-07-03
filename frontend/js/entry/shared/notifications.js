/**
 * entry/shared/notifications.js — Notifications page entry.
 *
 * Shared across all 5 roles — logic and layout are identical (same
 * endpoints, same fields, no branch-locking or role-specific business
 * rules). Only the sidebar sections rendered differ by role. Per the
 * precedent set by Blood Drives (admin entry file reused as-is for
 * Staff) and Field entry files (role-branch for sidebar sections),
 * this is one shared entry file rather than 5 near-identical ones.
 *
 * All 5 pages/[role]/notifications.html point here:
 *   /js/entry/shared/notifications.js
 */

import { requireAuth }     from '../../core/guards/authGuard.js';
import { requireRole }     from '../../core/guards/roleGuard.js';
import { renderNavbar }    from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }    from '../../layouts/sidebar.js';
import { revealAppShell }  from '../../layouts/appShell.js';
import { getSidebarItems } from '../../constants/sidebarItems.js';
import { ROLES }           from '../../constants/roles.js';
import {
  renderNotificationsList,
  initMarkAllRead,
  refreshBadge,
} from '../../features/notifications/notificationsUI.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  // All 5 login roles can access notifications — notificationRoutes.js
  // allowedRoles is [ADMIN, PRC_STAFF, REQUESTOR, VOLUNTEER, PHLEBOTOMIST].
  if (!requireRole(user, [
    ROLES.ADMIN,
    ROLES.PRC_STAFF,
    ROLES.VOLUNTEER,
    ROLES.PHLEBOTOMIST,
    ROLES.REQUESTOR,
  ])) return;

  // Badge starts at 0 here — refreshBadge() below fetches the real count
  // right after the shell reveals, same pattern documented in navbar.js.
  renderNavbar(user, 0);

  clearSidebar();

  const isFieldRole = user.role_id === ROLES.VOLUNTEER || user.role_id === ROLES.PHLEBOTOMIST;

  if (isFieldRole) {
    renderSidebar(getSidebarItems(user.role_id, 'general'),  'General');
    renderSidebar(getSidebarItems(user.role_id, 'workflow'), 'Workflow');
    renderSidebar(getSidebarItems(user.role_id, 'drive'),    'My Drive');
  } else if (user.role_id === ROLES.REQUESTOR) {
    renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
  } else {
    // Admin, PRC Staff
    renderSidebar(getSidebarItems(user.role_id, 'general'),    'General');
    renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');
  }

  revealAppShell();

  initMarkAllRead();
  await renderNotificationsList();
  refreshBadge(); // non-blocking, updates navbar badge to the real unread count
}

init();