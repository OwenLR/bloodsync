/**
 * fieldDashboardUI.js. Volunteer / Phlebotomist Dashboard.
 *
 * Shared between both roles (same data, same widgets), same "shared
 * entry/UI file" pattern already used for driveAssignment.js. See
 * sessionState.md Permanent Rules.
 *
 * Data sources, both reused directly, no new dashboardApi.js file:
 *   - bloodDrivesApi.js: getMyAssignments(). Response shape confirmed
 *     via the already-built bloodDriveAssignmentUI.js, which consumes
 *     the same endpoint for the "My Assignments" page:
 *       drive_id, name, assignment_status ('Assigned'|'Confirmed'|
 *       'Declined'|'No Show'), status (drive status), start_datetime,
 *       end_datetime, venue_name, city, province, assigned_by_first,
 *       assigned_by_last, role_notes (optional)
 *   - reportsApi.js: getMyImpactReport(). New endpoint this session:
 *       interviews_conducted, screenings_performed, units_extracted
 *
 * Accept/Decline logic (runStatusUpdate, confirmModal usage) mirrors
 * bloodDriveAssignmentUI.js's own implementation for consistency, since
 * this dashboard's featured assignment can trigger the same action.
 *
 * DOM + rendering only. Never calls apiFetch directly.
 *
 * Layout, per discussion this session:
 *   1. Motivational card (top, not buried below the fold)
 *   2. Upcoming Assignments card (featured next assignment + up to 2
 *      more compact rows, drives-completed badge and "View All" link
 *      integrated into the card header, no separate history section,
 *      that already lives on the My Assignments page)
 *   3. Your Impact card (interviews / screenings / units extracted)
 *   4. Quick actions
 */

import { getMyAssignments, updateMyParticipationStatus } from '../bloodDrives/bloodDrivesApi.js';
import { getMyImpactReport } from '../reports/reportsApi.js';
import { showToast } from '../../components/toast.js';
import { confirmModal } from '../../components/modal.js';
import { ROUTES } from '../../constants/routes.js';
import { ROLES } from '../../constants/roles.js';

// Mirrors backend's bloodDriveRules.js TERMINAL_STATUSES, same as
// bloodDriveAssignmentUI.js.
const TERMINAL_DRIVE_STATUSES = ['Ended', 'Cancelled'];

// How many additional upcoming assignments to show as compact rows
// below the featured one.
const MAX_COMPACT_ROWS = 2;

const MOTIVATIONAL_FACTS = [
  'Every drive you support helps keep the blood supply steady for patients who need it.',
  'Volunteers and phlebotomists are the backbone of every successful blood drive.',
  'Your work in the field makes safe, timely blood donation possible for donors and patients alike.',
  'A calm check-in or a steady hand makes a real difference to a first-time donor.',
];

let currentUser = null;

export async function initFieldDashboard(user) {
  currentUser = user;
  renderMotivationalFact();
  renderQuickActions(user);
  loadAssignments();
  loadImpactStats();
}

// ── Loading / error states (assignments card) ──────────────────────

function showAssignmentsSkeleton() {
  document.getElementById('assignments-skeleton').style.display = '';
  document.getElementById('next-assignment-card').style.display = 'none';
  document.getElementById('assignments-error').textContent = '';
}

function hideAssignmentsSkeleton() {
  document.getElementById('assignments-skeleton').style.display = 'none';
}

function showAssignmentsContent() {
  document.getElementById('next-assignment-card').style.display = '';
}

function showAssignmentsError() {
  const el = document.getElementById('assignments-error');
  el.textContent = '';

  const msg = document.createElement('p');
  msg.textContent = "We couldn't load your assignments. This may be a temporary connection issue, please try again.";

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'btn-retry';
  retryBtn.textContent = 'Retry';
  retryBtn.addEventListener('click', loadAssignments);

  el.appendChild(msg);
  el.appendChild(retryBtn);
}

// ── Assignments data load ───────────────────────────────────────────

async function loadAssignments() {
  showAssignmentsSkeleton();
  try {
    const assignments = await getMyAssignments();
    hideAssignmentsSkeleton();
    renderNextAssignment(assignments);
    showAssignmentsContent();
  } catch (err) {
    hideAssignmentsSkeleton();
    showAssignmentsError();
  }
}

// ── Upcoming Assignments card ───────────────────────────────────────

function renderNextAssignment(assignments) {
  const container = document.getElementById('next-assignment-card');
  container.textContent = '';

  const upcoming = assignments
    .filter(a => ['Assigned', 'Confirmed'].includes(a.assignment_status))
    .filter(a => !TERMINAL_DRIVE_STATUSES.includes(a.status))
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

  const drivesCompleted = assignments.filter(a =>
    a.assignment_status === 'Confirmed' && a.status === 'Ended'
  ).length;

  container.appendChild(renderCardHeader(upcoming.length, drivesCompleted));

  if (upcoming.length === 0) {
    container.appendChild(renderNoAssignment());
    return;
  }

  const [featured, ...rest] = upcoming;
  container.appendChild(renderFeaturedAssignment(featured));

  if (rest.length > 0) {
    container.appendChild(renderCompactAssignmentList(rest.slice(0, MAX_COMPACT_ROWS)));
  }
}

