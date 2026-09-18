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
  getInventoryReport,
  getDonorsReport,
  getDrivesReport,
  getTestingReport,
  getRequestsReport,
} from '../../features/reports/reportsApi.js';

import {
  initReportTabs,
  renderInventoryReport,
  renderDonorsReport,
  renderDrivesReport,
  renderTestingReport,
  renderRequestsReport,
} from '../../features/reports/reportsUI.js';

import { initReportPrint } from '../../features/reports/reportPrintUI.js';   

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.PRC_STAFF])) return;

  renderNavbar(user, 0);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  revealAppShell();
  refreshBadge();      // non-blocking
  initReportPrint(); 

  initReportTabs({
    inventory: { label: 'Inventory',      load: getInventoryReport, render: renderInventoryReport },
    donors:    { label: 'Donors',         load: getDonorsReport,    render: renderDonorsReport },
    drives:    { label: 'Blood Drives',   load: getDrivesReport,    render: renderDrivesReport },
    testing:   { label: 'Blood Testing',  load: getTestingReport,   render: renderTestingReport },
    requests:  { label: 'Blood Requests', load: getRequestsReport,  render: renderRequestsReport },
  }, 'inventory');
}

init();