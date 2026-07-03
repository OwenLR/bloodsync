// js/entry/staff/inventoryCleaning.js
//
// Entry file for pages/staff/inventoryCleaning.html — PRC Staff only.
// Follows the standard pattern from rules.md:
//   requireAuth → requireRole → navbar → sidebar → revealAppShell → feature init
//
// Staff-only page (not shared with Volunteer/Phlebotomist, not shared with
// Admin — see the Blood Units/Testing/Inventory scope correction in
// sessionState.md). Sidebar sections are 'general' + 'management' per
// rules.md's Sidebar Sections Per Role table for PRC Staff — no field-role
// branching needed here, unlike js/entry/field/*.js.
//
// NOTE: requireRole() comes from core/guards/roleGuard.js, which has not
// been uploaded/verified in this session — the exact call signature below
// is copied directly from the quoted example in rules.md, not from the
// raw file. If roleGuard.js's real signature differs, this will break.

import { requireAuth }               from '../../core/guards/authGuard.js';
import { requireRole }               from '../../core/guards/roleGuard.js';
import { renderNavbar }              from '../../layouts/navbar.js';
import { renderSidebar, clearSidebar } from '../../layouts/sidebar.js';
import { revealAppShell }            from '../../layouts/appShell.js';
import { getSidebarItems }           from '../../constants/sidebarItems.js';
import { ROLES }                     from '../../constants/roles.js';
import {
  renderCleaningTable,
  initSelectAllControl,
  initBulkRemoveButton,
} from '../../features/inventoryCleaning/inventoryCleaningUI.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.PRC_STAFF])) return;

  renderNavbar(user, 0);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'),    'General');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  revealAppShell(); // MUST be before any await — per architecture.md

  initSelectAllControl();
  initBulkRemoveButton();

  await renderCleaningTable(user.branch_id);
}

init();