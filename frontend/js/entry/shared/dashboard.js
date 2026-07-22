// js/entry/shared/dashboard.js
// Shared by both pages/volunteer/dashboard.html and
// pages/phlebotomist/dashboard.html. Same "shared entry file" pattern
// already used for entry/shared/driveAssignment.js and
// entry/shared/notifications.js, since both roles have identical
// dashboard logic and layout.

import { requireAuth }         from '../../core/guards/authGuard.js';
import { requireRole }         from '../../core/guards/roleGuard.js';
import { renderNavbar }        from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }        from '../../layouts/sidebar.js';
import { revealAppShell }      from '../../layouts/appShell.js';
import { getSidebarItems }     from '../../constants/sidebarItems.js';
import { ROLES }               from '../../constants/roles.js';
import { initSocket }          from '../../core/socket.js';
import { refreshBadge }        from '../../features/notifications/notificationsUI.js';
import { initFieldDashboard }  from '../../features/dashboard/fieldDashboardUI.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST])) return;

  renderNavbar(user, 0);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'),  'General');
  renderSidebar(getSidebarItems(user.role_id, 'workflow'), 'Workflow');
  renderSidebar(getSidebarItems(user.role_id, 'drive'),    'My Drive');

  revealAppShell();

  refreshBadge(); // non-blocking, sets navbar badge to the real unread count
  initSocket(user);

  initFieldDashboard(user); // non-blocking, handles its own skeleton/error states
}

init();