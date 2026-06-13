/**
 * sidebar.js — Sidebar navigation renderer for BloodSync web app.
 *
 * Responsibilities:
 * - Render a sidebar section into <aside id="sidebar">
 * - Highlight the active page link
 *
 * Does NOT:
 * - Know anything about roles or pages
 * - Define navigation structure (that lives in constants/sidebarItems.js)
 * - Fetch any data
 * - Call any APIs
 *
 * Usage:
 *   import { renderSidebar }    from '../layouts/sidebar.js';
 *   import { getSidebarItems }  from '../constants/sidebarItems.js';
 *
 *   // Single section
 *   renderSidebar(getSidebarItems(user.role_id, 'operations'));
 *
 *   // Multiple sections with headings
 *   renderSidebar(getSidebarItems(user.role_id, 'operations'), 'Operations');
 *   renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');
 *
 * Expects <aside id="sidebar"></aside> in the HTML page.
 * JS targets IDs — CSS targets classes.
 * Call renderSidebar() multiple times to append multiple sections.
 */

// ---------------------------------------------------------------------------
// renderSidebar(items, heading)
// ---------------------------------------------------------------------------

/**
 * Render a sidebar section into <aside id="sidebar">.
 * Appends to existing content — call multiple times for multiple sections.
 *
 * @param {Array<{ label: string, href: string }>} items
 * @param {string} [heading] — optional section heading label
 */
export function renderSidebar(items, heading = '') {
  const container = document.getElementById('sidebar');
  if (!container || !items.length) return;

  const section     = document.createElement('div');
  section.className = 'sidebar-section';

  if (heading) {
    const h       = document.createElement('p');
    h.className   = 'sidebar-heading';
    h.textContent = heading;
    section.appendChild(h);
  }

  const ul     = document.createElement('ul');
  ul.className = 'sidebar-links';

  items.forEach(item => {
    const li      = document.createElement('li');
    const a       = document.createElement('a');
    a.href        = item.href;
    a.textContent = item.label;

    if (isActivePage(item.href)) {
      a.classList.add('sidebar-active');
    }

    li.appendChild(a);
    ul.appendChild(li);
  });

  section.appendChild(ul);
  container.appendChild(section);
}

/**
 * clearSidebar()
 * Wipe the sidebar contents — call before re-rendering on dynamic pages.
 */
export function clearSidebar() {
  const container = document.getElementById('sidebar');
  if (container) container.innerHTML = '';
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isActivePage(href) {
  return window.location.pathname === href.split('?')[0].split('#')[0];
}