function renderCardHeader(upcomingCount, drivesCompleted) {
  const header = document.createElement('div');
  header.className = 'next-assignment-header';

  const heading = document.createElement('h2');
  heading.className = 'chart-card-title';
  heading.textContent = upcomingCount > 0
    ? `Upcoming Assignments (${upcomingCount})`
    : 'Upcoming Assignments';

  const badge = document.createElement('span');
  badge.className = 'drives-completed-badge';
  badge.textContent = `${drivesCompleted} drive${drivesCompleted === 1 ? '' : 's'} completed`;

  const viewAll = document.createElement('a');
  viewAll.className = 'view-all-link';
  viewAll.href = driveRouteFor(currentUser);
  viewAll.textContent = 'View All';

  header.appendChild(heading);
  header.appendChild(badge);
  header.appendChild(viewAll);
  return header;
}

function renderFeaturedAssignment(assignment) {
  const wrap = document.createElement('div');
  wrap.className = 'featured-assignment';

  const name = document.createElement('h3');
  name.className = 'card-heading';
  name.textContent = assignment.name;

  const schedule = document.createElement('p');
  schedule.className = 'card-subtext';
  schedule.textContent = formatDateRange(assignment.start_datetime, assignment.end_datetime);

  const venue = document.createElement('p');
  venue.className = 'card-subtext';
  venue.textContent = formatVenue(assignment);

  wrap.appendChild(name);
  wrap.appendChild(schedule);
  wrap.appendChild(venue);

  if (assignment.role_notes) {
    const notes = document.createElement('p');
    notes.className = 'assignment-role-notes';
    notes.textContent = assignment.role_notes;
    wrap.appendChild(notes);
  }

  if (assignment.assignment_status === 'Assigned') {
    const actions = document.createElement('div');
    actions.className = 'button-row';

    const acceptBtn = document.createElement('button');
    acceptBtn.type = 'button';
    acceptBtn.className = 'btn-primary';
    acceptBtn.textContent = 'Accept';
    acceptBtn.addEventListener('click', () => handleAccept(assignment.drive_id, acceptBtn));

    const declineBtn = document.createElement('button');
    declineBtn.type = 'button';
    declineBtn.className = 'btn-secondary';
    declineBtn.textContent = 'Decline';
    declineBtn.addEventListener('click', () => handleDecline(assignment.drive_id, declineBtn));

    actions.appendChild(acceptBtn);
    actions.appendChild(declineBtn);
    wrap.appendChild(actions);
  } else {
    const badge = document.createElement('span');
    badge.className = 'status-badge status-badge--confirmed';
    badge.textContent = 'Confirmed';
    wrap.appendChild(badge);
  }

  return wrap;
}

function renderCompactAssignmentList(items) {
  const list = document.createElement('div');
  list.className = 'drive-list compact-assignment-list';

  items.forEach(a => {
    const item = document.createElement('div');
    item.className = 'drive-list-item';

    const dateEl = document.createElement('div');
    dateEl.className = 'drive-list-date';
    dateEl.textContent = formatShortDate(a.start_datetime);

    const infoEl = document.createElement('div');
    infoEl.className = 'drive-list-info';
    const nameEl = document.createElement('div');
    nameEl.className = 'drive-list-name';
    nameEl.textContent = a.name;
    infoEl.appendChild(nameEl);

    const statusEl = document.createElement('span');
    statusEl.className = 'status-badge status-badge--' + a.assignment_status.toLowerCase().replace(' ', '-');
    statusEl.textContent = a.assignment_status;

    item.appendChild(dateEl);
    item.appendChild(infoEl);
    item.appendChild(statusEl);
    list.appendChild(item);
  });

  return list;
}

function renderNoAssignment() {
  const wrap = document.createElement('div');

  const msg = document.createElement('p');
  msg.className = 'card-subtext';
  msg.textContent = "You don't have any pending or confirmed blood drive assignments right now.";

  const link = document.createElement('a');
  link.className = 'btn-secondary';
  link.href = driveRouteFor(currentUser);
  link.textContent = 'View My Assignments';

  wrap.appendChild(msg);
  wrap.appendChild(link);
  return wrap;
}

function driveRouteFor(user) {
  return user.role_id === ROLES.VOLUNTEER ? ROUTES.VOLUNTEER.DRIVE : ROUTES.PHLEBOTOMIST.DRIVE;
}

async function handleAccept(driveId, btnEl) {
  await runStatusUpdate(driveId, 'Confirmed', btnEl, 'Accept', 'Accepting...');
}

