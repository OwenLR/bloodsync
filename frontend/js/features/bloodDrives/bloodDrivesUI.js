import { showSkeleton, hideSkeleton }       from '../../components/skeleton.js';
import { showToast }                          from '../../components/toast.js';
import { openModal, closeModal }              from '../../components/modal.js';
import { showErrorBoundary }                  from '../../components/errorBoundary.js';
import { ROUTES }                             from '../../constants/routes.js';
import {
  getAllDrives,
  getDriveParticipants,
  getAvailableVolunteers,
  getSuggestedParticipants,
  addParticipant,
  removeParticipant,
  cancelDrive,
  bulkAssign,
  getDriveStats,
} from './bloodDrivesApi.js';
import { validateCancelForm, validateAutoAssignCount } from './bloodDrivesValidation.js';

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
  const tbody      = document.getElementById('drives-tbody');
  const tableWrap  = document.getElementById('drives-table-container');
  const skeletonEl = document.getElementById('drives-skeleton');
  const errorEl    = document.getElementById('drives-error');

  // Reset state
  tableWrap.style.display = 'none';
  errorEl.innerHTML = '';

  // Show skeleton in its own div — never inside the table
  showSkeleton('drives-skeleton', 5, 'rows', 4);

  let drives;
  try {
    drives = await getAllDrives();
  } catch (err) {
    hideSkeleton('drives-skeleton');
    showErrorBoundary('drives-error', err.message);
    return;
  }

  hideSkeleton('drives-skeleton');

  if (!drives || drives.length === 0) {
    renderEmptyState(errorEl);
    return;
  }

  tbody.innerHTML = '';
  tableWrap.style.display = '';

  drives.forEach(drive => {
    const tr = document.createElement('tr');
    tr.dataset.driveId = drive.drive_id;

    // Name
    const tdName = document.createElement('td');
    tdName.textContent = drive.name;
    tr.appendChild(tdName);

    // Branch
    const tdBranch = document.createElement('td');
    tdBranch.textContent = drive.branch_name || '-';
    tr.appendChild(tdBranch);

    // Location (city / province)
    const tdLocation = document.createElement('td');
    const locationParts = [drive.city, drive.province].filter(Boolean);
    tdLocation.textContent = locationParts.length ? locationParts.join(', ') : '-';
    tr.appendChild(tdLocation);

    // Date range
    const tdDates = document.createElement('td');
    tdDates.textContent = formatDateRange(drive.start_datetime, drive.end_datetime);
    tr.appendChild(tdDates);

    // Slots
    const tdSlots = document.createElement('td');
    tdSlots.textContent = drive.slots_available ?? '-';
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

    const btnStats = document.createElement('button');
    btnStats.className = 'btn-secondary btn-sm';
    btnStats.textContent = 'Details';
    btnStats.addEventListener('click', () => openStatsModal(drive));
    tdActions.appendChild(btnStats);

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
  if (!start || !end) return '-';
  const opts = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const s = new Date(start).toLocaleString('en-PH', opts);
  const e = new Date(end).toLocaleString('en-PH', opts);
  return `${s} - ${e}`;
}

// ─── Cancel modal ────────────────────────────────────────────────────────────

function openCancelModal(drive, user) {
  // Build modal body
  const body = document.createElement('div');

  const msg = document.createElement('p');
  msg.style.marginBottom = '16px';
  msg.textContent = `You are about to cancel "${drive.name}". This cannot be undone.`;
  body.appendChild(msg);

  const label = document.createElement('label');
  label.htmlFor = 'modal-cancel-reason';
  label.style.cssText = 'display:block;font-size:13px;font-weight:600;margin-bottom:4px;';
  label.textContent = 'Cancellation Reason *';
  body.appendChild(label);

  const textarea = document.createElement('textarea');
  textarea.id = 'modal-cancel-reason';
  textarea.rows = 3;
  textarea.placeholder = 'State the reason for cancellation…';
  textarea.style.cssText = 'width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:4px;font-size:14px;font-family:inherit;resize:vertical;';
  body.appendChild(textarea);

  const errorEl = document.createElement('div');
  errorEl.style.cssText = 'font-size:12px;color:#c00;margin-top:4px;min-height:16px;';
  body.appendChild(errorEl);

  openModal('Cancel Blood Drive', body, [
    {
      label:     'Go Back',
      className: 'btn-secondary',
      onClick:   () => closeModal(),
    },
    {
      label:     'Confirm Cancel',
      className: 'btn-danger',
      onClick:   async (e) => {
        const reason = textarea.value.trim();
        const validation = validateCancelForm({ cancellation_reason: reason });

        if (!validation.valid) {
          errorEl.textContent = validation.message;
          return;
        }

        errorEl.textContent = '';
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = 'Cancelling…';

        try {
          await cancelDrive(drive.drive_id, reason);
          closeModal();
          showToast(`"${drive.name}" has been cancelled.`, 'success');
          await renderDrivesTable(user);
        } catch (err) {
          errorEl.textContent = err.message;
          btn.disabled = false;
          btn.textContent = 'Confirm Cancel';
        }
      },
    },
  ]);

  // Focus the textarea after modal opens
  setTimeout(() => textarea.focus(), 50);
}

// ─── Participant panel ────────────────────────────────────────────────────────

let _currentDrive = null;
let _currentUser  = null;

// Track currently assigned participant user_ids — updated on every renderCurrentParticipants()
// Used to exclude already-assigned users from the available list
const _assignedIds = new Set();

// Track manually checked volunteers for Scenario 1 (manual selection)
const _checkedVolunteers = new Map(); // user_id → volunteer object

export function initParticipantPanel() {
  document.getElementById('panel-close-btn').addEventListener('click', closeParticipantPanel);
  document.getElementById('panel-overlay').addEventListener('click', closeParticipantPanel);
  document.getElementById('panel-assign-btn').addEventListener('click', handleAutoAssign);
  document.getElementById('panel-assign-selected-btn').addEventListener('click', handleAssignSelected);

  document.getElementById('panel-role-filter').addEventListener('change', () => {
    _checkedVolunteers.clear();
    updateAssignSelectedBtn();
    renderAvailableVolunteers();
  });
  document.getElementById('panel-municipality-filter').addEventListener('input', debounce(() => {
    _checkedVolunteers.clear();
    updateAssignSelectedBtn();
    renderAvailableVolunteers();
  }, 400));
}

function closeParticipantPanel() {
  document.getElementById('participant-panel').classList.remove('panel--open');
  document.getElementById('panel-overlay').classList.remove('panel-overlay--visible');
  _currentDrive = null;
  _currentUser  = null;
  _checkedVolunteers.clear();
  _assignedIds.clear();
}

async function openParticipantPanel(drive, user) {
  _currentDrive = drive;
  _currentUser  = user;
  _checkedVolunteers.clear();

  document.getElementById('panel-drive-name').textContent = drive.name;
  document.getElementById('panel-municipality-filter').value = drive.city || '';
  document.getElementById('panel-role-filter').value = '';
  document.getElementById('panel-assign-count').value = 1;
  updateAssignSelectedBtn();

  // Hide the "Add Participants" section for terminal drives — cannot modify
  const isTerminal = drive.status === 'Ended' || drive.status === 'Cancelled';
  const addSection = document.getElementById('panel-add-section');
  if (addSection) addSection.style.display = isTerminal ? 'none' : '';

  document.getElementById('participant-panel').classList.add('panel--open');
  document.getElementById('panel-overlay').classList.add('panel-overlay--visible');

  await renderCurrentParticipants();
  if (!isTerminal) await renderAvailableVolunteers();
}

async function renderCurrentParticipants() {
  const container = document.getElementById('current-participants-list');
  container.innerHTML = '';

  showSkeleton('current-participants-list', 3, 'rows', 1);

  let participants;
  try {
    participants = await getDriveParticipants(_currentDrive.drive_id);
  } catch (err) {
    hideSkeleton('current-participants-list');
    const p = document.createElement('p');
    p.className = 'panel-error';
    p.textContent = 'Could not load participants. Try again.';
    container.appendChild(p);
    return;
  }

  hideSkeleton('current-participants-list');
  container.innerHTML = '';

  // Update the assigned IDs set so renderAvailableVolunteers can exclude them
  _assignedIds.clear();
  if (participants && participants.length > 0) {
    participants.forEach(p => _assignedIds.add(p.user_id));
  }

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

  const roleId       = document.getElementById('panel-role-filter').value;
  const municipality = document.getElementById('panel-municipality-filter').value.trim();

  showSkeleton('available-volunteers-list', 4, 'rows', 1);

  // Primary: always use getAvailableVolunteers — stable endpoint
  let volunteers;
  try {
    volunteers = await getAvailableVolunteers(roleId || null, municipality);
  } catch (err) {
    hideSkeleton('available-volunteers-list');
    container.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'panel-error';
    p.textContent = 'Could not load volunteers. Try again.';
    container.appendChild(p);
    return;
  }

  // Exclude already-assigned participants from the available list.
  // _assignedIds is populated by renderCurrentParticipants() which always runs first.
  if (_assignedIds.size > 0) {
    volunteers = volunteers.filter(v => !_assignedIds.has(v.user_id));
  }

  // Enhancement: if the drive has venue coordinates, replace with the
  // distance-sorted suggestions list (already excludes assigned users).
  // If suggestions fails for any reason, we already have the fallback list.
  if (_currentDrive.venue_latitude && _currentDrive.venue_longitude) {
    try {
      const suggested = await getSuggestedParticipants(_currentDrive.drive_id, roleId || '', 50);
      if (Array.isArray(suggested) && suggested.length >= 0) {
        // Apply municipality filter client-side on suggestions too
        volunteers = municipality
          ? suggested.filter(v => (v.address_municipality || '').toLowerCase().includes(municipality.toLowerCase()))
          : suggested;
      }
    } catch {
      // Suggestions failed — use the already-fetched fallback list, no action needed
    }
  }

  hideSkeleton('available-volunteers-list');
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

    // Checkbox for manual multi-select (Scenario 1)
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'volunteer-checkbox';
    checkbox.dataset.userId = v.user_id;
    checkbox.checked = _checkedVolunteers.has(v.user_id);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        _checkedVolunteers.set(v.user_id, v);
      } else {
        _checkedVolunteers.delete(v.user_id);
      }
      updateAssignSelectedBtn();
    });

    const info = document.createElement('div');
    info.className = 'volunteer-info';

    const name = document.createElement('span');
    name.className = 'volunteer-name';
    name.textContent = `${v.first_name} ${v.last_name}`;

    const metaParts = [v.role_name, v.address_municipality || null];
    if (v.distance_km !== null && v.distance_km !== undefined) {
      metaParts.push(`${Number(v.distance_km).toFixed(1)} km`);
    }

    const meta = document.createElement('span');
    meta.className = 'volunteer-meta';
    meta.textContent = metaParts.filter(Boolean).join(' · ');

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
        _checkedVolunteers.delete(v.user_id);
        updateAssignSelectedBtn();
        await renderCurrentParticipants();
        await renderAvailableVolunteers();
      } catch (err) {
        showToast(err.message, 'error');
        btnAdd.disabled = false;
        btnAdd.textContent = 'Assign';
      }
    });

    row.appendChild(checkbox);
    row.appendChild(info);
    row.appendChild(btnAdd);
    container.appendChild(row);
  });
}

