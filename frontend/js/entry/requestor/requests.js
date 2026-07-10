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
  renderRequestsList,
  initRequestStatusListener,
} from '../../features/bloodRequests/bloodRequestsListUI.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.REQUESTOR])) return;

  renderNavbar(user, 0);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');

  revealAppShell();

  refreshBadge(); // non-blocking, per Permanent Rules

  // initSocket must be awaited before attaching the listener — otherwise
  // `socket` (a live module binding in socket.js) may still be null at the
  // moment initRequestStatusListener() runs, and the listener never attaches.
  await initSocket(user);
  initRequestStatusListener();

  await renderRequestsList();
}

init();