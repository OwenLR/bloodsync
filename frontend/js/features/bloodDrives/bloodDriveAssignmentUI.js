import { showToast }    from '../../components/toast.js';
import { confirmModal } from '../../components/modal.js';
import {
  getMyAssignments,
  updateMyParticipationStatus,
} from './bloodDrivesApi.js';

const SKELETON_ID       = 'assignments-skeleton';
const ERROR_ID          = 'assignments-error';
const INCOMING_LIST_ID  = 'assignments-incoming-list';
const HISTORY_LIST_ID   = 'assignments-history-list';
const TAB_INCOMING_ID   = 'tab-incoming';
const TAB_HISTORY_ID    = 'tab-history';
const PANEL_INCOMING_ID = 'panel-incoming';
const PANEL_HISTORY_ID  = 'panel-history';

// Terminal drive statuses — mirrors backend's bloodDriveRules.js
// TERMINAL_STATUSES. Accept/Decline buttons are hidden once a drive is
// in one of these, same as the backend's assertNotTerminal would reject
// the mutation anyway.
const TERMINAL_DRIVE_STATUSES = ['Ended', 'Cancelled'];

let _cachedAssignments = [];

// ---------------------------------------------------------------------------
// Public entry — called from js/entry/shared/driveAssignment.js
// ---------------------------------------------------------------------------

export async function renderAssignments() {
  showSkeleton();

  try {
    _cachedAssignments = await getMyAssignments();
    hideSkeleton();
    renderBothPanels();
  } catch (err) {
    hideSkeleton();
    showLoadError(err.message);
  }
}

export function initTabs() {
  const incomingTab = document.getElementById(TAB_INCOMING_ID);
  const historyTab   = document.getElementById(TAB_HISTORY_ID);
  if (!incomingTab || !historyTab) return;

  incomingTab.addEventListener('click', () => switchTab('incoming'));
  historyTab.addEventListener('click', () => switchTab('history'));
}

// ---------------------------------------------------------------------------
// Tab switching — display toggle only, no refetch
// ---------------------------------------------------------------------------