function updateAssignSelectedBtn() {
  const btn = document.getElementById('panel-assign-selected-btn');
  const count = _checkedVolunteers.size;
  btn.disabled = count === 0;
  btn.textContent = count === 0 ? 'Assign Selected' : `Assign Selected (${count})`;
}

// Scenario 1 — assign manually checked volunteers
// Primary: bulk endpoint. Fallback: individual addParticipant calls.
async function handleAssignSelected() {
  const userIds = Array.from(_checkedVolunteers.keys());
  if (userIds.length === 0) return;

  const btn = document.getElementById('panel-assign-selected-btn');
  btn.disabled = true;
  btn.textContent = 'Assigning…';

  // Try bulk endpoint first
  try {
    const result = await bulkAssign(_currentDrive.drive_id, { user_ids: userIds });
    const assigned = result.assigned ?? userIds.length;
    showToast(`${assigned} participant(s) assigned.`, 'success');
    _checkedVolunteers.clear();
    updateAssignSelectedBtn();
    await renderCurrentParticipants();
    await renderAvailableVolunteers();
    return;
  } catch {
    // Bulk endpoint unavailable — fall through to individual calls
  }

  // Fallback: assign one by one
  const volunteers = Array.from(_checkedVolunteers.values());
  let successCount = 0;
  for (const v of volunteers) {
    try {
      await addParticipant(_currentDrive.drive_id, v.user_id);
      successCount++;
    } catch {
      // skip already-assigned
    }
  }

  if (successCount === 0) {
    showToast('None could be assigned. They may already be assigned.', 'error');
  } else {
    showToast(`${successCount} participant(s) assigned.`, 'success');
  }

  _checkedVolunteers.clear();
  updateAssignSelectedBtn();
  await renderCurrentParticipants();
  await renderAvailableVolunteers();
}

