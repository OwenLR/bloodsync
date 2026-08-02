/**
 * staffDashboardUI.js — PRC Staff Dashboard.
 *
 * Data sources, all reused directly (no new dashboardApi.js file, same
 * "feature-to-feature API reuse" pattern as adminDashboardUI.js):
 *   - reportsApi.js: getInventoryReport, getRequestsReport, getDonorsReport
 *     — all three already branch-scope correctly server-side for Staff
 *     (see reportService.js's branchIdFor()).
 *   - bloodDrivesApi.js: getAllDrives — used for the "Upcoming Drives at
 *     Your Branch" list. contract.md does NOT document GET /api/blood-drives
 *     as branch-scoped for Staff (unlike Blood Units/Blood Requests, which
 *     each got an explicit, documented branch-scoping fix — gochas.md #34,
 *     #42). Rather than assume it's scoped, this file filters client-side
 *     by the logged-in Staff user's branch_id. If a future session confirms
 *     the backend already scopes this route, the client filter is harmless
 *     (a no-op) — but don't remove it without that confirmation.
 *
 * DOM + rendering only — never calls apiFetch directly.
 *
 * Framing is deliberately different from Admin's dashboard: "what needs
 * my attention today" rather than "system health" — alert-toned KPIs,
 * branch-specific, action-oriented.
 */

import { getInventoryReport, getRequestsReport, getDonorsReport } from '../reports/reportsApi.js';
import { getAllDrives } from '../bloodDrives/bloodDrivesApi.js';
import { renderBarChart, renderDoughnutChart } from '../../components/chartHelper.js';
import { ROUTES } from '../../constants/routes.js';

// Fixed display order matching contract.md's Blood Types enum, rather than
// whatever order the DB happens to return.
const BLOOD_TYPE_ORDER = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

const STOCK_COLOR_NORMAL = '#2196f3';
const STOCK_COLOR_LOW    = '#c00';

let currentUser = null;

export async function initStaffDashboard(user) {
  currentUser = user;
  showSkeleton();
  try {
    const [inventory, requests, donors, drives] = await Promise.all([
      getInventoryReport(),
      getRequestsReport(),
      getDonorsReport(),
      getAllDrives(),
    ]);
    hideSkeleton();
    showContent();
    // showContent() must run before renderCharts() — #dashboard-content
    // starts as display:none in dashboard.html, and Chart.js measures its
    // canvas's parent size at construction time. Building the charts while
    // still hidden makes Chart.js fall back to the canvas's native default
    // size (150px tall) instead of filling .chart-canvas-wrap's 220px,
    // which is what caused the "chart sits high, gap below" rendering bug.
    renderKpis(inventory, requests, donors);
    renderCharts(inventory, requests);
    renderUpcomingDrives(drives);
    renderQuickActions();
  } catch (err) {
    hideSkeleton();
    showError();
  }
}

// ── Loading / error states ─────────────────────────────────────────────

function showSkeleton() {
  document.getElementById('dashboard-skeleton').style.display = '';
  document.getElementById('dashboard-content').style.display = 'none';
  document.getElementById('dashboard-error').textContent = '';
}

function hideSkeleton() {
  document.getElementById('dashboard-skeleton').style.display = 'none';
}

function showContent() {
  document.getElementById('dashboard-content').style.display = '';
}

function showError() {
  const el = document.getElementById('dashboard-error');
  el.textContent = '';

  const msg = document.createElement('p');
  msg.textContent = "We couldn't load the dashboard. This may be a temporary connection issue. Please try again.";

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'btn-retry';
  retryBtn.textContent = 'Retry';
  retryBtn.addEventListener('click', () => initStaffDashboard(currentUser));

  el.appendChild(msg);
  el.appendChild(retryBtn);
}

// ── KPI row ───────────────────────────────────────────────────────────
// All four are alert-toned where relevant — this dashboard is meant to
// surface "needs attention today," not celebrate totals.

