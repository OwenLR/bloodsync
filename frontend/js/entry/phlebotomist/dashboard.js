/**
 * dashboard.js — Entry file for pages/phlebotomist/dashboard.html.
 *
 * Pattern: requireAuth → requireRole → renderNavbar → renderSidebar → feature init
 *
 * Path: frontend/js/entry/phlebotomist/dashboard.js
 */

import { requireAuth }      from '../../core/guards/authGuard.js';
import { requireRole }      from '../../core/guards/roleGuard.js';
import { renderNavbar }     from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }     from '../../layouts/sidebar.js';
import { getSidebarItems }  from '../../constants/sidebarItems.js';
import { ROLES }            from '../../constants/roles.js';
import { initSocket }       from '../../core/socket.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.PHLEBOTOMIST])) return;

  renderNavbar(user, 0);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'operations'), 'Operations');
  renderSidebar(getSidebarItems(user.role_id, 'drive'), 'My Drive');

  initSocket(user);
}

init();