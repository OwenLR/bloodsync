import { requireAuth }     from '../../core/guards/authGuard.js';
import { requireRole }     from '../../core/guards/roleGuard.js';
import { renderNavbar }    from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }    from '../../layouts/sidebar.js';
import { revealAppShell }  from '../../layouts/appShell.js';
import { getSidebarItems } from '../../constants/sidebarItems.js';
import { ROLES }           from '../../constants/roles.js';
import { renderAssignments, initTabs } from '../../features/bloodDrives/bloodDriveAssignmentUI.js';
import { refreshBadge }    from '../../features/notifications/notificationsUI.js';

// Shared by both pages/volunteer/drive.html and pages/phlebotomist/drive.html
// — identical logic, no branch-locking, no role-specific business rules,
// same "Shared entry file pattern" as entry/shared/notifications.js
// (see sessionState.md Permanent Rules).

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST])) return;

  const unreadCount = 0;
  renderNavbar(user, unreadCount);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
  renderSidebar(getSidebarItems(user.role_id, 'workflow'), 'Workflow');
  renderSidebar(getSidebarItems(user.role_id, 'drive'), 'My Drive');

  revealAppShell(); // MUST be before any await, per architecture.md
  refreshBadge();   // non-blocking, sets navbar badge to real unread count

  initTabs();
  await renderAssignments();
}

init();