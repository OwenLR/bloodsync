import { requireAuth }       from '../../core/guards/authGuard.js';
import { requireRole }       from '../../core/guards/roleGuard.js';
import { renderNavbar }      from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }      from '../../layouts/sidebar.js';
import { revealAppShell }    from '../../layouts/appShell.js';
import { getSidebarItems }   from '../../constants/sidebarItems.js';
import { ROLES }             from '../../constants/roles.js';
import { initUserApprovalDetail } from '../../features/userManagement/userApprovalDetailUI.js';
import { refreshBadge }      from '../../features/notifications/notificationsUI.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.ADMIN])) return;

  renderNavbar(user, 0);
  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'),    'General');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  revealAppShell();
  refreshBadge();

  await initUserApprovalDetail();
}

init();