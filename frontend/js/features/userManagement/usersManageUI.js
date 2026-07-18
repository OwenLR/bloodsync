/**
 * usersManageUI.js — Admin Users page, 5 tabs: All, Staff & Admin,
 * Vol/Phleb, Requestor, Pending Approvals.
 *
 * All/Staff/Vol-Phleb/Requestor share ONE base fetch — GET /api/users
 * with no status param returns every role and every status in one call
 * (usersApi.js's getAllUsersAllStatuses()) — each tab just filters that
 * cached result client-side by role_id rather than making 4 separate
 * network calls. Pending stays on its own endpoint (GET
 * /api/volunteers/pending) since it's Vol/Phleb-specific application
 * data, not a status filter on /api/users.
 *
 * profile_img gap: /api/users has no profile_img field. To keep photos
 * on Vol/Phleb rows (All + Vol/Phleb tabs), profile_img/contact/address
 * are merged in from GET /api/volunteers/available by matching user_id
 * — but that endpoint only returns currently-Active Vol/Phleb, so a
 * Pending/Inactive/Declined Vol/Phleb row falls back to initials + "—"
 * for contact. Known gap, not a bug — would need a new backend endpoint
 * to close entirely. Staff/Admin/Requestor rows always show initials —
 * no endpoint currently exposes their photo for a GET (Staff/Admin's
 * own photo write path, PATCH /api/users/me/profile-img, is self-service
 * only and has no corresponding GET).
 *
 * Path: frontend/js/features/userManagement/usersManageUI.js
 */

import { ROUTES } from '../../constants/routes.js';
import { ROLES }  from '../../constants/roles.js';
import { showSkeleton, hideSkeleton } from '../../components/skeleton.js';
import { openModal, closeModal }      from '../../components/modal.js';
import { showToast }                  from '../../components/toast.js';
import {
  getPendingRegistrations,
  getActiveVolunteers,
} from './volunteerRegistrationApi.js';
import {
  getAllUsersAllStatuses,
  createStaffAccount,
  ROLE_OPTIONS,
} from './usersApi.js';
import { validateCreateStaffForm } from './adminStaffValidation.js';
import { getAllBranches }          from '../branches/branchesApi.js';

const TABS = ['all', 'staff', 'volphleb', 'requestor', 'pending'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
const STAFF_ADMIN_ROLES = [ROLES.ADMIN, ROLES.PRC_STAFF];
const VOL_PHLEB_ROLES   = [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST];

const TAB_COLUMN_COUNT = {
  all: 5, staff: 6, volphleb: 6, requestor: 4, pending: 6,
};

let _activeTab       = 'all';
let _allUsersCache    = null; // GET /api/users (all roles/statuses), shared by 4 tabs
let _volPhlebInfoMap  = null; // Map<user_id, { profile_img, contact, address_municipality, address_province }>
let _branchesCache    = null; // for the Create Staff modal's branch select

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export function initUsersPage() {
  initTabButtons();
  initCreateStaffButton();
  switchTab('all');
}

function initTabButtons() {
  TABS.forEach(tab => {
    const btn = document.getElementById(`tab-${tab}`);
    if (btn) btn.addEventListener('click', () => switchTab(tab));
  });
}

function switchTab(tab) {
  _activeTab = tab;

  const missing = [];
  TABS.forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    const section = document.getElementById(`section-${t}`);
    if (!btn || !section) { missing.push(t); return; }
    btn.classList.toggle('tab-button--active', t === tab);
    section.style.display = t === tab ? '' : 'none';
  });

  if (missing.length) {
    console.error('usersManageUI: missing expected element(s) for tab(s):', missing);
    return;
  }

  if (tab === 'pending') {
    loadPendingRegistrations();
  } else {
    loadFilteredUsers(tab);
  }
}

// ---------------------------------------------------------------------------
// Shared base fetch — All / Staff / Vol-Phleb / Requestor
// ---------------------------------------------------------------------------