// Scenario 2 — auto-assign top N by nearest distance
// Primary: uses backend bulk endpoint (picks nearest by distance server-side)
// Fallback: fetches available list and assigns top N client-side one by one
async function handleAutoAssign() {
  const countInput = document.getElementById('panel-assign-count');
  const roleId     = document.getElementById('panel-role-filter').value;

  const validation = validateAutoAssignCount(countInput.value);
  if (!validation.valid) {
    showToast(validation.message, 'error');
    return;
  }

  const assignBtn = document.getElementById('panel-assign-btn');
  assignBtn.disabled = true;
  assignBtn.textContent = 'Assigning…';

  // Try the bulk endpoint first (distance-sorted by backend)
  if (_currentDrive.venue_latitude && _currentDrive.venue_longitude) {
    try {
      const payload = { target_count: validation.count };
      if (roleId) payload.role_id = parseInt(roleId, 10);

      const result = await bulkAssign(_currentDrive.drive_id, payload);
      const assigned = result.assigned ?? validation.count;
      const failed   = result.failed  ?? 0;

      if (assigned === 0) {
        showToast('No volunteers could be assigned. They may already be assigned or none are available.', 'error');
      } else if (failed > 0) {
        showToast(`${assigned} assigned, ${failed} skipped (already assigned or unavailable).`, 'success');
      } else {
        showToast(`${assigned} participant(s) auto-assigned by nearest distance.`, 'success');
      }

      await renderCurrentParticipants();
      await renderAvailableVolunteers();
      assignBtn.disabled = false;
      assignBtn.textContent = 'Auto-assign';
      return;
    } catch {
      // Bulk endpoint failed — fall through to client-side assignment below
    }
  }

  // Fallback: fetch available list and assign top N one by one
  const municipality = document.getElementById('panel-municipality-filter').value.trim();
  let volunteers;
  try {
    volunteers = await getAvailableVolunteers(roleId || null, municipality);
  } catch (err) {
    showToast('Could not fetch volunteers for auto-assign.', 'error');
    assignBtn.disabled = false;
    assignBtn.textContent = 'Auto-assign';
    return;
  }

  const toAssign = volunteers.slice(0, validation.count);

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
      // skip already-assigned or errors per volunteer
    }
  }

  if (successCount === 0) {
    showToast('No volunteers could be assigned. They may already be assigned.', 'error');
  } else {
    showToast(`${successCount} participant(s) assigned.`, 'success');
  }

  await renderCurrentParticipants();
  await renderAvailableVolunteers();

  assignBtn.disabled = false;
  assignBtn.textContent = 'Auto-assign';
}

