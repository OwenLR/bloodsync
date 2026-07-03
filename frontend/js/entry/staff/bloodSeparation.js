import { requireAuth }     from '../../core/guards/authGuard.js';
import { requireRole }     from '../../core/guards/roleGuard.js';
import { renderNavbar }    from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }    from '../../layouts/sidebar.js';
import { revealAppShell }  from '../../layouts/appShell.js';
import { getSidebarItems } from '../../constants/sidebarItems.js';
import { ROLES }           from '../../constants/roles.js';
import { renderSeparationTable } from '../../features/bloodUnits/bloodSeparationUI.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  // Blood Separation is PRC Staff only — same scope decision as Blood
  // Testing / Blood Units / Inventory Cleaning. bloodUnitRoutes.js's
  // POST /:id/separate is checkRole([ADMIN, PRC_STAFF]) at the API level,
  // but no Admin page exists for this feature area by product decision.
  if (!requireRole(user, [ROLES.PRC_STAFF])) return;

  const unreadCount = 0;
  renderNavbar(user, unreadCount);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  revealAppShell();

  await renderSeparationTable(user.branch_id);
}

init();