async function handleDecline(driveId, btnEl) {
  const confirmed = await confirmModal(
    'Decline this blood drive assignment? This cannot be undone from here. Contact your branch coordinator if you change your mind.',
    'Decline',
    'Cancel',
    true
  );
  if (!confirmed) return;

  await runStatusUpdate(driveId, 'Declined', btnEl, 'Decline', 'Declining...');
}

async function runStatusUpdate(driveId, assignmentStatus, btnEl, originalText, savingText) {
  btnEl.disabled = true;
  btnEl.textContent = savingText;

  try {
    await updateMyParticipationStatus(driveId, assignmentStatus);
    showToast(
      assignmentStatus === 'Confirmed' ? 'Assignment accepted.' : 'Assignment declined.',
      'success'
    );
    // Response is a raw DB row with no joined display fields, same as
    // bloodDriveAssignmentUI.js's own handling. Refetch instead of patch.
    await loadAssignments();
  } catch (err) {
    btnEl.disabled = false;
    btnEl.textContent = originalText;
    showToast(err.message, 'error');
  }
}

// ── Your Impact card ─────────────────────────────────────────────────

async function loadImpactStats() {
  const container = document.getElementById('impact-stats-card');
  showImpactSkeleton(container);

  try {
    const impact = await getMyImpactReport();
    renderImpactStats(container, impact);
  } catch (err) {
    renderImpactError(container);
  }
}

function showImpactSkeleton(container) {
  container.textContent = '';
  const skel = document.createElement('div');
  skel.className = 'skeleton-item';
  skel.innerHTML =
    '<div class="skeleton-line skeleton-line-wide"></div>' +
    '<div class="skeleton-line skeleton-line-narrow"></div>';
  container.appendChild(skel);
}

function renderImpactError(container) {
  container.textContent = '';
  const msg = document.createElement('p');
  msg.className = 'card-subtext';
  msg.textContent = "We couldn't load your impact stats right now.";
  container.appendChild(msg);
}

function renderImpactStats(container, impact) {
  container.textContent = '';

  const heading = document.createElement('h2');
  heading.className = 'chart-card-title';
  heading.textContent = 'Your Impact';
  container.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'impact-stat-grid';

  const stats = [
    { label: 'Donors Interviewed', value: impact.interviews_conducted },
    { label: 'Donors Screened',    value: impact.screenings_performed },
    { label: 'Units Extracted',    value: impact.units_extracted },
  ];

  stats.forEach(s => {
    const cell = document.createElement('div');
    cell.className = 'impact-stat-cell';

    const value = document.createElement('div');
    value.className = 'kpi-value';
    value.textContent = s.value;

    const label = document.createElement('div');
    label.className = 'kpi-label';
    label.textContent = s.label;

    cell.appendChild(value);
    cell.appendChild(label);
    grid.appendChild(cell);
  });

  container.appendChild(grid);
}

// ── Motivational fact (rendered first, top of page) ─────────────────

function renderMotivationalFact() {
  const container = document.getElementById('mission-blurb');
  container.textContent = '';

  const heading = document.createElement('h2');
  heading.className = 'card-heading';
  heading.textContent = 'Thank You for Volunteering';

  const fact = document.createElement('p');
  fact.className = 'donation-fact';

  container.appendChild(heading);
  container.appendChild(fact);

  let index = 0;
  fact.textContent = MOTIVATIONAL_FACTS[index];
  setInterval(() => {
    index = (index + 1) % MOTIVATIONAL_FACTS.length;
    fact.textContent = MOTIVATIONAL_FACTS[index];
  }, 8000);
}

// ── Quick actions ─────────────────────────────────────────────────────

function renderQuickActions(user) {
  const container = document.getElementById('quick-actions');
  container.textContent = '';

  const heading = document.createElement('h2');
  heading.className = 'quick-actions-heading';
  heading.textContent = 'Quick Actions';
  container.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'quick-actions-list';

  const actions = [
    { label: 'My Assignments',              href: driveRouteFor(user) },
    { label: 'Register Donor',              href: ROUTES.FIELD.REGISTER },
    { label: 'Record Donation & Collection', href: ROUTES.FIELD.DONATION },
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

// ── Formatting helpers (mirrors bloodDriveAssignmentUI.js's formatting,
//    with "to" instead of an en dash between the times) ────────────

function formatDateRange(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 'Date unavailable';

  const dateOpts = { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' };
  const timeOpts = { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' };

  const datePart = startDate.toLocaleDateString('en-PH', dateOpts);
  const startTime = startDate.toLocaleTimeString('en-PH', timeOpts);
  const endTime = endDate.toLocaleTimeString('en-PH', timeOpts);

  return `${datePart}, ${startTime} to ${endTime}`;
}

function formatShortDate(isoDatetime) {
  const d = new Date(isoDatetime);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatVenue(assignment) {
  const parts = [assignment.venue_name, assignment.city, assignment.province].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Venue unavailable';
}