async function loadFilteredUsers(tab, forceRefresh = false) {
  document.getElementById(`${tab}-error`).textContent = '';
  showSkeleton(`${tab}-tbody`, 6, 'table', TAB_COLUMN_COUNT[tab]);

  try {
    if (!_allUsersCache || forceRefresh) {
      _allUsersCache = await getAllUsersAllStatuses();
    }
    if ((tab === 'all' || tab === 'volphleb') && (!_volPhlebInfoMap || forceRefresh)) {
      _volPhlebInfoMap = await buildVolPhlebInfoMap();
    }

    hideSkeleton(`${tab}-tbody`);
    const rows = filterUsersForTab(tab, _allUsersCache);
    renderUserRows(tab, rows);
  } catch (err) {
    hideSkeleton(`${tab}-tbody`);
    document.getElementById(`${tab}-table-container`).style.display = 'none';
    document.getElementById(`${tab}-error`).textContent =
      err.message || 'Could not load users. Please try again.';
  }
}

async function buildVolPhlebInfoMap() {
  const map = new Map();
  try {
    const volPhlebRows = await getActiveVolunteers();
    volPhlebRows.forEach(v => {
      map.set(v.user_id, {
        profile_img:           v.profile_img,
        contact:                v.contact,
        address_municipality:   v.address_municipality,
        address_province:       v.address_province,
      });
    });
  } catch {
    // Non-fatal — rows just fall back to initials/— for contact if this fails
  }
  return map;
}

function filterUsersForTab(tab, allUsers) {
  switch (tab) {
    case 'all':
      // Exclude role_id 3 (Donor) defensively — Donors are managed via
      // the separate Donors page/table and never log in (gochas.md #5);
      // in practice no such row should exist in `users`, but filtering
      // here costs nothing and guards against stray data.
      return allUsers.filter(u => u.role_id !== ROLES.DONOR);
    case 'staff':
      return allUsers.filter(u => STAFF_ADMIN_ROLES.includes(u.role_id));
    case 'volphleb':
      return allUsers.filter(u => VOL_PHLEB_ROLES.includes(u.role_id));
    case 'requestor':
      return allUsers.filter(u => u.role_id === ROLES.REQUESTOR);
    default:
      return [];
  }
}

function renderUserRows(tab, rows) {
  const tbody = document.getElementById(`${tab}-tbody`);
  const wrap  = document.getElementById(`${tab}-table-container`);
  tbody.textContent = '';

  if (!rows.length) {
    wrap.style.display = 'none';
    showEmptyState(tab, ...EMPTY_STATE_TEXT[tab]);
    return;
  }

  hideEmptyState(tab);
  wrap.style.display = '';
  rows.forEach(user => tbody.appendChild(buildUserRow(tab, user)));
}

const EMPTY_STATE_TEXT = {
  all:       ['No users found', 'Accounts will appear here as they are created or register.'],
  staff:     ['No Admin/Staff accounts', 'Created accounts will appear here.'],
  volphleb:  ['No Volunteer/Phlebotomist accounts', 'Approved and pending accounts will appear here.'],
  requestor: ['No Requestor accounts', 'Requestor sign-ups will appear here.'],
};

function buildUserRow(tab, user) {
  const enriched = enrichWithVolPhlebInfo(user);
  const tr = document.createElement('tr');

  tr.appendChild(avatarCell(enriched));
  tr.appendChild(nameCell(enriched));
  tr.appendChild(cell(enriched.email));

  if (tab === 'all' || tab === 'staff' || tab === 'volphleb') {
    tr.appendChild(cell(buildRoleLabel(enriched)));
  }
  if (tab === 'volphleb') {
    tr.appendChild(cell(enriched.contact));
  }

  tr.appendChild(statusTextCell(enriched.status));

  if (tab === 'staff') {
    tr.appendChild(cell(formatDate(enriched.last_login)));
  }

  return tr;
}

function enrichWithVolPhlebInfo(user) {
  if (!_volPhlebInfoMap || !VOL_PHLEB_ROLES.includes(user.role_id)) return user;
  const info = _volPhlebInfoMap.get(user.user_id);
  return info ? { ...user, ...info } : user;
}

// ---------------------------------------------------------------------------
// Pending tab — unchanged from before, own endpoint
// ---------------------------------------------------------------------------

async function loadPendingRegistrations() {
  document.getElementById('pending-error').textContent = '';
  showSkeleton('pending-tbody', 6, 'table', TAB_COLUMN_COUNT.pending);

  try {
    const rows = await getPendingRegistrations();
    hideSkeleton('pending-tbody');
    renderPendingRows(rows);
  } catch (err) {
    hideSkeleton('pending-tbody');
    document.getElementById('pending-table-container').style.display = 'none';
    document.getElementById('pending-error').textContent =
      err.message || 'Could not load pending registrations. Please try again.';
  }
}

