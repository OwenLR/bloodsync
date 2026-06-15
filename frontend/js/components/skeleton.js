/**
 * skeleton.js — Loading skeleton component for BloodSync web app.
 *
 * Responsibilities:
 * - showSkeleton()   — inject skeleton placeholder into a container
 * - hideSkeleton()   — remove skeleton and show real content
 *
 * Does NOT:
 * - Fetch any data
 * - Know anything about business logic
 *
 * Usage:
 *   import { showSkeleton, hideSkeleton } from '../components/skeleton.js';
 *
 *   showSkeleton('donor-list', 5);          // 5 row skeletons
 *   showSkeleton('donor-table', 5, 'table', 7); // 5-row table skeleton, 7 columns
 *   const data = await loadDonors();
 *   hideSkeleton('donor-list');
 *   renderDonors(data);
 *
 * Skeleton types: 'rows' | 'card' | 'table'
 */

// ---------------------------------------------------------------------------
// showSkeleton(containerId, count, type)
// ---------------------------------------------------------------------------

/**
 * Inject skeleton placeholders into a container element.
 *
 * @param {string} containerId
 * @param {number} count   — number of skeleton items to show (default 3)
 * @param {'rows'|'card'|'table'} type — skeleton layout type (default 'rows')
 * @param {number} columns — number of columns for table skeletons (default 4)
 *                           ignored for 'rows' and 'card' types
 */
export function showSkeleton(containerId, count = 3, type = 'rows', columns = 4) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  const builders = {
    rows:  () => buildRowSkeleton(),
    card:  () => buildCardSkeleton(),
    table: () => buildTableSkeleton(columns),
  };

  const build = builders[type] || builders.rows;

  for (let i = 0; i < count; i++) {
    container.appendChild(build());
  }
}

// ---------------------------------------------------------------------------
// hideSkeleton(containerId)
// ---------------------------------------------------------------------------

/**
 * Remove skeleton placeholders from a container.
 * The caller is responsible for rendering real content afterward.
 *
 * @param {string} containerId
 */
export function hideSkeleton(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const skeletons = container.querySelectorAll('.skeleton-item');
  skeletons.forEach(el => el.remove());
}

// ---------------------------------------------------------------------------
// Skeleton builders
// ---------------------------------------------------------------------------

function buildRowSkeleton() {
  const item     = document.createElement('div');
  item.className = 'skeleton-item skeleton-row';

  const line1     = document.createElement('div');
  line1.className = 'skeleton-line skeleton-line-wide';

  const line2     = document.createElement('div');
  line2.className = 'skeleton-line skeleton-line-narrow';

  item.appendChild(line1);
  item.appendChild(line2);
  return item;
}

function buildCardSkeleton() {
  const item     = document.createElement('div');
  item.className = 'skeleton-item skeleton-card';

  const img     = document.createElement('div');
  img.className = 'skeleton-avatar';

  const lines     = document.createElement('div');
  lines.className = 'skeleton-lines';

  const line1     = document.createElement('div');
  line1.className = 'skeleton-line skeleton-line-wide';

  const line2     = document.createElement('div');
  line2.className = 'skeleton-line skeleton-line-medium';

  lines.appendChild(line1);
  lines.appendChild(line2);
  item.appendChild(img);
  item.appendChild(lines);
  return item;
}

function buildTableSkeleton(columns = 4) {
  const item     = document.createElement('div');
  item.className = 'skeleton-item skeleton-table-row';

  for (let i = 0; i < columns; i++) {
    const cell     = document.createElement('div');
    cell.className = 'skeleton-cell';
    item.appendChild(cell);
  }

  return item;
}