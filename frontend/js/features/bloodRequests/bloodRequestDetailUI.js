import { openModal, closeModal, confirmModal } from '../../components/modal.js';
import { showToast }                            from '../../components/toast.js';
import { BLOOD_REQUEST_STATUS }                 from '../../constants/statusConstants.js';
import {
  getRequestById,
  updateRequestStatus,
  markReadyForPickup,
} from './bloodRequestApi.js';

const CONTENT_ID  = 'detail-content';
const SKELETON_ID = 'detail-skeleton';
const ERROR_ID    = 'detail-error';

let _requestId = null;

// ---------------------------------------------------------------------------
// Public entry — called from the entry file
// ---------------------------------------------------------------------------

export async function renderRequestDetail(requestId) {
  _requestId = requestId;
  await loadAndRender();
}

async function loadAndRender() {
  showSkeleton();

  try {
    const detail = await getRequestById(_requestId);
    hideSkeleton();
    renderDetail(detail);
  } catch (err) {
    hideSkeleton();
    showLoadError(err.message);
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderDetail(detail) {
  const content = document.getElementById(CONTENT_ID);
  content.textContent = '';
  content.style.display = '';

  content.appendChild(buildHeader(detail));
  content.appendChild(buildPatientSection(detail));
  content.appendChild(buildItemsSection(detail));
  content.appendChild(buildDocumentSection(detail));

  if (detail.reservations && detail.reservations.length) {
    content.appendChild(buildReservationsSection(detail));
  }

  content.appendChild(buildActionsSection(detail));
  content.appendChild(buildLogsSection(detail));
}

function buildHeader(detail) {
  const header = document.createElement('div');
  header.className = 'detail-page-header';

  const title = document.createElement('h2');
  title.textContent = detail.patient_name;

  const badge = document.createElement('span');
  badge.className   = `status-badge status-badge--${detail.status.toLowerCase().replace(/\s+/g, '-')}`;
  badge.textContent = detail.status;

  header.appendChild(title);
  header.appendChild(badge);
  return header;
}

function buildPatientSection(detail) {
  const section = document.createElement('section');
  section.className = 'detail-section';

  const dl = document.createElement('dl');
  dl.className = 'detail-list';

  addRow(dl, 'Requestor',  `${detail.first_name} ${detail.last_name}`);
  addRow(dl, 'Hospital',   detail.hospital_name);
  addRow(dl, 'Branch',     detail.branch_name);
  addRow(dl, 'Patient Age', detail.patient_age);
  addRow(dl, 'Diagnosis',  detail.diagnosis);
  addRow(dl, 'Urgency',    detail.urgency_level);
  addRow(dl, 'Submitted',  formatDate(detail.created_at));

  if (detail.notes) addRow(dl, 'Notes', detail.notes);

  if (detail.status === BLOOD_REQUEST_STATUS.REJECTED && detail.denial_reason) {
    addRow(dl, 'Denial Reason', detail.denial_reason);
  }

  section.appendChild(dl);
  return section;
}

function buildItemsSection(detail) {
  const section = document.createElement('section');
  section.className = 'detail-section';

  const title = document.createElement('h3');
  title.textContent = 'Requested Items';
  section.appendChild(title);

  const table = document.createElement('table');
  table.className = 'data-table';

  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Blood Type</th><th>Component</th><th>Requested</th><th>Fulfilled</th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  (detail.items || []).forEach(item => {
    const tr = document.createElement('tr');
    tr.appendChild(cell(item.blood_type));
    tr.appendChild(cell(item.component));
    tr.appendChild(cell(item.units_requested));
    tr.appendChild(cell(item.units_fulfilled ?? '-'));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  section.appendChild(table);
  return section;
}

// Document viewer — "Open Document" link in a new tab, no inline embed.
// CSP has no frame-src directive (falls back to default-src 'self'), so an
// iframe to a Cloudinary URL would be blocked. Navigating via a plain link
// isn't subject to page CSP, so this works without any backend change.
function buildDocumentSection(detail) {
  const section = document.createElement('section');
  section.className = 'detail-section';

  const title = document.createElement('h3');
  title.textContent = 'Request Form Document';
  section.appendChild(title);

  if (!detail.request_form_path) {
    const p = document.createElement('p');
    p.className   = 'detail-empty-note';
    p.textContent = 'No document was attached to this request.';
    section.appendChild(p);
    return section;
  }

  const link = document.createElement('a');
  link.href        = detail.request_form_path;
  link.target      = '_blank';
  link.rel         = 'noopener noreferrer';
  link.className   = 'btn-secondary';
  link.textContent = 'Open Document';
  section.appendChild(link);

  return section;
}

function buildReservationsSection(detail) {
  const section = document.createElement('section');
  section.className = 'detail-section';

  const title = document.createElement('h3');
  title.textContent = 'Reserved Units';
  section.appendChild(title);

  const table = document.createElement('table');
  table.className = 'data-table';

  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Blood Type</th><th>Component</th><th>Barcode</th><th>Branch</th><th>Expiration</th><th>Status</th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  detail.reservations.forEach(r => {
    const tr = document.createElement('tr');
    tr.appendChild(cell(r.blood_type));
    tr.appendChild(cell(r.component));
    tr.appendChild(cell(r.barcode));
    tr.appendChild(cell(r.branch_name));
    tr.appendChild(cell(formatDate(r.expiration_date)));
    tr.appendChild(cell(r.status));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  section.appendChild(table);
  return section;
}

function buildLogsSection(detail) {
  const section = document.createElement('section');
  section.className = 'detail-section';

  const title = document.createElement('h3');
  title.textContent = 'Status History';
  section.appendChild(title);

  const logs = detail.logs || [];
  if (!logs.length) {
    const p = document.createElement('p');
    p.className   = 'detail-empty-note';
    p.textContent = 'No status changes recorded yet.';
    section.appendChild(p);
    return section;
  }

  const list = document.createElement('ul');
  list.className = 'status-log-list';

  logs.forEach(log => {
    const item = document.createElement('li');
    item.className = 'status-log-item';

    const line = document.createElement('p');
    const fromText = log.old_status ? `${log.old_status} → ` : '';
    // changed_by_id is a raw user_id — backend doesn't join a name for logs,
    // so we can only show whether staff or the requestor made the change.
    line.textContent = `${fromText}${log.new_status} — by ${capitalize(log.changed_by_type)}, ${formatDate(log.created_at)}`;
    item.appendChild(line);

    if (log.notes) {
      const notes = document.createElement('p');
      notes.className   = 'status-log-notes';
      notes.textContent = log.notes;
      item.appendChild(notes);
    }

    list.appendChild(item);
  });

  section.appendChild(list);
  return section;
}

// ---------------------------------------------------------------------------
// Actions — gated strictly by contract.md's valid transitions:
// Pending → Approved | Rejected
// Approved → Waiting | Rejected
// Waiting → Released | Rejected
// Released, Rejected, Cancelled — terminal, no actions shown.
// ---------------------------------------------------------------------------

function buildActionsSection(detail) {
  const section = document.createElement('section');
  section.className = 'detail-section detail-actions';

  const status = detail.status;

  if (status === BLOOD_REQUEST_STATUS.PENDING) {
    section.appendChild(actionButton('Approve', 'btn-primary', (btn) => handleApprove(detail, btn)));
    section.appendChild(actionButton('Reject', 'btn-danger', (btn) => handleReject(detail, btn)));
  } else if (status === BLOOD_REQUEST_STATUS.APPROVED) {
    section.appendChild(actionButton('Mark Ready for Pickup', 'btn-primary', (btn) => handleMarkReady(detail, btn)));
    section.appendChild(actionButton('Reject', 'btn-danger', (btn) => handleReject(detail, btn)));
  } else if (status === BLOOD_REQUEST_STATUS.WAITING) {
    section.appendChild(actionButton('Release to Requestor', 'btn-primary', (btn) => handleRelease(detail, btn)));
    section.appendChild(actionButton('Reject', 'btn-danger', (btn) => handleReject(detail, btn)));
  }
  // Released / Rejected / Cancelled — no buttons, section renders empty.

  return section;
}

function actionButton(label, className, onClick) {
  const btn = document.createElement('button');
  btn.className   = className;
  btn.textContent = label;
  btn.addEventListener('click', () => onClick(btn));
  return btn;
}

async function handleApprove(detail, btnEl) {
  const confirmed = await confirmModal(
    `Approve this request for ${detail.patient_name}? Blood units will be reserved automatically.`,
    'Approve',
    'Cancel',
    false
  );
  if (!confirmed) return;

  await runAction(btnEl, 'Approving…', async () => {
    await updateRequestStatus(_requestId, BLOOD_REQUEST_STATUS.APPROVED);
    showToast('Request approved.', 'success');
  });
}

async function handleMarkReady(detail, btnEl) {
  const confirmed = await confirmModal(
    `Mark units as ready for pickup for ${detail.patient_name}?`,
    'Mark Ready',
    'Cancel',
    false
  );
  if (!confirmed) return;

  await runAction(btnEl, 'Saving…', async () => {
    await markReadyForPickup(_requestId);
    showToast('Request marked as ready for pickup.', 'success');
  });
}

async function handleRelease(detail, btnEl) {
  const confirmed = await confirmModal(
    `Release the reserved units for ${detail.patient_name}? This confirms they were handed over.`,
    'Release',
    'Cancel',
    false
  );
  if (!confirmed) return;

  await runAction(btnEl, 'Releasing…', async () => {
    await updateRequestStatus(_requestId, BLOOD_REQUEST_STATUS.RELEASED);
    showToast('Units released.', 'success');
  });
}

// Reject requires a reason — dedicated modal, same pattern as
// bloodCollectionsUI.js's openRejectModal.
function handleReject(detail, btnEl) {
  const body = document.createElement('div');

  const label = document.createElement('label');
  label.setAttribute('for', 'reject-reason-input');
  label.textContent = 'Reason for rejection';
  label.className   = 'modal-field-label';

  const textarea = document.createElement('textarea');
  textarea.id          = 'reject-reason-input';
  textarea.rows        = 4;
  textarea.placeholder = 'e.g. Invalid request form, insufficient documentation…';
  textarea.className   = 'modal-textarea';

  const errorEl = document.createElement('div');
  errorEl.className = 'field-error';
  errorEl.setAttribute('aria-live', 'polite');

  body.appendChild(label);
  body.appendChild(textarea);
  body.appendChild(errorEl);

  openModal('Reject Request', body, [
    { label: 'Cancel', className: 'btn-secondary', onClick: closeModal },
    {
      label:     'Reject Request',
      className: 'btn-danger',
      onClick:   () => submitReject(textarea, errorEl),
    },
  ]);

  textarea.focus();
}

async function submitReject(textarea, errorEl) {
  const reason = textarea.value.trim();

  if (!reason) {
    errorEl.textContent = 'A reason is required to reject a request.';
    return;
  }

  try {
    await updateRequestStatus(_requestId, BLOOD_REQUEST_STATUS.REJECTED, reason);
    closeModal();
    showToast('Request rejected.', 'success');
    await loadAndRender();
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

// Shared runner for the three confirm-modal-gated actions (Approve/Ready/Release).
// Reject has its own flow above since it needs the reason modal instead of confirmModal.
async function runAction(btnEl, loadingText, action) {
  const originalText = btnEl.textContent;
  btnEl.disabled    = true;
  btnEl.textContent = loadingText;

  try {
    await action();
    await loadAndRender();
  } catch (err) {
    showToast(err.message, 'error');
    btnEl.disabled    = false;
    btnEl.textContent = originalText;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addRow(dl, label, value) {
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = value ?? '-';
  dl.appendChild(dt);
  dl.appendChild(dd);
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text ?? '-';
  return td;
}

function capitalize(str) {
  if (!str) return '-';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function showSkeleton() {
  document.getElementById(SKELETON_ID).style.display = '';
  document.getElementById(CONTENT_ID).style.display   = 'none';
  document.getElementById(ERROR_ID).textContent       = '';
}

function hideSkeleton() {
  document.getElementById(SKELETON_ID).style.display = 'none';
}

function showLoadError(message) {
  const el = document.getElementById(ERROR_ID);
  el.textContent = message || 'Could not load this request. Please try again.';
}

function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}