function renderKpis(inventory, requests, donors) {
  const container = document.getElementById('kpi-row');
  container.textContent = '';

  // Total Available units, branch-scoped same as everything else on this
  // dashboard. inventory.status_breakdown already comes back from the report
  // (getInventoryStatusBreakdown) but wasn't being read anywhere on this page —
  // its 'Available' row is exactly this count (already excludes expired units,
  // since that query relabels status='Available' + past-expiration rows as
  // 'Expired' server-side).
  const availableUnits = inventory.status_breakdown
    .find(s => s.status === 'Available')?.count || 0;

  const statPending = requests.urgency_breakdown_active
    .find(u => u.urgency_level === 'STAT')?.count || 0;

  const kpis = [
    {
      label: 'Available Units',
      value: availableUnits,
      href: ROUTES.STAFF.BLOOD_UNITS,
    },
    {
      label: 'Units Expiring Soon',
      value: inventory.expiry.near_expiry_count,
      href: ROUTES.STAFF.INVENTORY_CLEANING,
      alert: inventory.expiry.near_expiry_count > 0,
    },
    {
      // Replaces the old "Low-Stock Blood Types" KPI (a bare count of
      // distinct types below threshold wasn't actionable enough as a
      // standalone number — see chat discussion). inventory.inbound
      // already comes back from the report (getInventoryInboundTotals)
      // but wasn't being read anywhere on this page.
      label: 'New Units Added This Week',
      value: inventory.inbound.this_week,
      href: ROUTES.STAFF.BLOOD_UNITS,
    },
    {
      label: 'STAT Requests Pending',
      value: statPending,
      href: ROUTES.STAFF.BLOOD_REQUESTS,
      alert: statPending > 0,
    },
    {
      label: "Today's Donations",
      value: donors.donations.today,
      href: null,
    },
  ];

  kpis.forEach(kpi => container.appendChild(renderKpiCard(kpi)));
}

function renderKpiCard({ label, value, href, alert }) {
  const el = document.createElement(href ? 'a' : 'div');
  el.className = 'kpi-card' + (alert ? ' kpi-card--alert' : '');
  if (href) el.href = href;

  const valueEl = document.createElement('div');
  valueEl.className = 'kpi-value';
  valueEl.textContent = value;

  const labelEl = document.createElement('div');
  labelEl.className = 'kpi-label';
  labelEl.textContent = label;

  el.appendChild(valueEl);
  el.appendChild(labelEl);
  return el;
}

// ── Charts ────────────────────────────────────────────────────────────

// Fixed order for the urgency doughnut — matches contract.md's Urgency enum
// (Routine | STAT), STAT first since it's the more actionable category.
const URGENCY_ORDER = ['STAT', 'Routine'];

function renderCharts(inventory, requests) {
  // Stock by blood type — aggregated across components (a raw per-
  // blood-type-per-component breakdown can run to 20-30+ bars, too
  // cramped for a dashboard glance; the full breakdown already lives on
  // the Reports page). A type is flagged red if ANY of its components
  // are low stock, OR if it has zero available units at all (see
  // aggregateStockByType's comment below).
  //
  // Always renders all 8 blood types, even ones with 0 units — a type
  // silently missing from the chart reads as "no data for this type yet"
  // rather than "zero in stock," which is the opposite of what staff need
  // to notice. Same reasoning applies to the urgency chart below — an
  // empty state hides the fact that today happens to have 0 STAT/Routine
  // requests, which is itself useful information, not an error state.
  const aggregated = aggregateStockByType(inventory.stock_by_type);
  renderBarChart('chart-stock-by-type', {
    labels: aggregated.map(a => a.bloodType),
    data: aggregated.map(a => a.total),
    color: aggregated.map(a => a.lowStock ? STOCK_COLOR_LOW : STOCK_COLOR_NORMAL),
  });

  // Active request urgency split — always both categories, 0 if absent.
  const urgency = buildUrgencyData(requests.urgency_breakdown_active);
  const totalUrgency = urgency.reduce((sum, u) => sum + u.count, 0);

  if (totalUrgency === 0) {
    // Chart.js draws no arcs at all for all-zero doughnut data — the ring
    // disappears entirely and only the legend labels are left floating,
    // which reads as broken rather than "zero requests." Render a full
    // neutral-grey ring as a placeholder instead (data: [1, 1] so it's a
    // real, visible ring, not real counts — showTooltip: false so hovering
    // it doesn't show a misleading "STAT: 1"), plus a caption underneath
    // making the zero reading explicit in words.
    renderDoughnutChart('chart-request-urgency', {
      labels: urgency.map(u => u.urgency_level),
      data: [1, 1],
      colors: ['#e0e0e0', '#e0e0e0'],
      showTooltip: false,
    });
  } else {
    renderDoughnutChart('chart-request-urgency', {
      labels: urgency.map(u => u.urgency_level),
      data: urgency.map(u => u.count),
      colors: urgency.map(u => u.urgency_level === 'STAT' ? '#c00' : '#607d8b'),
    });
  }
  toggleUrgencyEmptyCaption(totalUrgency === 0);
}

