/**
 * sidebar.js — Sidebar navigation renderer for BloodSync web app.
 *
 * DESIGN NOTE (this session): visual redesign only. Same exports
 * (renderSidebar, clearSidebar), same item shapes consumed from
 * sidebarItems.js, same isActivePage logic, same "group with children"
 * data contract. No navigation item was added, removed, or renamed.
 *
 * What changed visually:
 * - Every link now carries a small icon (see layouts/icons.js), looked up
 *   by label — a group's own label maps to an icon too (e.g. "Donors").
 * - Group items ("Donors" for Staff, "Blood Drive Workflow" for
 *   Vol/Phleb) now render inside a bordered card, so everything under
 *   the group reads as visually contained — this was a direct ask, not
 *   just a style pass.
 * - A new opt-in `variant: 'steps'` flag on a group item (set in
 *   sidebarItems.js — additive metadata only, no href/label touched)
 *   renders its children as a connected numbered track instead of plain
 *   rows. Only "Blood Drive Workflow" uses this: it's the one group that
 *   is a literal ordered process (Register → Interview → Screening →
 *   Donation, same order as the app's own field-workflow step
 *   indicator) — "Donors" mixes a non-sequential "Donor List" entry with
 *   the same four steps, so it deliberately keeps the plain bordered
 *   style rather than being numbered too.
 * - Active link gets a left accent bar instead of a flat full-row tint.
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
 *   Group: { label: string, group: true, children: [{ label, href }], variant?: 'steps' }
 *
 * Usage:
 *   renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
 *   renderSidebar(getSidebarItems(user.role_id, 'workflow'), 'Workflow');
 *
 * Expects <aside id="sidebar"></aside> in the HTML page.
 * JS targets IDs — CSS targets classes.
 * Call renderSidebar() multiple times to append multiple sections.
 */

import { icon, labelIcon } from './icons.js';

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
 * Render a plain link item — icon + label, left accent bar when active.
 */
function renderFlatItem(item) {
  const li      = document.createElement('li');
  li.className  = 'sidebar-item';

  const a       = document.createElement('a');
  a.className   = 'sidebar-link';
  a.href        = item.href;
  a.appendChild(icon(labelIcon(item.label), 17));
  a.appendChild(textSpan(item.label));

  if (isActivePage(item.href)) {
    a.classList.add('sidebar-active');
    li.classList.add('sidebar-item-active');
  }

  li.appendChild(a);
  return li;
}

/**
 * Render a collapsible group as a bordered card using <details>/<summary>.
 * variant: 'steps' renders children as a connected numbered track instead
 * of plain icon rows — see file header for when that's appropriate.
 */
function renderGroup(item) {
  const li      = document.createElement('li');
  li.className  = 'sidebar-group-item';

  const details      = document.createElement('details');
  details.className  = 'sidebar-group';
  if (item.variant === 'steps') details.classList.add('sidebar-group--steps');

  const hasActiveChild = item.children.some(child => isActivePage(child.href));

  // openByDefault defaults to true if not specified (existing behavior).
  // A group containing the active page is always forced open, regardless
  // of openByDefault, so the current page is never hidden on load.
  const openByDefault = item.openByDefault !== false;
  details.open = openByDefault || hasActiveChild;

  if (hasActiveChild) {
    details.classList.add('sidebar-group-active');
  }

  const summary       = document.createElement('summary');
  summary.className   = 'sidebar-group-label';

  const summaryLeft     = document.createElement('span');
  summaryLeft.className = 'sidebar-group-label-left';
  summaryLeft.appendChild(icon(labelIcon(item.label), 17));
  summaryLeft.appendChild(textSpan(item.label));

  const chevron = icon('chevron', 14);
  chevron.classList.add('sidebar-group-chevron');

  summary.appendChild(summaryLeft);
  summary.appendChild(chevron);
  details.appendChild(summary);

  const childUl     = document.createElement('ul');
  childUl.className = item.variant === 'steps' ? 'sidebar-step-track' : 'sidebar-group-links';

  item.children.forEach((child, index) => {
    childUl.appendChild(
      item.variant === 'steps'
        ? renderStepChild(child, index + 1)
        : renderGroupChild(child)
    );
  });

  details.appendChild(childUl);
  li.appendChild(details);
  return li;
}

function renderGroupChild(child) {
  const childLi = document.createElement('li');
  childLi.className = 'sidebar-child';

  const a       = document.createElement('a');
  a.className   = 'sidebar-link sidebar-link--nested';
  a.href        = child.href;
  a.appendChild(icon(labelIcon(child.label), 15));
  a.appendChild(textSpan(child.label));

  if (isActivePage(child.href)) {
    a.classList.add('sidebar-active');
    childLi.classList.add('sidebar-item-active');
  }

  childLi.appendChild(a);
  return childLi;
}

function renderStepChild(child, stepNumber) {
  const childLi = document.createElement('li');
  childLi.className = 'step-item';

  const a       = document.createElement('a');
  a.className   = 'step-link';
  a.href        = child.href;

  const num       = document.createElement('span');
  num.className   = 'step-num';
  num.textContent = String(stepNumber);

  a.appendChild(num);
  a.appendChild(textSpan(child.label));

  if (isActivePage(child.href)) {
    a.classList.add('sidebar-active');
    childLi.classList.add('step-item-active');
  }

  childLi.appendChild(a);
  return childLi;
}

function textSpan(label) {
  const span = document.createElement('span');
  span.className = 'sidebar-link-text';
  span.textContent = label;
  return span;
}

function isActivePage(href) {
  return window.location.pathname === href.split('?')[0].split('#')[0];
}
