import { requireAuth }     from '../../core/guards/authGuard.js';
import { requireRole }     from '../../core/guards/roleGuard.js';
import { renderNavbar }    from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }    from '../../layouts/sidebar.js';
import { revealAppShell }  from '../../layouts/appShell.js';
import { getSidebarItems } from '../../constants/sidebarItems.js';
import { ROLES }           from '../../constants/roles.js';
import { initSocket }      from '../../core/socket.js';
import { refreshBadge }    from '../../features/notifications/notificationsUI.js';
import {
  renderRequestsTable,
  initTabs,
  initNewRequestListener,
} from '../../features/bloodRequests/bloodRequestsManageUI.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  // Blood Requests management is PRC Staff only — Admin excluded per this
  // session's decision (Requestor ↔ Staff only, no Admin variant of this page).
  if (!requireRole(user, [ROLES.PRC_STAFF])) return;

  renderNavbar(user, 0);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  revealAppShell();
  refreshBadge();

  await initSocket(user);
  initNewRequestListener();

  initTabs();
  await renderRequestsTable();
}

init();