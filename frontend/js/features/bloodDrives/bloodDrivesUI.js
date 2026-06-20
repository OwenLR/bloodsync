import { showSkeleton, hideSkeleton }       from '../../components/skeleton.js';
import { showToast }                          from '../../components/toast.js';
import { openModal, closeModal, confirmModal } from '../../components/modal.js';
import { showError, clearFeedback }           from '../../components/feedback.js';
import { showErrorBoundary }                  from '../../components/errorBoundary.js';
import { ROUTES }                             from '../../constants/routes.js';
import {
  getAllDrives,
  getDriveParticipants,
  getAvailableVolunteers,
  addParticipant,
  removeParticipant,
  cancelDrive,
} from './bloodDrivesApi.js';
import { validateCancelForm } from './bloodDrivesValidation.js';

// ─── Status badge ────────────────────────────────────────────────────────────

function createStatusBadge(status) {
  const span = document.createElement('span');
  span.className = `status-badge status-badge--${status.toLowerCase()}`;
  span.textContent = status;
  return span;
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function renderEmptyState(container) {
  container.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'empty-state';
  const h3 = document.createElement('h3');
  h3.textContent = 'No blood drives yet';
  const p = document.createElement('p');
  p.textContent = 'Create a blood drive to get started.';
  div.appendChild(h3);
  div.appendChild(p);
  container.appendChild(div);
}

// ─── Drives table ────────────────────────────────────────────────────────────

export async function renderDrivesTable(user) {
  const tbody = document.getElementById('drives-tbody');
  const container = document.getElementById('drives-table-container');

  showSkeleton('drives-table-container', 5, 'table', 7);

  let drives;
  try {
    drives = await getAllDrives();
  } catch (err) {
    hideSkeleton();
    showErrorBoundary('drives-table-container', err.message);
    return;
  }

  hideSkeleton();

  if (!drives || drives.length === 0) {
    renderEmptyState(container);
    return;
  }

  tbody.innerHTML = '';

  drives.forEach(drive => {
    const tr = document.createElement('tr');
    tr.dataset.driveId = drive.drive_id;

    // Name
    const tdName = document.createElement('td');
    tdName.textContent = drive.name;
    tr.appendChild(tdName);

    // Branch
    const tdBranch = document.createElement('td');
    tdBranch.textContent = drive.branch_name || '—';
    tr.appendChild(tdBranch);

    // Location (city / province)
    const tdLocation = document.createElement('td');
    const locationParts = [drive.city, drive.province].filter(Boolean);
    tdLocation.textContent = locationParts.length ? locationParts.join(', ') : '—';
    tr.appendChild(tdLocation);

    // Date range
    const tdDates = document.createElement('td');
    tdDates.textContent = formatDateRange(drive.start_datetime, drive.end_datetime);
    tr.appendChild(tdDates);

    // Slots
    const tdSlots = document.createElement('td');
    tdSlots.textContent = drive.slots_available ?? '—';
    tr.appendChild(tdSlots);

    // Status
    const tdStatus = document.createElement('td');
    tdStatus.appendChild(createStatusBadge(drive.status));
    tr.appendChild(tdStatus);

    // Actions
    const tdActions = document.createElement('td');
    tdActions.className = 'table-actions';

    const btnParticipants = document.createElement('button');
    btnParticipants.className = 'btn-secondary btn-sm';
    btnParticipants.textContent = 'Participants';
    btnParticipants.addEventListener('click', () => openParticipantPanel(drive, user));
    tdActions.appendChild(btnParticipants);

    const canEdit = drive.status !== 'Ended' && drive.status !== 'Cancelled';
    if (canEdit) {
      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn-secondary btn-sm';
      btnEdit.textContent = 'Edit';
      btnEdit.addEventListener('click', () => {
        window.location.href = getEditRoute(user, drive.drive_id);
      });
      tdActions.appendChild(btnEdit);
    }

    const canCancel = drive.status !== 'Ended' && drive.status !== 'Cancelled';
    if (canCancel) {
      const btnCancel = document.createElement('button');
      btnCancel.className = 'btn-danger btn-sm';
      btnCancel.textContent = 'Cancel';
      btnCancel.addEventListener('click', () => openCancelModal(drive, user));
      tdActions.appendChild(btnCancel);
    }

    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
}

function getEditRoute(user, driveId) {
  // Routes for edit — reuse create page with ?edit=driveId
  // Admin and staff share the same pattern
  const base = user.role_id === 1
    ? ROUTES.ADMIN.BLOOD_DRIVE_CREATE
    : ROUTES.STAFF.BLOOD_DRIVE_CREATE;
  return `${base}?edit=${driveId}`;
}

// ─── Date formatting helper ───────────────────────────────────────────────────

function formatDateRange(start, end) {
  if (!start || !end) return '—';
  const opts = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const s = new Date(start).toLocaleString('en-PH', opts);
  const e = new Date(end).toLocaleString('en-PH', opts);
  return `${s} — ${e}`;
}

// ─── Cancel modal ────────────────────────────────────────────────────────────

function openCancelModal(drive, user) {
  const modal = document.getElementById('cancel-modal');
  const driveNameEl = document.getElementById('cancel-drive-name');
  const reasonInput = document.getElementById('cancel-reason');
  const errorEl = document.getElementById('cancel-error');
  const submitBtn = document.getElementById('cancel-submit-btn');

  driveNameEl.textContent = drive.name;
  reasonInput.value = '';
  clearFeedback('cancel-error');

  openModal('cancel-modal');

  // Remove previous listeners by replacing the button
  const freshBtn = submitBtn.cloneNode(true);
  submitBtn.parentNode.replaceChild(freshBtn, submitBtn);

  freshBtn.addEventListener('click', async () => {
    clearFeedback('cancel-error');

    const reason = reasonInput.value.trim();
    const validation = validateCancelForm({ cancellation_reason: reason });

    if (!validation.valid) {
      showError('cancel-error', validation.message);
      return;
    }

    freshBtn.disabled = true;
    freshBtn.textContent = 'Cancelling…';

    try {
      await cancelDrive(drive.drive_id, reason);
      closeModal('cancel-modal');
      showToast(`"${drive.name}" has been cancelled.`, 'success');
      await renderDrivesTable(user);
    } catch (err) {
      showError('cancel-error', err.message);
      freshBtn.disabled = false;
      freshBtn.textContent = 'Confirm Cancel';
    }
  });

  document.getElementById('cancel-modal-close').addEventListener('click', () => {
    closeModal('cancel-modal');
  });
}

// ─── Participant panel ────────────────────────────────────────────────────────

let _currentDrive = null;
let _currentUser  = null;

export function initParticipantPanel() {
  document.getElementById('panel-close-btn').addEventListener('click', closeParticipantPanel);
  document.getElementById('panel-overlay').addEventListener('click', closeParticipantPanel);
  document.getElementById('panel-assign-btn').addEventListener('click', handleAutoAssign);

  document.getElementById('panel-role-filter').addEventListener('change', () => {
    renderAvailableVolunteers();
  });
  document.getElementById('panel-municipality-filter').addEventListener('input', debounce(() => {
    renderAvailableVolunteers();
  }, 400));
}

function closeParticipantPanel() {
  document.getElementById('participant-panel').classList.remove('panel--open');
  document.getElementById('panel-overlay').classList.remove('panel-overlay--visible');
  _currentDrive = null;
  _currentUser  = null;
}

async function openParticipantPanel(drive, user) {
  _currentDrive = drive;
  _currentUser  = user;

  document.getElementById('panel-drive-name').textContent = drive.name;
  document.getElementById('panel-municipality-filter').value = drive.city || '';
  document.getElementById('panel-role-filter').value = '';
  document.getElementById('panel-assign-count').value = 1;

  document.getElementById('participant-panel').classList.add('panel--open');
  document.getElementById('panel-overlay').classList.add('panel-overlay--visible');

  await renderCurrentParticipants();
  await renderAvailableVolunteers();
}

async function renderCurrentParticipants() {
  const container = document.getElementById('current-participants-list');
  container.innerHTML = '';

  showSkeleton('current-participants-list', 3, 'list', 1);

  let participants;
  try {
    participants = await getDriveParticipants(_currentDrive.drive_id);
  } catch (err) {
    hideSkeleton();
    const p = document.createElement('p');
    p.className = 'panel-error';
    p.textContent = 'Could not load participants. Try again.';
    container.appendChild(p);
    return;
  }

  hideSkeleton();
  container.innerHTML = '';

  if (!participants || participants.length === 0) {
    const p = document.createElement('p');
    p.className = 'panel-empty';
    p.textContent = 'No participants assigned yet.';
    container.appendChild(p);
    return;
  }

  participants.forEach(p => {
    const row = document.createElement('div');
    row.className = 'participant-row';

    const info = document.createElement('div');
    info.className = 'participant-info';

    const name = document.createElement('span');
    name.className = 'participant-name';
    name.textContent = `${p.first_name} ${p.last_name}`;

    const meta = document.createElement('span');
    meta.className = 'participant-meta';
    meta.textContent = `${p.role_name} · ${p.assignment_status}`;

    info.appendChild(name);
    info.appendChild(meta);

    const canRemove = _currentDrive.status !== 'Ended' && _currentDrive.status !== 'Cancelled';
    if (canRemove) {
      const btnRemove = document.createElement('button');
      btnRemove.className = 'btn-danger btn-xs';
      btnRemove.textContent = 'Remove';
      btnRemove.addEventListener('click', async () => {
        btnRemove.disabled = true;
        btnRemove.textContent = 'Removing…';
        try {
          await removeParticipant(_currentDrive.drive_id, p.user_id);
          showToast(`${p.first_name} ${p.last_name} removed.`, 'success');
          await renderCurrentParticipants();
        } catch (err) {
          showToast(err.message, 'error');
          btnRemove.disabled = false;
          btnRemove.textContent = 'Remove';
        }
      });
      row.appendChild(info);
      row.appendChild(btnRemove);
    } else {
      row.appendChild(info);
    }

    container.appendChild(row);
  });
}

async function renderAvailableVolunteers() {
  const container = document.getElementById('available-volunteers-list');
  container.innerHTML = '';

  const roleId     = document.getElementById('panel-role-filter').value;
  const municipality = document.getElementById('panel-municipality-filter').value.trim();

  showSkeleton('available-volunteers-list', 4, 'list', 1);

  let volunteers;
  try {
    volunteers = await getAvailableVolunteers(roleId || null, municipality);
  } catch (err) {
    hideSkeleton();
    const p = document.createElement('p');
    p.className = 'panel-error';
    p.textContent = 'Could not load volunteers. Try again.';
    container.appendChild(p);
    return;
  }

  hideSkeleton();
  container.innerHTML = '';

  if (!volunteers || volunteers.length === 0) {
    const p = document.createElement('p');
    p.className = 'panel-empty';
    p.textContent = 'No available volunteers match the current filters.';
    container.appendChild(p);
    return;
  }

  volunteers.forEach(v => {
    const row = document.createElement('div');
    row.className = 'volunteer-row';

    const info = document.createElement('div');
    info.className = 'volunteer-info';

    const name = document.createElement('span');
    name.className = 'volunteer-name';
    name.textContent = `${v.first_name} ${v.last_name}`;

    const meta = document.createElement('span');
    meta.className = 'volunteer-meta';
    meta.textContent = `${v.role_name} · ${v.address_municipality || '—'}`;

    info.appendChild(name);
    info.appendChild(meta);

    const btnAdd = document.createElement('button');
    btnAdd.className = 'btn-secondary btn-xs';
    btnAdd.textContent = 'Assign';
    btnAdd.addEventListener('click', async () => {
      btnAdd.disabled = true;
      btnAdd.textContent = 'Assigning…';
      try {
        await addParticipant(_currentDrive.drive_id, v.user_id);
        showToast(`${v.first_name} ${v.last_name} assigned.`, 'success');
        await renderCurrentParticipants();
        btnAdd.textContent = 'Assign';
        btnAdd.disabled = false;
      } catch (err) {
        showToast(err.message, 'error');
        btnAdd.disabled = false;
        btnAdd.textContent = 'Assign';
      }
    });

    row.appendChild(info);
    row.appendChild(btnAdd);
    container.appendChild(row);
  });
}

async function handleAutoAssign() {
  const countInput = document.getElementById('panel-assign-count');
  const roleId     = document.getElementById('panel-role-filter').value;
  const municipality = document.getElementById('panel-municipality-filter').value.trim();
  const count = parseInt(countInput.value, 10);

  if (!count || count < 1) {
    showToast('Enter a valid number to auto-assign.', 'error');
    return;
  }

  const assignBtn = document.getElementById('panel-assign-btn');
  assignBtn.disabled = true;
  assignBtn.textContent = 'Assigning…';

  let volunteers;
  try {
    volunteers = await getAvailableVolunteers(roleId || null, municipality);
  } catch (err) {
    showToast('Could not fetch volunteers for auto-assign.', 'error');
    assignBtn.disabled = false;
    assignBtn.textContent = 'Auto-assign';
    return;
  }

  const toAssign = volunteers.slice(0, count);

  if (toAssign.length === 0) {
    showToast('No available volunteers to assign with current filters.', 'error');
    assignBtn.disabled = false;
    assignBtn.textContent = 'Auto-assign';
    return;
  }

  let successCount = 0;
  for (const v of toAssign) {
    try {
      await addParticipant(_currentDrive.drive_id, v.user_id);
      successCount++;
    } catch {
      // skip already-assigned or other errors silently per volunteer
    }
  }

  showToast(`${successCount} participant(s) assigned.`, 'success');
  await renderCurrentParticipants();
  await renderAvailableVolunteers();

  assignBtn.disabled = false;
  assignBtn.textContent = 'Auto-assign';
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}