// ─── Drive detail modal (About + Statistics tabs) ─────────────────────────────

async function openStatsModal(drive) {
  const body = document.createElement('div');
  body.className = 'drive-detail-body';

  // Tab nav
  const tabsNav = document.createElement('div');
  tabsNav.className = 'drive-tabs-nav';

  const aboutBtn = document.createElement('button');
  aboutBtn.type = 'button';
  aboutBtn.className = 'drive-tab-btn drive-tab-btn--active';
  aboutBtn.textContent = 'About';

  const statsBtn = document.createElement('button');
  statsBtn.type = 'button';
  statsBtn.className = 'drive-tab-btn';
  statsBtn.textContent = 'Statistics';

  tabsNav.appendChild(aboutBtn);
  tabsNav.appendChild(statsBtn);
  body.appendChild(tabsNav);

  // Panes
  const aboutPane = document.createElement('div');
  aboutPane.className = 'drive-tab-pane';

  const statsPane = document.createElement('div');
  statsPane.className = 'drive-tab-pane';
  statsPane.style.display = 'none';

  body.appendChild(aboutPane);
  body.appendChild(statsPane);

  const switchTab = (tab) => {
    const isAbout = tab === 'about';
    aboutBtn.classList.toggle('drive-tab-btn--active', isAbout);
    statsBtn.classList.toggle('drive-tab-btn--active', !isAbout);
    aboutPane.style.display = isAbout ? '' : 'none';
    statsPane.style.display = isAbout ? 'none' : '';
  };

  aboutBtn.addEventListener('click', () => switchTab('about'));
  statsBtn.addEventListener('click', () => switchTab('stats'));

  openModal(drive.name, body, [
    { label: 'Close', className: 'btn-secondary', onClick: () => closeModal() },
  ]);

  // About tab — drive object from the list already has every field (contract.md
  // GET /api/blood-drives response), no extra fetch needed.
  renderAboutPane(drive, aboutPane);

  // Statistics tab — fetch in the background regardless of which tab is active,
  // so switching to Statistics is instant rather than triggering a fresh fetch.
  renderStatsPaneSkeleton(statsPane);
  try {
    const stats = await getDriveStats(drive.drive_id);
    renderStatsPane(stats, statsPane);
  } catch (err) {
    statsPane.innerHTML = '';
    const p = document.createElement('p');
    p.style.color = '#c00';
    p.textContent = `Could not load stats: ${err.message}`;
    statsPane.appendChild(p);
  }
}

