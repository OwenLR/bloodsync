/**
 * sidebar.js — Sidebar navigation renderer for BloodSync web app.
 *
 * Responsibilities:
 * - Render a sidebar section into <aside id="sidebar">
 * - Highlight the active page link
 * - Render collapsible groups for items with { group: true, children: [] }
 *
 * Does NOT:
 * - Know anything about roles or pages
 * - Define navigation structure (that lives in constants/sidebarItems.js)
 * - Fetch any data
 * - Call any APIs
 *
 * Item shapes accepted:
 *   Flat:  { label: string, href: string }
 *   Group: { label: string, group: true, children: [{ label, href }] }
 *
 * Group items render as a <details>/<summary> collapsible block.
 * Groups are open by default — field roles navigate between workflow
 * steps constantly during a blood drive.
 *
 * Usage:
 *   renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
 *   renderSidebar(getSidebarItems(user.role_id, 'workflow'), 'Workflow');
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
 * @param {Array} items — flat or group items from getSidebarItems()
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
    if (item.group && Array.isArray(item.children)) {
      ul.appendChild(renderGroup(item));
    } else {
      ul.appendChild(renderFlatItem(item));
    }
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

/**
 * Render a plain link item.
 */
function renderFlatItem(item) {
  const li      = document.createElement('li');
  const a       = document.createElement('a');
  a.href        = item.href;
  a.textContent = item.label;

  if (isActivePage(item.href)) {
    a.classList.add('sidebar-active');
  }

  li.appendChild(a);
  return li;
}

/**
 * Render a collapsible group using <details>/<summary>.
 * Open by default. If any child is the active page, the group is also
 * marked active so users can see which step they're on.
 */
function renderGroup(item) {
  const li      = document.createElement('li');
  li.className  = 'sidebar-group-item';

  const details = document.createElement('details');

  // Check if any child is the current page — keep group open and styled
  const hasActiveChild = item.children.some(child => isActivePage(child.href));
  details.open = true; // always open by default for field role usability
  if (hasActiveChild) {
    details.classList.add('sidebar-group-active');
  }

  const summary     = document.createElement('summary');
  summary.className = 'sidebar-group-label';
  summary.textContent = item.label;
  details.appendChild(summary);

  const childUl     = document.createElement('ul');
  childUl.className = 'sidebar-group-links';

  item.children.forEach(child => {
    const childLi = document.createElement('li');
    const a       = document.createElement('a');
    a.href        = child.href;
    a.textContent = child.label;

    if (isActivePage(child.href)) {
      a.classList.add('sidebar-active');
    }

    childLi.appendChild(a);
    childUl.appendChild(childLi);
  });

  details.appendChild(childUl);
  li.appendChild(details);
  return li;
}

function isActivePage(href) {
  return window.location.pathname === href.split('?')[0].split('#')[0];
}