/**
 * adminDashboardUI.js — Admin Dashboard.
 *
 * Data source: reportsApi.js's getUsersReport/getDonorsReport/getDrivesReport
 * — reused directly rather than duplicated into a new dashboardApi.js file,
 * per the project's "feature-to-feature API reuse" pattern (same precedent
 * as bloodSeparationUI.js importing bloodUnitsApi.js directly when a new
 * feature has no unique API surface of its own). No new backend endpoints
 * were needed for this dashboard.
 *
 * DOM + rendering only — never calls apiFetch directly; reportsApi.js
 * already wraps it.
 *
 * Distinct from the Reports page on purpose: KPI cards + a small set of
 * synthesized charts for at-a-glance decision-making, not the full
 * tab-per-entity breakdown Reports gives. See dashboard design notes
 * discussed in-session for the reasoning per section below.
 */

import { getUsersReport, getDonorsReport, getDrivesReport } from '../reports/reportsApi.js';
import { renderBarChart, renderDoughnutChart, renderLineChart } from '../../components/chartHelper.js';
import { ROUTES } from '../../constants/routes.js';

// role_id 3 (Donor) intentionally excluded from the role-composition chart —
// Donor is never a login role (see gochas.md #5), so it would only ever
// show as a confusing zero/near-zero slice.
const ROLE_LABELS = {
  1: 'Admin',
  2: 'PRC Staff',
  4: 'Requestor',
  5: 'Volunteer',
  6: 'Phlebotomist',
};

export async function initAdminDashboard() {
  showSkeleton();
  try {
    const [users, donors, drives] = await Promise.all([
      getUsersReport(),
      getDonorsReport(),
      getDrivesReport(),
    ]);
    hideSkeleton();
    renderKpis(users, donors, drives);
    renderCharts(users, donors);
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
  msg.textContent = "We couldn't load the dashboard. This may be a temporary connection issue — please try again.";

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'btn-retry';
  retryBtn.textContent = 'Retry';
  retryBtn.addEventListener('click', () => initAdminDashboard());

  el.appendChild(msg);
  el.appendChild(retryBtn);
}

// ── KPI row ───────────────────────────────────────────────────────────
// Each KPI card links to the page it summarizes, so it doubles as a
// shortcut, not just a number. Pending Approvals is the only one flagged
// visually (kpi-card--alert) when > 0, since it's the one KPI here that
// represents work waiting on the admin specifically.

function renderKpis(users, donors, drives) {
  const container = document.getElementById('kpi-row');
  container.textContent = '';

  const activeStaffTotal = users.active_staff_by_branch
    .reduce((sum, b) => sum + b.active_staff_count, 0);

  const activeDrives = drives.status_breakdown
    .filter(s => s.status === 'Upcoming' || s.status === 'Ongoing')
    .reduce((sum, s) => sum + s.count, 0);

  const kpis = [
    {
      label: 'Pending Approvals',
      value: users.pending_approvals,
      href: ROUTES.ADMIN.USERS,
      alert: users.pending_approvals > 0,
    },
    {
      label: 'Active Staff (all branches)',
      value: activeStaffTotal,
      href: null,
    },
    {
      label: 'New Donors This Month',
      value: donors.donors_registered.this_month,
      href: null,
    },
    {
      label: 'Active Blood Drives',
      value: activeDrives,
      href: ROUTES.ADMIN.BLOOD_DRIVES,
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

function renderCharts(users, donors) {
  // Staff per branch — surfaces understaffed branches at a glance, a
  // decision-support angle the Reports page doesn't foreground.
  const branchData = users.active_staff_by_branch;
  toggleChartEmpty('chart-staff-branch', branchData.length === 0);
  if (branchData.length > 0) {
    renderBarChart('chart-staff-branch', {
      labels: branchData.map(b => b.branch_name),
      data: branchData.map(b => b.active_staff_count),
      horizontal: true,
    });
  }

  // User role composition
  const roleData = users.role_breakdown.filter(r => r.role_id !== 3);
  toggleChartEmpty('chart-user-roles', roleData.length === 0);
  if (roleData.length > 0) {
    renderDoughnutChart('chart-user-roles', {
      labels: roleData.map(r => ROLE_LABELS[r.role_id] || r.role_name),
      data: roleData.map(r => r.count),
    });
  }

  // Donation trend, last 30 days (donation_daily_series is already shaped
  // for this — see reportService.js's TREND_DAYS)
  const trend = donors.donation_daily_series;
  toggleChartEmpty('chart-donation-trend', trend.length === 0);
  if (trend.length > 0) {
    renderLineChart('chart-donation-trend', {
      labels: trend.map(d => formatShortDate(d.date)),
      data: trend.map(d => d.count),
    });
  }
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

function formatShortDate(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Quick actions ─────────────────────────────────────────────────────
// No API needed — plain shortcut links. Kept to the 3 most decision-
// relevant admin actions rather than a full nav duplicate of the sidebar.

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
    { label: 'Review Pending Approvals', href: ROUTES.ADMIN.USERS },
    { label: 'Create Blood Drive',       href: ROUTES.ADMIN.BLOOD_DRIVE_CREATE },
    { label: 'View Full Reports',        href: ROUTES.ADMIN.REPORTS },
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