function toggleUrgencyEmptyCaption(show) {
  const canvas = document.getElementById('chart-request-urgency');
  if (!canvas) return;
  const wrapper = canvas.closest('.chart-card');
  let caption = wrapper.querySelector('.chart-empty-caption');

  if (show) {
    if (!caption) {
      caption = document.createElement('p');
      caption.className = 'chart-empty-caption';
      caption.textContent = 'No active requests today.';
      wrapper.appendChild(caption);
    }
  } else if (caption) {
    caption.remove();
  }
}

function buildUrgencyData(urgencyBreakdownActive) {
  const map = new Map(urgencyBreakdownActive.map(u => [u.urgency_level, u.count]));
  return URGENCY_ORDER.map(level => ({ urgency_level: level, count: map.get(level) || 0 }));
}

function aggregateStockByType(stockByType) {
  const map = new Map();
  stockByType.forEach(row => {
    const existing = map.get(row.blood_type) || { total: 0, lowStock: false };
    existing.total += row.units_available;
    existing.lowStock = existing.lowStock || row.low_stock;
    map.set(row.blood_type, existing);
  });

  return BLOOD_TYPE_ORDER.map(bt => {
    const existing = map.get(bt);
    if (existing) return { bloodType: bt, ...existing };
    // No row at all for this blood type = zero available units across every
    // component. That's the worst case, not a "no data" case — flag it as
    // low stock too, not just types that have some stock but below
    // LOW_STOCK_THRESHOLD.
    return { bloodType: bt, total: 0, lowStock: true };
  });
}

// ── Upcoming Drives at Your Branch ──────────────────────────────────────

function renderUpcomingDrives(drives) {
  const container = document.getElementById('upcoming-drives-list');
  container.textContent = '';

  const branchDrives = drives
    .filter(d => d.branch_id === currentUser.branch_id)
    .filter(d => d.status === 'Upcoming' || d.status === 'Ongoing')
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    .slice(0, 5);

  if (branchDrives.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'chart-empty-state';
    empty.textContent = 'No upcoming drives at your branch.';
    container.appendChild(empty);
    return;
  }

  branchDrives.forEach(drive => {
    const item = document.createElement('a');
    item.className = 'drive-list-item';
    item.href = ROUTES.STAFF.BLOOD_DRIVES;

    const dateEl = document.createElement('div');
    dateEl.className = 'drive-list-date';
    dateEl.textContent = formatDriveDate(drive.start_datetime);

    const infoEl = document.createElement('div');
    infoEl.className = 'drive-list-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'drive-list-name';
    nameEl.textContent = drive.name;

    const venueEl = document.createElement('div');
    venueEl.className = 'drive-list-venue';
    venueEl.textContent = drive.venue_name || '';

    infoEl.appendChild(nameEl);
    infoEl.appendChild(venueEl);

    const statusEl = document.createElement('span');
    statusEl.className = 'status-badge status-badge--' + drive.status.toLowerCase();
    statusEl.textContent = drive.status;

    item.appendChild(dateEl);
    item.appendChild(infoEl);
    item.appendChild(statusEl);
    container.appendChild(item);
  });
}

function formatDriveDate(isoDatetime) {
  const d = new Date(isoDatetime);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Quick actions ─────────────────────────────────────────────────────

function renderQuickActions() {
  const container = document.getElementById('quick-actions');
  container.textContent = '';

  const heading = document.createElement('h2');
  heading.className = 'quick-actions-heading';
  heading.textContent = 'Quick Actions';
  container.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'quick-actions-list';

  const actions = [
    { label: 'Register Walk-in Donor', href: ROUTES.FIELD.REGISTER },
    { label: 'Blood Testing Queue',    href: ROUTES.STAFF.BLOOD_COLLECTIONS },
    { label: 'Blood Requests',         href: ROUTES.STAFF.BLOOD_REQUESTS },
  ];

  actions.forEach(a => {
    const link = document.createElement('a');
    link.href = a.href;
    link.className = 'btn-secondary';
    link.textContent = a.label;
    list.appendChild(link);
  });

  container.appendChild(list);
}