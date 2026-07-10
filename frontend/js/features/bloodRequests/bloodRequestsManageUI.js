import { showToast }            from '../../components/toast.js';
import { BLOOD_REQUEST_STATUS } from '../../constants/statusConstants.js';
import { SOCKET_EVENTS }        from '../../constants/socketEvents.js';
import { socket }               from '../../core/socket.js';
import { ROUTES }               from '../../constants/routes.js';
import { refreshBadge }         from '../notifications/notificationsUI.js';
import { getAllRequestsStaff }  from './bloodRequestApi.js';

const TBODY_ID      = 'requests-tbody';
const SKELETON_ID   = 'requests-skeleton';
const ERROR_ID      = 'requests-error';
const TABLE_WRAP_ID = 'requests-table-container';
const TAB_PENDING_ID = 'tab-pending';
const TAB_ALL_ID     = 'tab-all';

let _allRows      = []; // unfiltered cache from last fetch
let _activeTab     = 'pending'; // 'pending' | 'all'

// ---------------------------------------------------------------------------
// Public entry — called from the entry file
// ---------------------------------------------------------------------------

export async function renderRequestsTable() {
  showSkeleton();

  try {
    _allRows = await getAllRequestsStaff();
    hideSkeleton();
    applyTabAndRender();
  } catch (err) {
    hideSkeleton();
    showLoadError(err.message);
  }
}

export function initTabs() {
  const pendingTab = document.getElementById(TAB_PENDING_ID);
  const allTab      = document.getElementById(TAB_ALL_ID);
  if (!pendingTab || !allTab) return;

  pendingTab.addEventListener('click', () => switchTab('pending'));
  allTab.addEventListener('click', () => switchTab('all'));
  updateTabButtons();
}

function switchTab(tab) {
  _activeTab = tab;
  updateTabButtons();
  applyTabAndRender();
}

function updateTabButtons() {
  const pendingTab = document.getElementById(TAB_PENDING_ID);
  const allTab      = document.getElementById(TAB_ALL_ID);
  if (!pendingTab || !allTab) return;

  pendingTab.classList.toggle('tab-button--active', _activeTab === 'pending');
  allTab.classList.toggle('tab-button--active', _activeTab === 'all');
}

// ---------------------------------------------------------------------------
// Socket — blood_request_new
// Payload is partial (request_id, patient_name, urgency_level only — no
// hospital_name/branch_name/status/created_at), so rather than fabricate a
// row from missing fields, we refetch the full list on this event. This is
// the pattern flagged as future work in sessionState.md's Not Started
// section — wiring it in now as part of this build.
// ---------------------------------------------------------------------------

export function initNewRequestListener() {
  if (!socket) return;
  socket.on(SOCKET_EVENTS.BLOOD_REQUEST_NEW, handleNewRequestEvent);
}

async function handleNewRequestEvent(payload) {
  showToast(`New blood request from ${payload.patient_name}.`, 'info');
  refreshBadge();
  try {
    _allRows = await getAllRequestsStaff();
    applyTabAndRender();
  } catch {
    // Non-blocking — the branch-scoped list will just be stale until next
    // manual reload if this refetch fails; the toast/badge already fired.
  }
}

// ---------------------------------------------------------------------------
// Filtering + sort + render
//
// Pending tab: FCFS — oldest first, sorted client-side ascending by
// created_at. New incoming requests land at the bottom, not the top.
// getRequestsByBranch (backend) returns DESC by default — this sort is
// scoped to this page's display only, no backend/SQL change made.
// All tab: every status, backend's default order (newest first) kept as-is.
// ---------------------------------------------------------------------------

function applyTabAndRender() {
  let rows;

  if (_activeTab === 'pending') {
    rows = _allRows
      .filter(r => r.status === BLOOD_REQUEST_STATUS.PENDING)
      .slice()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else {
    rows = _allRows;
  }

  renderRows(rows);
}

function renderRows(rows) {
  const tbody = document.getElementById(TBODY_ID);
  const wrap  = document.getElementById(TABLE_WRAP_ID);
  tbody.textContent = '';

  if (!rows.length) {
    wrap.style.display = 'none';
    showEmptyState();
    return;
  }

  hideEmptyState();
  wrap.style.display = '';

  rows.forEach(row => tbody.appendChild(buildRow(row)));
}

function buildRow(request) {
  const tr = document.createElement('tr');

  tr.appendChild(cell(request.patient_name));
  tr.appendChild(cell(request.hospital_name));
  tr.appendChild(urgencyCell(request.urgency_level));
  tr.appendChild(cell(formatDate(request.created_at)));
  tr.appendChild(statusCell(request.status));
  tr.appendChild(actionsCell(request));

  return tr;
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text ?? '—';
  return td;
}

function urgencyCell(level) {
  const td = document.createElement('td');
  const span = document.createElement('span');
  span.className = `urgency-badge urgency-badge--${(level || '').toLowerCase()}`;
  span.textContent = level ?? '—';
  td.appendChild(span);
  return td;
}

function statusCell(status) {
  const td   = document.createElement('td');
  const span = document.createElement('span');
  span.className   = `status-badge status-badge--${status.toLowerCase().replace(/\s+/g, '-')}`;
  span.textContent = status;
  td.appendChild(span);
  return td;
}

function actionsCell(request) {
  const td = document.createElement('td');
  td.className = 'table-actions';

  const viewBtn = document.createElement('button');
  viewBtn.className   = 'btn-secondary btn-xs';
  viewBtn.textContent = 'View Details';
  viewBtn.addEventListener('click', () => {
    window.location.href = `${ROUTES.STAFF.BLOOD_REQUEST_DETAIL}?id=${request.request_id}`;
  });
  td.appendChild(viewBtn);

  return td;
}

// ---------------------------------------------------------------------------
// Skeleton / error / empty state helpers
// ---------------------------------------------------------------------------

function showSkeleton() {
  document.getElementById(SKELETON_ID).style.display = '';
  document.getElementById(TABLE_WRAP_ID).style.display = 'none';
  document.getElementById(ERROR_ID).textContent = '';
}

function hideSkeleton() {
  document.getElementById(SKELETON_ID).style.display = 'none';
}

function showLoadError(message) {
  const el = document.getElementById(ERROR_ID);
  el.textContent = message || 'Could not load blood requests. Please try again.';
}

function showEmptyState() {
  let empty = document.getElementById('requests-empty-state');
  if (!empty) {
    empty           = document.createElement('div');
    empty.id        = 'requests-empty-state';
    empty.className = 'empty-state';

    const h3 = document.createElement('h3');
    h3.textContent = _activeTab === 'pending' ? 'No pending requests' : 'No blood requests found';
    const p = document.createElement('p');
    p.textContent = _activeTab === 'pending'
      ? 'New requests from requestors will appear here.'
      : 'There are no blood requests for this branch yet.';

    empty.appendChild(h3);
    empty.appendChild(p);
    document.getElementById(TABLE_WRAP_ID).insertAdjacentElement('afterend', empty);
  } else {
    // Refresh text if the empty state already existed from a prior tab switch
    empty.querySelector('h3').textContent = _activeTab === 'pending' ? 'No pending requests' : 'No blood requests found';
    empty.querySelector('p').textContent = _activeTab === 'pending'
      ? 'New requests from requestors will appear here.'
      : 'There are no blood requests for this branch yet.';
  }
  empty.style.display = '';
}

function hideEmptyState() {
  const empty = document.getElementById('requests-empty-state');
  if (empty) empty.style.display = 'none';
}

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}