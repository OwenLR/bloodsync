import { openModal, closeModal, confirmModal } from '../../components/modal.js';
import { showToast }                            from '../../components/toast.js';
import { COLLECTION_STATUS }                    from '../../constants/statusConstants.js';
import {
  getCollectionsByBranch,
  getCollectionById,
  updateCollectionStatus,
} from './bloodCollectionsApi.js';

const TBODY_ID       = 'collections-tbody';
const SKELETON_ID    = 'collections-skeleton';
const ERROR_ID       = 'collections-error';
const TABLE_WRAP_ID  = 'collections-table-container';
const FILTER_ID      = 'status-filter';

let _branchId      = null;
let _allRows       = [];        // unfiltered cache from last fetch
let _activeFilter  = 'pending'; // 'pending' | 'reviewed'

// ---------------------------------------------------------------------------
// Public entry — called from the entry file
// ---------------------------------------------------------------------------

export async function renderCollectionsTable(branchId) {
  _branchId = branchId;

  showSkeleton();

  try {
    _allRows = await getCollectionsByBranch(_branchId);
    hideSkeleton();
    applyFilterAndRender();
  } catch (err) {
    hideSkeleton();
    showLoadError(err.message);
  }
}

export function initStatusFilter() {
  const select = document.getElementById(FILTER_ID);
  if (!select) return;

  select.value = _activeFilter;
  select.addEventListener('change', () => {
    _activeFilter = select.value;
    applyFilterAndRender();
  });
}

// ---------------------------------------------------------------------------
// Filtering + render
//
// Two states only — this page is the testing queue, not a full collection
// history. 'pending' = needs a decision. 'reviewed' = Safe or Rejected,
// kept visible for short-term reference only. Disposed/Withdrawn belong to
// Blood Unit Inventory, not this page — never filtered here.
// ---------------------------------------------------------------------------

