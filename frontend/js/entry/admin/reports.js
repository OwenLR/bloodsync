import { requireAuth }     from '../../core/guards/authGuard.js';
import { requireRole }     from '../../core/guards/roleGuard.js';
import { renderNavbar }    from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }    from '../../layouts/sidebar.js';
import { revealAppShell }  from '../../layouts/appShell.js';
import { getSidebarItems } from '../../constants/sidebarItems.js';
import { ROLES }           from '../../constants/roles.js';
import { refreshBadge }    from '../../features/notifications/notificationsUI.js';

import {
  getUsersReport,
  getDonorsReport,
  getDrivesReport,
} from '../../features/reports/reportsApi.js';

import {
  initReportTabs,
  renderUsersReport,
  renderDonorsReport,
  renderDrivesReport,
} from '../../features/reports/reportsUI.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  // Admin's Reports page is intentionally narrower than Staff's — only
  // Users/Donors/Drives. Inventory/Testing/Requests are excluded here even
  // though reportRoutes.js's checkRole([ADMIN, PRC_STAFF]) would technically
  // let Admin call /donors and /drives (those two ARE shared, hence
  // included) — but /inventory, /testing, /requests are checkRole([PRC_STAFF])
  // only at the route level, matching the existing permanent rule that Admin
  // has no page for Blood Units/Testing/Requests anywhere in the app.
  if (!requireRole(user, [ROLES.ADMIN])) return;

  renderNavbar(user, 0);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  revealAppShell();
  refreshBadge(); // non-blocking

  initReportTabs({
    users:   { label: 'Users',        load: getUsersReport,  render: renderUsersReport },
    donors:  { label: 'Donors',       load: getDonorsReport, render: renderDonorsReport },
    drives:  { label: 'Blood Drives', load: getDrivesReport, render: renderDrivesReport },
  }, 'users');
}

init();