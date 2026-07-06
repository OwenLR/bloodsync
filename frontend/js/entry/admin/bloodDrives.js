import { requireAuth }     from '../../core/guards/authGuard.js';
import { requireRole }     from '../../core/guards/roleGuard.js';
import { renderNavbar }    from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }    from '../../layouts/sidebar.js';
import { revealAppShell }  from '../../layouts/appShell.js';
import { getSidebarItems } from '../../constants/sidebarItems.js';
import { ROLES }           from '../../constants/roles.js';
import { ROUTES }          from '../../constants/routes.js';
import { renderDrivesTable, initParticipantPanel } from '../../features/bloodDrives/bloodDrivesUI.js';
import { refreshBadge } from '../../features/notifications/notificationsUI.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  // Both Admin and PRC Staff can view and manage blood drives (bloodsync.md item 1)
  if (!requireRole(user, [ROLES.ADMIN, ROLES.PRC_STAFF])) return;

  const unreadCount = 0;
  renderNavbar(user, unreadCount);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  revealAppShell();
  refreshBadge(); // non-blocking, sets navbar badge to the real unread count

  // Set the "New Drive" link to the correct role's create page
  const newDriveLink = document.getElementById('new-drive-link');
  if (newDriveLink) {
    newDriveLink.href = user.role_id === ROLES.ADMIN
      ? ROUTES.ADMIN.BLOOD_DRIVE_CREATE
      : ROUTES.STAFF.BLOOD_DRIVE_CREATE;
  }

  initParticipantPanel();
  await renderDrivesTable(user);
}

init();