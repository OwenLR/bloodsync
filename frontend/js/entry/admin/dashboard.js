/**
 * adminDashboard.js — Entry file for pages/admin/dashboard.html.
 *
 * Pattern: requireAuth → requireRole → renderNavbar → renderSidebar → feature init
 *
 * Path: frontend/js/entry/admin/dashboard.js
 */

import { requireAuth }             from '../../core/guards/authGuard.js';
import { requireRole }             from '../../core/guards/roleGuard.js';
import { renderNavbar }            from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }            from '../../layouts/sidebar.js';
import { getSidebarItems }         from '../../constants/sidebarItems.js';
import { ROLES }                   from '../../constants/roles.js';
import { initSocket }              from '../../core/socket.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.ADMIN])) return;

  // Navbar — unread count placeholder (0 until notifications feature is built)
  renderNavbar(user, 0);

  // Sidebar — Admin has two sections
  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'operations'), 'Operations');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  // Socket — Admin receives branch and global events
  initSocket(user);
}

init();