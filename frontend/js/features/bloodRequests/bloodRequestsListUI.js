import { openModal, closeModal }                from '../../components/modal.js';
import { showToast }                            from '../../components/toast.js';
import { BLOOD_REQUEST_STATUS }                 from '../../constants/statusConstants.js';
import { SOCKET_EVENTS }                        from '../../constants/socketEvents.js';
import { socket }                               from '../../core/socket.js';
import { refreshBadge }                         from '../notifications/notificationsUI.js';
import {
  getMyRequests,
  getMyRequestDetail,
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

  const actions = document.createElement('div');
  actions.className = 'request-card-actions';

  const viewBtn = document.createElement('button');
  viewBtn.type        = 'button';
  viewBtn.className   = 'btn-secondary btn-sm';
  viewBtn.textContent = 'View Details';
  viewBtn.addEventListener('click', () => openRequestDetail(request.request_id));
  actions.appendChild(viewBtn);

  card.appendChild(actions);

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
  dd.textContent = value ?? '-';
  dl.appendChild(dt);
  dl.appendChild(dd);
}

// ---------------------------------------------------------------------------
// Detail modal — "View Details" opens this. Fetches the fuller detail
// (blood type/unit breakdown, patient age, diagnosis, notes, uploaded
// document) via getMyRequestDetail(), then renders status-appropriate
// actions inline: Cancel (Pending) and a friendlier "Have you received
// your blood units?" prompt (Waiting) instead of a small ambiguous button
// living directly on the card.
// ---------------------------------------------------------------------------

async function openRequestDetail(requestId) {
  try {
    const detail = await getMyRequestDetail(requestId);
    renderDetailModal(detail);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderDetailModal(detail) {
  openModal(detail.patient_name || 'Request Details', buildDetailBody(detail), buildDetailButtons(detail));
}

function buildDetailBody(detail) {
  const wrap = document.createElement('div');
  wrap.appendChild(statusBadge(detail.status));

  const dl = document.createElement('dl');
  dl.className = 'detail-list';
  addMetaRow(dl, 'Hospital', detail.hospital_name);
  addMetaRow(dl, 'Branch',   detail.branch_name);
  if (detail.patient_age != null) addMetaRow(dl, 'Patient Age', detail.patient_age);
  if (detail.diagnosis)           addMetaRow(dl, 'Diagnosis', detail.diagnosis);
  addMetaRow(dl, 'Urgency',   detail.urgency_level);
  addMetaRow(dl, 'Submitted', formatDate(detail.created_at));
  if (detail.notes) addMetaRow(dl, 'Notes', detail.notes);
  if (detail.status === BLOOD_REQUEST_STATUS.REJECTED && detail.denial_reason) {
    addMetaRow(dl, 'Denial Reason', detail.denial_reason);
  }
  wrap.appendChild(dl);

  if (detail.items && detail.items.length) {
    const title = document.createElement('h3');
    title.textContent = 'Requested Items';
    title.style.marginTop = '16px';
    wrap.appendChild(title);

    const table = document.createElement('table');
    table.className = 'data-table';

    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Blood Type</th><th>Component</th><th>Requested</th><th>Fulfilled</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    detail.items.forEach((item) => {
      const tr = document.createElement('tr');
      tr.appendChild(dataCell(item.blood_type));
      tr.appendChild(dataCell(item.component));
      tr.appendChild(dataCell(item.units_requested));
      tr.appendChild(dataCell(item.units_fulfilled ?? '-'));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
  }

  // Own uploaded document — new-tab link, not an inline embed. Same CSP
  // reasoning as the Staff detail page: no frame-src directive is set
  // (falls back to default-src 'self'), so an iframe to a Cloudinary URL
  // would be silently blocked. A plain link navigation isn't subject to
  // page CSP.
  if (detail.request_form_path) {
    const link = document.createElement('a');
    link.href        = detail.request_form_path;
    link.target      = '_blank';
    link.rel         = 'noopener noreferrer';
    link.className   = 'btn-secondary btn-sm';
    link.textContent = 'View My Uploaded Form';
    link.style.display    = 'inline-block';
    link.style.marginTop  = '16px';
    wrap.appendChild(link);
  }

  if (detail.status === BLOOD_REQUEST_STATUS.WAITING) {
    const question = document.createElement('p');
    question.className     = 'modal-field-label';
    question.style.marginTop = '20px';
    question.textContent   = 'Have you received your blood units?';
    wrap.appendChild(question);
  }

  return wrap;
}

function buildDetailButtons(detail) {
  const buttons = [
    { label: 'Close', className: 'btn-secondary', onClick: closeModal },
  ];

  if (detail.status === BLOOD_REQUEST_STATUS.PENDING) {
    buttons.push({
      label:     'Cancel Request',
      className: 'btn-danger',
      onClick:   () => confirmCancelInModal(detail),
    });
  }

  if (detail.status === BLOOD_REQUEST_STATUS.WAITING) {
    buttons.push({
      label:     "Yes, I've Received It",
      className: 'btn-primary',
      onClick:   () => submitReceivedFromModal(detail),
    });
  }

  return buttons;
}

// Re-invokes openModal() with confirm-step content — same single reusable
// dialog, just replacing what's shown, rather than stacking a second
// modal instance on top of the first.
function confirmCancelInModal(detail) {
  const body = document.createElement('p');
  body.textContent = `Cancel the blood request for ${detail.patient_name}? This cannot be undone.`;

  openModal('Cancel Request', body, [
    { label: 'No, Keep It', className: 'btn-secondary', onClick: closeModal },
    {
      label:     'Yes, Cancel',
      className: 'btn-danger',
      onClick:   () => submitCancel(detail),
    },
  ]);
}

async function submitCancel(detail) {
  try {
    await cancelRequest(detail.request_id);
    patchCachedStatus(detail.request_id, BLOOD_REQUEST_STATUS.CANCELLED);
    closeModal();
    renderList();
    showToast('Request cancelled.', 'success');
  } catch (err) {
    closeModal();
    showToast(err.message, 'error');
  }
}

async function submitReceivedFromModal(detail) {
  try {
    await markReceived(detail.request_id);
    patchCachedStatus(detail.request_id, BLOOD_REQUEST_STATUS.RELEASED);
    closeModal();
    renderList();
    showToast('Receipt confirmed. Thank you.', 'success');
  } catch (err) {
    closeModal();
    showToast(err.message, 'error');
  }
}

// Both cancelRequest/markReceived return raw DB rows with no joins (see
// bloodRequestApi.js) — patch only the status field into the cached list
// item rather than trusting the response to replace it.
function patchCachedStatus(requestId, newStatus) {
  const cached = _requests.find((r) => r.request_id === requestId);
  if (cached) cached.status = newStatus;
}

function dataCell(text) {
  const td = document.createElement('td');
  td.textContent = text ?? '-';
  return td;
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
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}