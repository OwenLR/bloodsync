// ─── js/entry/requestor/dashboard.js ─────────────────────────────────────────

import { requireAuth }        from '../../core/guards/authGuard.js';
import { requireRole }        from '../../core/guards/roleGuard.js';
import { renderNavbar }       from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }       from '../../layouts/sidebar.js';
import { revealAppShell }     from '../../layouts/appShell.js';
import { getSidebarItems }    from '../../constants/sidebarItems.js';
import { ROLES }              from '../../constants/roles.js';
import { initSocket }         from '../../core/socket.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.REQUESTOR])) return;

  renderNavbar(user, 0);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');

  revealAppShell();

  initSocket(user);
}

init();