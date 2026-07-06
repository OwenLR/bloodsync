/**
 * js/entry/staff/settings.js — Entry file for the PRC Staff Settings page.
 *
 * Pattern: requireAuth → requireRole → renderNavbar → renderSidebar → revealAppShell → feature init
 */

import { requireAuth }          from '../../core/guards/authGuard.js';
import { requireRole }          from '../../core/guards/roleGuard.js';
import { renderNavbar }         from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }         from '../../layouts/sidebar.js';
import { revealAppShell }       from '../../layouts/appShell.js';
import { getSidebarItems }      from '../../constants/sidebarItems.js';
import { ROLES }                from '../../constants/roles.js';
import { initPasswordForm,
         initProfilePhotoForm } from '../../features/settings/settingsUI.js';
import { refreshBadge } from '../../features/notifications/notificationsUI.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.PRC_STAFF])) return;

  renderNavbar(user, 0);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  revealAppShell();
  refreshBadge(); // non-blocking, sets navbar badge to the real unread count

  // Settings forms are static — no async data fetch needed before render
  initPasswordForm();
  initProfilePhotoForm();
}

init();