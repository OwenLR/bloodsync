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
    renderKpis(inventory, requests, donors);
    renderCharts(inventory, requests);
    renderUpcomingDrives(drives);
    renderQuickActions();
    showContent();
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

  const lowStockCount = inventory.stock_by_type.filter(s => s.low_stock).length;
  const statPending = requests.urgency_breakdown_active
    .find(u => u.urgency_level === 'STAT')?.count || 0;

  const kpis = [
    {
      label: 'Units Expiring Soon',
      value: inventory.expiry.near_expiry_count,
      href: ROUTES.STAFF.INVENTORY_CLEANING,
      alert: inventory.expiry.near_expiry_count > 0,
    },
    {
      label: 'Low-Stock Blood Types',
      value: lowStockCount,
      href: ROUTES.STAFF.BLOOD_UNITS,
      alert: lowStockCount > 0,
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

function renderCharts(inventory, requests) {
  // Stock by blood type — aggregated across components (a raw per-
  // blood-type-per-component breakdown can run to 20-30+ bars, too
  // cramped for a dashboard glance; the full breakdown already lives on
  // the Reports page). A type is flagged red if ANY of its components
  // are low stock.
  const aggregated = aggregateStockByType(inventory.stock_by_type);
  toggleChartEmpty('chart-stock-by-type', aggregated.length === 0);
  if (aggregated.length > 0) {
    renderBarChart('chart-stock-by-type', {
      labels: aggregated.map(a => a.bloodType),
      data: aggregated.map(a => a.total),
      color: aggregated.map(a => a.lowStock ? STOCK_COLOR_LOW : STOCK_COLOR_NORMAL),
    });
  }

  // Active request urgency split
  const urgency = requests.urgency_breakdown_active;
  toggleChartEmpty('chart-request-urgency', urgency.length === 0);
  if (urgency.length > 0) {
    renderDoughnutChart('chart-request-urgency', {
      labels: urgency.map(u => u.urgency_level),
      data: urgency.map(u => u.count),
      colors: urgency.map(u => u.urgency_level === 'STAT' ? '#c00' : '#607d8b'),
    });
  }
}

function aggregateStockByType(stockByType) {
  const map = new Map();
  stockByType.forEach(row => {
    const existing = map.get(row.blood_type) || { total: 0, lowStock: false };
    existing.total += row.units_available;
    existing.lowStock = existing.lowStock || row.low_stock;
    map.set(row.blood_type, existing);
  });

  return BLOOD_TYPE_ORDER
    .filter(bt => map.has(bt))
    .map(bt => ({ bloodType: bt, ...map.get(bt) }));
}

function toggleChartEmpty(canvasId, isEmpty) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const wrapper = canvas.closest('.chart-card');
  let emptyEl = wrapper.querySelector('.chart-empty-state');

  if (isEmpty) {
    canvas.style.display = 'none';
    if (!emptyEl) {
      emptyEl = document.createElement('p');
      emptyEl.className = 'chart-empty-state';
      emptyEl.textContent = 'No data yet.';
      wrapper.appendChild(emptyEl);
    }
  } else {
    canvas.style.display = '';
    if (emptyEl) emptyEl.remove();
  }
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