function renderPendingRows(rows) {
  const tbody = document.getElementById('pending-tbody');
  const wrap  = document.getElementById('pending-table-container');
  tbody.textContent = '';

  if (!rows.length) {
    wrap.style.display = 'none';
    showEmptyState('pending', 'No pending registrations', 'New Volunteer/Phlebotomist sign-ups awaiting review will appear here.');
    return;
  }

  hideEmptyState('pending');
  wrap.style.display = '';
  rows.forEach(row => tbody.appendChild(buildPendingRow(row)));
}

function buildPendingRow(profile) {
  const tr = document.createElement('tr');
  tr.appendChild(avatarCell(profile));
  tr.appendChild(cell(`${profile.first_name} ${profile.last_name}`));
  tr.appendChild(cell(profile.email));
  tr.appendChild(cell(profile.role_name));
  tr.appendChild(cell(formatDate(profile.created_at)));
  tr.appendChild(pendingActionsCell(profile));
  return tr;
}

function pendingActionsCell(profile) {
  const td = document.createElement('td');
  td.className = 'table-actions';

  const viewBtn = document.createElement('button');
  viewBtn.className   = 'btn-secondary btn-xs';
  viewBtn.textContent = 'Review';
  viewBtn.addEventListener('click', () => {
    window.location.href = `${ROUTES.ADMIN.USER_APPROVAL_DETAIL}?id=${profile.user_id}`;
  });
  td.appendChild(viewBtn);

  return td;
}

// ---------------------------------------------------------------------------
// Role label — "PRC {Branch} Staff" for PRC Staff rows
// ---------------------------------------------------------------------------

function buildRoleLabel(user) {
  if (user.role_id === ROLES.ADMIN) return 'Admin';
  if (user.role_id === ROLES.PRC_STAFF) {
    return user.branch_name ? `PRC ${user.branch_name} Staff` : 'PRC Staff';
  }
  return user.role_name || '—';
}

// ---------------------------------------------------------------------------
// Create Staff Account modal
// ---------------------------------------------------------------------------

function initCreateStaffButton() {
  const btn = document.getElementById('btn-create-staff');
  if (!btn) return;
  btn.addEventListener('click', openCreateStaffModal);
}

async function openCreateStaffModal() {
  const body = buildCreateStaffForm();

  openModal('Create Staff Account', body, [
    { label: 'Cancel', className: 'btn-secondary', onClick: closeModal },
    { label: 'Create Account', className: 'btn-primary', onClick: handleCreateStaffSubmit },
  ]);

  await populateBranchSelect();
  toggleBranchFieldVisibility();
}

function buildCreateStaffForm() {
  const form = document.createElement('div');
  form.className = 'form-stack';

  form.innerHTML = `
    <div class="form-field">
      <label for="staff-first-name">First name</label>
      <input id="staff-first-name" type="text" />
      <p id="staff-first-name-error" class="field-error"></p>
    </div>
    <div class="form-field">
      <label for="staff-last-name">Last name</label>
      <input id="staff-last-name" type="text" />
      <p id="staff-last-name-error" class="field-error"></p>
    </div>
    <div class="form-field">
      <label for="staff-email">Email</label>
      <input id="staff-email" type="email" />
      <p id="staff-email-error" class="field-error"></p>
    </div>
    <div class="form-field">
      <label for="staff-role">Role</label>
      <select id="staff-role">
        ${ROLE_OPTIONS.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}
      </select>
      <p id="staff-role-error" class="field-error"></p>
    </div>
    <div class="form-field" id="staff-branch-field">
      <label for="staff-branch">Branch</label>
      <select id="staff-branch">
        <option value="">Select Branch…</option>
      </select>
      <p id="staff-branch-error" class="field-error"></p>
    </div>
    <p class="detail-empty-note">
      A password will be generated automatically and emailed to this address.
    </p>
  `;

  form.querySelector('#staff-role').addEventListener('change', toggleBranchFieldVisibility);
  return form;
}

async function populateBranchSelect() {
  const branchSelect = document.getElementById('staff-branch');
  if (!branchSelect) return;

  try {
    if (!_branchesCache) {
      _branchesCache = await getAllBranches();
    }
    _branchesCache.forEach(branch => {
      const opt = document.createElement('option');
      opt.value = branch.branch_id;
      opt.textContent = branch.branch_name;
      branchSelect.appendChild(opt);
    });
  } catch {
    showToast('Could not load branch list.', 'error');
  }
}