function applyFilterAndRender() {
  const rows = _activeFilter === 'pending'
    ? _allRows.filter(r => r.status === COLLECTION_STATUS.PENDING)
    : _allRows.filter(r =>
        r.status === COLLECTION_STATUS.SAFE || r.status === COLLECTION_STATUS.REJECTED
      );

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

function buildRow(collection) {
  const tr = document.createElement('tr');

  tr.appendChild(cell(`${collection.first_name} ${collection.last_name}`));
  tr.appendChild(cell(collection.blood_type));
  tr.appendChild(cell(collection.component));
  tr.appendChild(cell(`${collection.volume_ml} mL`));
  tr.appendChild(cell(formatDate(collection.collection_date)));
  tr.appendChild(statusCell(collection));
  tr.appendChild(actionsCell(collection));

  return tr;
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text ?? '—';
  return td;
}

function statusCell(collection) {
  const td   = document.createElement('td');
  const span = document.createElement('span');
  span.className   = `status-badge status-badge--${collection.status.toLowerCase()}`;
  span.textContent = collection.status;
  td.appendChild(span);

  if (collection.is_qns) {
    const qnsTag = document.createElement('span');
    qnsTag.className   = 'qns-tag';
    qnsTag.textContent = 'QNS';
    qnsTag.title       = collection.qns_reason || 'Quantity not sufficient';
    td.appendChild(qnsTag);
  }

  return td;
}

// Actions only apply to Pending rows — Safe/Rejected are terminal-for-this-page
// (gochas.md #12 pattern: once a record reaches a settled state here, no further
// action buttons on this page; lifecycle continues elsewhere, e.g. Blood Units).
function actionsCell(collection) {
  const td = document.createElement('td');
  td.className = 'table-actions';

  const detailsBtn = document.createElement('button');
  detailsBtn.className   = 'btn-secondary btn-xs';
  detailsBtn.textContent = 'Details';
  detailsBtn.addEventListener('click', () => openDetailModal(collection.collection_id));
  td.appendChild(detailsBtn);

  if (collection.status === COLLECTION_STATUS.PENDING) {
    const safeBtn = document.createElement('button');
    safeBtn.className   = 'btn-primary btn-xs';
    safeBtn.textContent = 'Mark Safe';

    // gochas.md #7 / contract.md: QNS collections cannot be marked Safe.
    // Backend (assertNotQns) is the actual enforcer — this disabled state
    // is UX only, to avoid a dead-end 400 click, not a security boundary.
    if (collection.is_qns) {
      safeBtn.disabled = true;
      safeBtn.title    = 'QNS collections cannot be marked Safe';
    } else {
      safeBtn.addEventListener('click', () => handleMarkSafe(collection));
    }
    td.appendChild(safeBtn);

    const rejectBtn = document.createElement('button');
    rejectBtn.className   = 'btn-danger btn-xs';
    rejectBtn.textContent = 'Reject';
    rejectBtn.addEventListener('click', () => openRejectModal(collection));
    td.appendChild(rejectBtn);
  }

  return td;
}

// ---------------------------------------------------------------------------
// Mark Safe — simple confirm
// ---------------------------------------------------------------------------

async function handleMarkSafe(collection) {
  const confirmed = await confirmModal(
    `Mark this ${collection.component} collection as Safe? This will create a blood unit in inventory.`,
    'Mark Safe'
  );
  if (!confirmed) return;

  try {
    await updateCollectionStatus(collection.collection_id, COLLECTION_STATUS.SAFE);
    showToast('Collection marked as Safe.', 'success');
    await renderCollectionsTable(_branchId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// Reject — dedicated modal with reason textarea
// (rules.md: PATCH /:id/status requires `reason` for Rejected — enforced
// here client-side for UX, and by the backend model regardless)
// ---------------------------------------------------------------------------

function openRejectModal(collection) {
  const body = document.createElement('div');

  const label = document.createElement('label');
  label.setAttribute('for', 'reject-reason-input');
  label.textContent = 'Reason for rejection';
  label.className   = 'modal-field-label';

  const textarea = document.createElement('textarea');
  textarea.id          = 'reject-reason-input';
  textarea.rows         = 4;
  textarea.placeholder  = 'e.g. Hemolyzed sample, contamination suspected…';
  textarea.className    = 'modal-textarea';

  const errorEl = document.createElement('div');
  errorEl.className = 'field-error';
  errorEl.setAttribute('aria-live', 'polite');

  body.appendChild(label);
  body.appendChild(textarea);
  body.appendChild(errorEl);

  openModal('Reject Collection', body, [
    {
      label:     'Cancel',
      className: 'btn-secondary',
      onClick:   closeModal,
    },
    {
      label:     'Reject Collection',
      className: 'btn-danger',
      onClick:   () => submitReject(collection, textarea, errorEl),
    },
  ]);

  textarea.focus();
}

async function submitReject(collection, textarea, errorEl) {
  const reason = textarea.value.trim();

  if (!reason) {
    errorEl.textContent = 'A reason is required to reject a collection.';
    return;
  }

  try {
    await updateCollectionStatus(collection.collection_id, COLLECTION_STATUS.REJECTED, reason);
    closeModal();
    showToast('Collection rejected.', 'success');
    await renderCollectionsTable(_branchId);
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

// ---------------------------------------------------------------------------
// Detail modal — full record via GET /:id
// ---------------------------------------------------------------------------

async function openDetailModal(collectionId) {
  const loadingBody = document.createElement('p');
  loadingBody.textContent = 'Loading…';
  openModal('Collection Details', loadingBody, [
    { label: 'Close', className: 'btn-secondary', onClick: closeModal },
  ]);

  try {
    const detail = await getCollectionById(collectionId);
    const body   = buildDetailBody(detail);
    openModal('Collection Details', body, [
      { label: 'Close', className: 'btn-secondary', onClick: closeModal },
    ]);
  } catch {
    const errorBody = document.createElement('p');
    errorBody.textContent = 'Could not load collection details. Please try again.';
    openModal('Collection Details', errorBody, [
      { label: 'Close', className: 'btn-secondary', onClick: closeModal },
    ]);
  }
}

function buildDetailBody(detail) {
  const dl = document.createElement('dl');
  dl.className = 'detail-list';

  addDetailRow(dl, 'Donor',           `${detail.first_name} ${detail.last_name}`);
  addDetailRow(dl, 'Blood Type',      detail.blood_type);
  addDetailRow(dl, 'Component',       detail.component);
  addDetailRow(dl, 'Volume',          `${detail.volume_ml} mL`);
  addDetailRow(dl, 'Barcode',         detail.barcode);
  addDetailRow(dl, 'Branch',          detail.branch_name);
  addDetailRow(dl, 'Collection Date', formatDate(detail.collection_date));
  addDetailRow(dl, 'Expiration Date', formatDate(detail.expiration_date));
  addDetailRow(dl, 'Status',          detail.status);

  if (detail.is_qns) {
    addDetailRow(dl, 'QNS Reason', detail.qns_reason);
  }

  addDetailRow(dl, 'Collected By',
    detail.collected_by_first ? `${detail.collected_by_first} ${detail.collected_by_last}` : '—');

  if (detail.status === COLLECTION_STATUS.SAFE) {
    addDetailRow(dl, 'Approved By',
      detail.approved_by_first ? `${detail.approved_by_first} ${detail.approved_by_last}` : '—');
    addDetailRow(dl, 'Approved At', formatDate(detail.approved_at));
  }

  if (detail.status === COLLECTION_STATUS.REJECTED) {
    addDetailRow(dl, 'Rejected At',      formatDate(detail.rejected_at));
    addDetailRow(dl, 'Rejection Reason', detail.rejection_reason);
  }

  if (detail.notes) {
    addDetailRow(dl, 'Notes', detail.notes);
  }

  return dl;
}

function addDetailRow(dl, label, value) {
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = value ?? '—';
  dl.appendChild(dt);
  dl.appendChild(dd);
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
  el.textContent = message || 'Could not load blood collections. Please try again.';
}

function showEmptyState() {
  let empty = document.getElementById('collections-empty-state');
  if (!empty) {
    empty            = document.createElement('div');
    empty.id         = 'collections-empty-state';
    empty.className  = 'empty-state';

    const h3 = document.createElement('h3');
    h3.textContent = 'No collections found';
    const p = document.createElement('p');
    p.textContent = 'There are no blood collections matching this view yet.';

    empty.appendChild(h3);
    empty.appendChild(p);
    document.getElementById(TABLE_WRAP_ID).insertAdjacentElement('afterend', empty);
  }
  empty.style.display = '';
}

function hideEmptyState() {
  const empty = document.getElementById('collections-empty-state');
  if (empty) empty.style.display = 'none';
}

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}