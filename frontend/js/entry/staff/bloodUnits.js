import { requireAuth }     from '../../core/guards/authGuard.js';
import { requireRole }     from '../../core/guards/roleGuard.js';
import { renderNavbar }    from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }    from '../../layouts/sidebar.js';
import { revealAppShell }  from '../../layouts/appShell.js';
import { getSidebarItems } from '../../constants/sidebarItems.js';
import { ROLES }           from '../../constants/roles.js';
import { renderUnitsTable } from '../../features/bloodUnits/bloodUnitsUI.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  // Blood Units (Main Inventory) is PRC Staff only — Admin, Vol, Phleb are
  // excluded. bloodUnitRoutes.js: GET routes are checkRole([ADMIN, PRC_STAFF]),
  // but per project direction this feature area is staff-only at the frontend
  // level — no admin variant of this page exists. Separate (Section 4) is a
  // distinct page/feature, not part of this one.
  if (!requireRole(user, [ROLES.PRC_STAFF])) return;

  const unreadCount = 0;
  renderNavbar(user, unreadCount);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  revealAppShell();

  await renderUnitsTable(user.branch_id);
}

init();