function toggleBranchFieldVisibility() {
  const roleSelect  = document.getElementById('staff-role');
  const branchField = document.getElementById('staff-branch-field');
  if (!roleSelect || !branchField) return;
  branchField.style.display = Number(roleSelect.value) === ROLES.PRC_STAFF ? '' : 'none';
}

async function handleCreateStaffSubmit() {
  clearCreateStaffErrors();

  const data = {
    first_name: getFieldValue('staff-first-name'),
    last_name:  getFieldValue('staff-last-name'),
    email:      getFieldValue('staff-email'),
    role_id:    getFieldValue('staff-role'),
    branch_id:  getFieldValue('staff-branch') || null,
  };

  const errors = validateCreateStaffForm(data);
  if (errors.length > 0) {
    errors.forEach(({ field, message }) => {
      const el = document.getElementById(`staff-${field.replace('_', '-')}-error`);
      if (el) el.textContent = message;
    });
    return;
  }

  try {
    await createStaffAccount(data);
    showToast('Staff account created. Login details have been emailed.', 'success');
    closeModal();
    // Base cache is now stale for every tab that reads it — refetch and
    // re-render whichever tab the admin is currently viewing.
    if (_activeTab !== 'pending') {
      await loadFilteredUsers(_activeTab, true);
    }
  } catch (err) {
    showToast(err.message || 'Failed to create account.', 'error');
  }
}

function clearCreateStaffErrors() {
  document.querySelectorAll('#modal-overlay .field-error').forEach(el => { el.textContent = ''; });
}

function getFieldValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

// ---------------------------------------------------------------------------
// Avatar + status dot + shared cell helpers
// ---------------------------------------------------------------------------

function avatarCell(person) {
  const td = document.createElement('td');
  td.className = 'avatar-cell';

  if (person.profile_img && isImageUrl(person.profile_img)) {
    const img = document.createElement('img');
    img.src = person.profile_img;
    img.alt = `${person.first_name} ${person.last_name}`;
    img.className = 'avatar-thumb';
    td.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'avatar-placeholder';
    placeholder.textContent = initials(person.first_name, person.last_name);
    td.appendChild(placeholder);
  }

  return td;
}

// Name cell with a status dot, mirroring donorsUI.js's donor-name-cell
// pattern (dot + name together, dot carries a title tooltip).
function nameCell(user) {
  const td = document.createElement('td');
  td.className = 'user-name-cell';

  const wrap = document.createElement('div');
  wrap.className = 'user-name-wrap';

  const dot = document.createElement('span');
  const statusKey = (user.status || 'active').toLowerCase();
  dot.className = `status-dot status-dot-${statusKey}`;
  dot.title = user.status || 'Active';

  const nameText = document.createElement('span');
  nameText.textContent = `${user.first_name} ${user.last_name}`;

  wrap.appendChild(dot);
  wrap.appendChild(nameText);
  td.appendChild(wrap);
  return td;
}

function statusTextCell(status) {
  const td = document.createElement('td');
  const span = document.createElement('span');
  span.className = `status-badge status-badge--${(status || 'active').toLowerCase()}`;
  span.textContent = status || 'Active';
  td.appendChild(span);
  return td;
}

function isImageUrl(url) {
  const lower = url.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lower.includes(ext));
}

function initials(firstName, lastName) {
  const a = (firstName || '').charAt(0);
  const b = (lastName || '').charAt(0);
  return (a + b).toUpperCase() || '?';
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text || '—';
  return td;
}

function joinLocation(municipality, province) {
  if (!municipality && !province) return '—';
  return [municipality, province].filter(Boolean).join(', ');
}

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showEmptyState(tab, title, body) {
  const containerId = `${tab}-table-container`;
  let empty = document.getElementById(`${tab}-empty-state`);
  if (!empty) {
    empty           = document.createElement('div');
    empty.id        = `${tab}-empty-state`;
    empty.className = 'empty-state';
    const h3 = document.createElement('h3');
    const p  = document.createElement('p');
    empty.appendChild(h3);
    empty.appendChild(p);
    document.getElementById(containerId).insertAdjacentElement('afterend', empty);
  }
  empty.querySelector('h3').textContent = title;
  empty.querySelector('p').textContent  = body;
  empty.style.display = '';
}

function hideEmptyState(tab) {
  const empty = document.getElementById(`${tab}-empty-state`);
  if (empty) empty.style.display = 'none';
}