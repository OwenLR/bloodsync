import { openModal, closeModal, confirmModal } from '../../components/modal.js';
import { showToast }                            from '../../components/toast.js';
import { BLOOD_REQUEST_STATUS }                 from '../../constants/statusConstants.js';
import { SOCKET_EVENTS }                        from '../../constants/socketEvents.js';
import { socket }                               from '../../core/socket.js';
import { refreshBadge }                         from '../notifications/notificationsUI.js';
import {
  getMyRequests,
  cancelRequest,
  markReceived,
} from './bloodRequestApi.js';

const LIST_ID     = 'requests-list';
const SKELETON_ID = 'requests-skeleton';
const ERROR_ID    = 'requests-error';

// Module-level cache of the currently rendered requests. Needed because
// cancelRequest()/markReceived() responses are raw DB rows with no joins
// (no hospital_name/branch_name) — see bloodRequestApi.js comments — so
// on success we patch this array's matching item in place rather than
// trusting the response to replace it. The socket listener does the same
// patch-in-place for staff-driven transitions.
let _requests = [];

// ---------------------------------------------------------------------------
// Public entry — called from the entry file
// ---------------------------------------------------------------------------

export async function renderRequestsList() {
  showSkeleton();

  try {
    _requests = await getMyRequests();
    hideSkeleton();
    renderList();
  } catch (err) {
    hideSkeleton();
    showLoadError(err.message);
  }
}

// ---------------------------------------------------------------------------
// Socket — blood_request_status
// Fires on staff-driven transitions only (Approved/Waiting/Released/Rejected
// via PATCH /:id/status or /:id/ready). Never fires for this requestor's own
// cancelRequest/markReceived actions — those update the UI from their own
// API response instead. See gochas.md #44.
// Payload: { request_id, new_status, patient_name, reason }
// ---------------------------------------------------------------------------

export function initRequestStatusListener() {
  if (!socket) return;
  socket.on(SOCKET_EVENTS.BLOOD_REQUEST_STATUS, handleStatusEvent);
}

function handleStatusEvent(payload) {
  const request = _requests.find(r => r.request_id === payload.request_id);
  if (!request) return; // not in the currently loaded list — nothing to patch

  request.status        = payload.new_status;
  request.denial_reason = payload.reason ?? request.denial_reason;

  renderList();
  showToast(`Request for ${payload.patient_name}: now ${payload.new_status}.`, 'info');
  refreshBadge(); // a DB notification was created for this transition too
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderList() {
  const list = document.getElementById(LIST_ID);
  list.textContent = '';

  if (!_requests.length) {
    list.style.display = 'none';
    showEmptyState();
    return;
  }

  hideEmptyState();
  list.style.display = '';
  _requests.forEach(r => list.appendChild(buildCard(r)));
}

function buildCard(request) {
  const card = document.createElement('div');
  card.className = 'request-card';
  card.dataset.requestId = request.request_id;

  const header = document.createElement('div');
  header.className = 'request-card-header';

  const patient = document.createElement('h3');
  patient.className   = 'request-card-patient';
  patient.textContent = request.patient_name;

  header.appendChild(patient);
  header.appendChild(statusBadge(request.status));
  card.appendChild(header);

  const meta = document.createElement('dl');
  meta.className = 'request-card-meta';
  addMetaRow(meta, 'Hospital', request.hospital_name);
  addMetaRow(meta, 'Branch',   request.branch_name);
  addMetaRow(meta, 'Urgency',  request.urgency_level);
  addMetaRow(meta, 'Submitted', formatDate(request.created_at));
  card.appendChild(meta);

  if (request.status === BLOOD_REQUEST_STATUS.REJECTED && request.denial_reason) {
    const reason = document.createElement('p');
    reason.className   = 'request-card-denial';
    reason.textContent = `Reason: ${request.denial_reason}`;
    card.appendChild(reason);
  }

  const actions = buildActions(request);
  if (actions) card.appendChild(actions);

  return card;
}

function statusBadge(status) {
  const span = document.createElement('span');
  span.className   = `status-badge status-badge--${status.toLowerCase().replace(/\s+/g, '-')}`;
  span.textContent = status;
  return span;
}

function addMetaRow(dl, label, value) {
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = value ?? '—';
  dl.appendChild(dt);
  dl.appendChild(dd);
}

// Cancel: Pending only. Received: Waiting only. No other status shows an action.
function buildActions(request) {
  if (request.status === BLOOD_REQUEST_STATUS.PENDING) {
    const div = document.createElement('div');
    div.className = 'request-card-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className   = 'btn-danger btn-xs';
    cancelBtn.textContent = 'Cancel Request';
    cancelBtn.addEventListener('click', () => handleCancel(request, cancelBtn));
    div.appendChild(cancelBtn);
    return div;
  }

  if (request.status === BLOOD_REQUEST_STATUS.WAITING) {
    const div = document.createElement('div');
    div.className = 'request-card-actions';

    const receivedBtn = document.createElement('button');
    receivedBtn.className   = 'btn-primary btn-xs';
    receivedBtn.textContent = 'Already Received';
    receivedBtn.addEventListener('click', () => handleReceived(request, receivedBtn));
    div.appendChild(receivedBtn);
    return div;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function handleCancel(request, btnEl) {
  const confirmed = await confirmModal(
    `Cancel the blood request for ${request.patient_name}? This cannot be undone.`,
    'Yes, Cancel',
    'No, Keep It',
    true
  );
  if (!confirmed) return;

  btnEl.disabled    = true;
  btnEl.textContent = 'Cancelling…';

  try {
    await cancelRequest(request.request_id);
    request.status = BLOOD_REQUEST_STATUS.CANCELLED;
    renderList();
    showToast('Request cancelled.', 'success');
  } catch (err) {
    btnEl.disabled    = false;
    btnEl.textContent = 'Cancel Request';
    showToast(err.message, 'error');
  }
}

async function handleReceived(request, btnEl) {
  const confirmed = await confirmModal(
    `Confirm you've received the blood units for ${request.patient_name}?`,
    'Confirm Received',
    'Not Yet',
    false
  );
  if (!confirmed) return;

  btnEl.disabled    = true;
  btnEl.textContent = 'Saving…';

  try {
    await markReceived(request.request_id);
    request.status = BLOOD_REQUEST_STATUS.RELEASED;
    renderList();
    showToast('Receipt confirmed. Thank you.', 'success');
  } catch (err) {
    btnEl.disabled    = false;
    btnEl.textContent = 'Already Received';
    showToast(err.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// Skeleton / error / empty state helpers
// ---------------------------------------------------------------------------

function showSkeleton() {
  document.getElementById(SKELETON_ID).style.display = '';
  document.getElementById(LIST_ID).style.display      = 'none';
  document.getElementById(ERROR_ID).textContent       = '';
}

function hideSkeleton() {
  document.getElementById(SKELETON_ID).style.display = 'none';
}

function showLoadError(message) {
  const el = document.getElementById(ERROR_ID);
  el.textContent = message || 'Could not load your requests. Please try again.';
}

function showEmptyState() {
  let empty = document.getElementById('requests-empty-state');
  if (!empty) {
    empty           = document.createElement('div');
    empty.id        = 'requests-empty-state';
    empty.className = 'empty-state';

    const h3 = document.createElement('h3');
    h3.textContent = 'No blood requests yet';
    const p = document.createElement('p');
    p.textContent = 'Submit a request and it will show up here.';

    empty.appendChild(h3);
    empty.appendChild(p);
    document.getElementById(LIST_ID).insertAdjacentElement('afterend', empty);
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