function renderAboutPane(drive, container) {
  container.innerHTML = '';

  const venueParts   = [drive.venue_name, drive.building, drive.floor_room].filter(Boolean);
  const addressParts = [drive.street_address, drive.city, drive.province, drive.postal_code].filter(Boolean);
  const createdBy    = [drive.created_by_first, drive.created_by_last].filter(Boolean).join(' ');

  const fields = [
    ['Status',           drive.status || '-'],
    ['Branch',           drive.branch_name || '-'],
    ['Description',      drive.description || '-'],
    ['Venue',            venueParts.length ? venueParts.join(', ') : '-'],
    ['Venue Type',       drive.venue_type || '-'],
    ['Address',          addressParts.length ? addressParts.join(', ') : '-'],
    ['Date Range',       formatDateRange(drive.start_datetime, drive.end_datetime)],
    ['Slots Available',  drive.slots_available ?? '-'],
    ['Contact Person',   drive.contact_person || '-'],
    ['Contact Number',   drive.contact_number || '-'],
    ['Contact Email',    drive.contact_email || '-'],
    ['Created By',       createdBy || '-'],
  ];

  // Only show cancellation details when actually cancelled
  if (drive.status === 'Cancelled') {
    const cancelledBy = [drive.cancelled_by_first, drive.cancelled_by_last].filter(Boolean).join(' ');
    fields.push(
      ['Cancelled By',         cancelledBy || '-'],
      ['Cancellation Reason',  drive.cancellation_reason || '-'],
    );
  }

  const dl = document.createElement('dl');
  dl.className = 'drive-detail-list';

  fields.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    dl.appendChild(dt);
    dl.appendChild(dd);
  });

  container.appendChild(dl);
}

function renderStatsPaneSkeleton(container) {
  container.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const row = document.createElement('div');
    row.style.cssText = 'height:14px;background:#eee;border-radius:2px;margin-bottom:8px;';
    container.appendChild(row);
  }
}

function renderStatsPane(stats, container) {
  container.innerHTML = '';

  const sections = [
    {
      heading: 'Donors',
      rows: [
        ['Total donors this drive', stats.total_donors],
        ['New donors registered',   stats.new_donors],
        ['Returning donors',        stats.returning_donors],
      ],
    },
    {
      heading: 'Interviews',
      rows: [
        ['Interviewed', stats.interviews_total],
        ['Passed',      stats.interviews_passed],
        ['Deferred',    stats.interviews_failed],
        ['Pending',     stats.interviews_pending],
      ],
    },
    {
      heading: 'Screenings',
      rows: [
        ['Screened',  stats.screenings_total],
        ['Eligible',  stats.screenings_eligible],
        ['Deferred',  stats.screenings_deferred],
      ],
    },
    {
      heading: 'Donations & Collections',
      rows: [
        ['Donations recorded', stats.donations_total],
        ['QNS (too slow)',     stats.donations_qns],
        ['Valid donations',    stats.donations_valid],
        ['Collections',       stats.collections_total],
        ['Safe / Ready',      stats.collections_safe],
        ['Pending testing',   stats.collections_pending],
        ['Rejected',          stats.collections_rejected],
      ],
    },
  ];

  sections.forEach(({ heading, rows }) => {
    const h4 = document.createElement('h4');
    h4.style.cssText = 'font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#888;margin:16px 0 8px;';
    h4.textContent = heading;
    container.appendChild(h4);

    const table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:14px;';

    rows.forEach(([label, value]) => {
      const tr = document.createElement('tr');

      const tdLabel = document.createElement('td');
      tdLabel.style.cssText = 'padding:5px 0;color:#444;';
      tdLabel.textContent = label;

      const tdValue = document.createElement('td');
      tdValue.style.cssText = 'padding:5px 0;text-align:right;font-weight:600;';
      tdValue.textContent = value ?? 0;

      tr.appendChild(tdLabel);
      tr.appendChild(tdValue);
      table.appendChild(tr);
    });

    container.appendChild(table);
  });
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}