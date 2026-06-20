/**
 * appShell.js — App shell reveal helper.
 *
 * Prevents raw, chrome-less HTML (table headers, page buttons, etc.) from
 * flashing on screen before the navbar/sidebar shell has rendered.
 *
 * Pairing:
 * - Every protected page's <body> starts with class="app-loading"
 *   (set directly in the HTML — see Protected Page Pattern in FRONTEND_NOTES.md)
 * - Entry files call revealAppShell() immediately after renderNavbar() +
 *   renderSidebar() complete, per "Required Page Loading Order" in
 *   FRONTEND_AI_RULES.md
 *
 * Does NOT:
 * - Touch navbar or sidebar content
 * - Know anything about roles, pages, or feature data
 * - Replace showSkeleton()/hideSkeleton() — this only controls the
 *   visibility of the shell + content area as a whole; skeletons still
 *   handle the loading state WITHIN the content area after it's revealed
 *
 * Usage:
 *   import { revealAppShell } from '../layouts/appShell.js';
 *   renderNavbar(user, 0);
 *   renderSidebar(getSidebarItems(user.role_id, 'operations'), 'Operations');
 *   revealAppShell();   // <-- call right after shell renders, before feature fetch
 */

export function revealAppShell() {
  document.body.classList.remove('app-loading');
  document.body.classList.add('app-ready');
}