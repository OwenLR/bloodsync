import { requireAuth }     from '../../core/guards/authGuard.js';
import { requireRole }     from '../../core/guards/roleGuard.js';
import { renderNavbar }    from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }    from '../../layouts/sidebar.js';
import { revealAppShell }  from '../../layouts/appShell.js';
import { getSidebarItems } from '../../constants/sidebarItems.js';
import { ROLES }           from '../../constants/roles.js';
import { renderCollectionsTable, initStatusFilter } from '../../features/bloodCollections/bloodCollectionsUI.js';
import { refreshBadge } from '../../features/notifications/notificationsUI.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  // Blood Testing is PRC Staff only — Admin, Vol, Phleb are excluded.
  // bloodCollectionRoutes.js: GET routes are checkRole([ADMIN, PRC_STAFF]),
  // but per project direction this feature is staff-only at the frontend
  // level — no admin variant of this page exists.
  if (!requireRole(user, [ROLES.PRC_STAFF])) return;

  const unreadCount = 0;
  renderNavbar(user, unreadCount);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  revealAppShell();
  refreshBadge(); // non-blocking, sets navbar badge to the real unread count

  initStatusFilter();
  await renderCollectionsTable(user.branch_id);
}

init();