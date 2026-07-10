import { requireAuth }       from '../../core/guards/authGuard.js';
import { requireRole }       from '../../core/guards/roleGuard.js';
import { renderNavbar }      from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }      from '../../layouts/sidebar.js';
import { revealAppShell }    from '../../layouts/appShell.js';
import { getSidebarItems }   from '../../constants/sidebarItems.js';
import { ROLES }             from '../../constants/roles.js';
import { refreshBadge }      from '../../features/notifications/notificationsUI.js';
import { renderRequestDetail } from '../../features/bloodRequests/bloodRequestDetailUI.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.PRC_STAFF])) return;

  renderNavbar(user, 0);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  revealAppShell();
  refreshBadge();

  // First page in the app using a query-string param instead of a modal —
  // Gmail-style click-through-to-detail, per this session's design decision.
  const params    = new URLSearchParams(window.location.search);
  const requestId = params.get('id');

  if (!requestId) {
    document.getElementById('detail-error').textContent = 'No request specified.';
    document.getElementById('detail-skeleton').style.display = 'none';
    return;
  }

  await renderRequestDetail(requestId);
}

init();