function switchTab(which) {
  const incomingTab   = document.getElementById(TAB_INCOMING_ID);
  const historyTab     = document.getElementById(TAB_HISTORY_ID);
  const incomingPanel = document.getElementById(PANEL_INCOMING_ID);
  const historyPanel   = document.getElementById(PANEL_HISTORY_ID);

  const showIncoming = which === 'incoming';

  incomingTab.classList.toggle('tab-button--active', showIncoming);
  historyTab.classList.toggle('tab-button--active', !showIncoming);
  incomingPanel.style.display = showIncoming ? '' : 'none';
  historyPanel.style.display   = showIncoming ? 'none' : '';
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderBothPanels() {
  const incoming = _cachedAssignments.filter(a => a.assignment_status === 'Assigned');
  const history   = _cachedAssignments.filter(a => a.assignment_status !== 'Assigned');

  renderPanel(INCOMING_LIST_ID, incoming, true);
  renderPanel(HISTORY_LIST_ID, history, false);
}

function renderPanel(listId, assignments, showActions) {
  const list = document.getElementById(listId);
  list.textContent = '';

  if (!assignments.length) {
    list.style.display = 'none';
    showEmptyState(listId, showActions);
    return;
  }

  hideEmptyState(listId);
  list.style.display = '';
  assignments.forEach(a => list.appendChild(buildCard(a, showActions)));
}

function buildCard(assignment, showActions) {
  const card = document.createElement('div');
  card.className = 'assignment-card';
  card.dataset.driveId = assignment.drive_id;

  const header = document.createElement('div');
  header.className = 'assignment-card-header';

  const name = document.createElement('h3');
  name.className   = 'assignment-drive-name';
  name.textContent = assignment.name;

  const statusBadge = document.createElement('span');
  statusBadge.className = `status-badge status-badge--${assignment.assignment_status.toLowerCase().replace(' ', '-')}`;
  statusBadge.textContent = assignment.assignment_status;

  header.appendChild(name);
  header.appendChild(statusBadge);

  const meta = document.createElement('div');
  meta.className = 'assignment-card-meta';

  const schedule = document.createElement('p');
  schedule.textContent = `${formatDateRange(assignment.start_datetime, assignment.end_datetime)}`;

  const venue = document.createElement('p');
  venue.textContent = formatVenue(assignment);

  const assignedBy = document.createElement('p');
  assignedBy.className = 'assignment-assigned-by';
  assignedBy.textContent = `Assigned by ${assignment.assigned_by_first} ${assignment.assigned_by_last}`;

  meta.appendChild(schedule);
  meta.appendChild(venue);
  meta.appendChild(assignedBy);

  if (assignment.role_notes) {
    const notes = document.createElement('p');
    notes.className   = 'assignment-role-notes';
    notes.textContent = assignment.role_notes;
    meta.appendChild(notes);
  }

  card.appendChild(header);
  card.appendChild(meta);

  const canAct = showActions &&
    assignment.assignment_status === 'Assigned' &&
    !TERMINAL_DRIVE_STATUSES.includes(assignment.status);

  if (canAct) {
    const actions = document.createElement('div');
    actions.className = 'assignment-card-actions';

    const acceptBtn       = document.createElement('button');
    acceptBtn.className   = 'btn-primary btn-sm';
    acceptBtn.textContent = 'Accept';
    acceptBtn.addEventListener('click', () =>
      handleAccept(assignment.drive_id, acceptBtn));

    const declineBtn       = document.createElement('button');
    declineBtn.className   = 'btn-secondary btn-sm';
    declineBtn.textContent = 'Decline';
    declineBtn.addEventListener('click', () =>
      handleDecline(assignment.drive_id, declineBtn));

    actions.appendChild(acceptBtn);
    actions.appendChild(declineBtn);
    card.appendChild(actions);
  }

  return card;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function handleAccept(driveId, btnEl) {
  await runStatusUpdate(driveId, 'Confirmed', btnEl, 'Accept', 'Accepting…');
}

async function handleDecline(driveId, btnEl) {
  const confirmed = await confirmModal(
    'Decline this blood drive assignment? This cannot be undone from here — contact your branch coordinator if you change your mind.',
    'Decline',
    'Cancel',
    true
  );
  if (!confirmed) return;

  await runStatusUpdate(driveId, 'Declined', btnEl, 'Decline', 'Declining…');
}

async function runStatusUpdate(driveId, assignmentStatus, btnEl, originalText, savingText) {
  btnEl.disabled    = true;
  btnEl.textContent = savingText;

  try {
    await updateMyParticipationStatus(driveId, assignmentStatus);
    showToast(
      assignmentStatus === 'Confirmed'
        ? 'Assignment accepted.'
        : 'Assignment declined.',
      'success'
    );
    // Response is a raw DB row with no joined display fields — refetch
    // the full list instead of patching, same pattern as Blood Requests'
    // detail-page mutations (see sessionState.md Permanent Rules).
    await renderAssignments();
  } catch (err) {
    btnEl.disabled    = false;
    btnEl.textContent = originalText;
    showToast(err.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// Skeleton / error / empty state helpers
//
// NOTE: showSkeleton()/hideSkeleton() here only toggle display, same as
// every other feature UI file in this app (bloodUnitsUI.js,
// notificationsUI.js, bloodCollectionsUI.js, bloodRequests*UI.js) — none
// of them wire up the real skeleton.js component yet. Replicated for
// consistency, not a new gap — see sessionState.md Not Started for the
// tracked cleanup item.
// ---------------------------------------------------------------------------

function showSkeleton() {
  document.getElementById(SKELETON_ID).style.display = '';
  document.getElementById(INCOMING_LIST_ID).style.display = 'none';
  document.getElementById(HISTORY_LIST_ID).style.display   = 'none';
  document.getElementById(ERROR_ID).textContent = '';
}

function hideSkeleton() {
  document.getElementById(SKELETON_ID).style.display = 'none';
}

function showLoadError(message) {
  const el = document.getElementById(ERROR_ID);
  el.textContent = message || 'Could not load your assignments. Please try again.';
}

function showEmptyState(listId, isIncoming) {
  const emptyId = `${listId}-empty-state`;
  let empty = document.getElementById(emptyId);
  if (!empty) {
    empty           = document.createElement('div');
    empty.id        = emptyId;
    empty.className = 'empty-state';

    const h3 = document.createElement('h3');
    h3.textContent = isIncoming ? 'No pending assignments' : 'No assignment history yet';
    const p = document.createElement('p');
    p.textContent = isIncoming
      ? 'You\u2019ll see new blood drive assignments here as they come in.'
      : 'Assignments you\u2019ve accepted or declined will show up here.';

    empty.appendChild(h3);
    empty.appendChild(p);
    document.getElementById(listId).insertAdjacentElement('afterend', empty);
  }
  empty.style.display = '';
}

function hideEmptyState(listId) {
  const empty = document.getElementById(`${listId}-empty-state`);
  if (empty) empty.style.display = 'none';
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatDateRange(start, end) {
  const startDate = new Date(start);
  const endDate   = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return '—';

  const dateOpts = { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' };
  const timeOpts = { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' };

  const datePart  = startDate.toLocaleDateString('en-PH', dateOpts);
  const startTime = startDate.toLocaleTimeString('en-PH', timeOpts);
  const endTime   = endDate.toLocaleTimeString('en-PH', timeOpts);

  return `${datePart}, ${startTime} – ${endTime}`;
}

function formatVenue(assignment) {
  const parts = [assignment.venue_name, assignment.city, assignment.province]
    .filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}