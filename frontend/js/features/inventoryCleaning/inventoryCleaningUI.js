// js/features/inventoryCleaning/inventoryCleaningUI.js
//
// Bulk expiry-cleanup workflow — separate page from Blood Units (Section 2),
// not a replacement for its per-unit Dispose/Withdraw actions.
// Per bloodsync.md #3-11:
//   - list all units, expiration highlighted (expired=red, nearing=orange, good=none)
//   - sorted expired-first (already true server-side — getUnitsByBranchAll
//     orders by expiration_date ASC, so past dates land first automatically)
//   - staff selects individual expired units OR select-all-expired
//   - confirm modal lists selected units, requires typing "remove"
//
// Scope decision (confirmed this session): only status === 'Expired' rows
// are selectable. Near-expiry is a visual warning only — bloodsync.md #7
// says "select each expired unit or select all", not near-expiry. This
// avoids letting staff accidentally bulk-dispose stock that hasn't expired.
//
// Row filtering: this page only shows rows relevant to expiry cleanup —
// 'Expired' and 'Available' (near or not). Fully terminal rows (Released,
// Disposed, Withdrawn, Separated) are filtered out client-side; they don't
// belong on a cleaning page and already have their own history view on the
// Blood Units page. Same page-scoping precedent as Blood Testing showing a
// narrower action set than the API technically allows.

import { openModal, closeModal }     from '../../components/modal.js';
import { showToast }                 from '../../components/toast.js';
import { BLOOD_UNIT_STATUS }         from '../../constants/statusConstants.js';
import {
  getUnitsByBranch,
  bulkDisposeUnits,
} from './inventoryCleaningApi.js';

const TBODY_ID       = 'cleaning-tbody';
const SKELETON_ID    = 'cleaning-skeleton';
const ERROR_ID       = 'cleaning-error';
const TABLE_WRAP_ID  = 'cleaning-table-container';
const SELECT_ALL_ID  = 'cleaning-select-all';
const REMOVE_BTN_ID  = 'cleaning-remove-btn';
const EMPTY_STATE_ID = 'cleaning-empty-state';

const CONFIRM_WORD = 'remove';

let _branchId  = null;
let _allRows   = [];              // full filtered row set, current render
let _selected  = new Set();       // unit_ids currently selected (expired only)

// ---------------------------------------------------------------------------
// Public entry — called from the entry file
// ---------------------------------------------------------------------------

export async function renderCleaningTable(branchId) {
  _branchId = branchId;
  _selected = new Set();

  showSkeleton();

  try {
    const rows = await getUnitsByBranch(_branchId);
    _allRows = filterRelevantRows(rows);
    hideSkeleton();
    renderRows(_allRows);
    updateBulkControls();
  } catch (err) {
    hideSkeleton();
    showLoadError(err.message);
  }
}

// Only rows relevant to expiry cleanup — see file header note.
function filterRelevantRows(rows) {
  return rows.filter(u =>
    u.status === BLOOD_UNIT_STATUS.EXPIRED || u.status === BLOOD_UNIT_STATUS.AVAILABLE
  );
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

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
  syncSelectAllCheckbox();
}

function buildRow(unit) {
  const tr = document.createElement('tr');
  tr.className = highlightClass(unit);

  tr.appendChild(checkboxCell(unit));
  tr.appendChild(cell(unit.blood_type));
  tr.appendChild(cell(unit.component));
  tr.appendChild(cell(`${unit.volume_ml} mL`));
  tr.appendChild(cell(unit.barcode));
  tr.appendChild(cell(unit.first_name ? `${unit.first_name} ${unit.last_name}` : '-'));
  tr.appendChild(cell(formatDate(unit.expiration_date)));
  tr.appendChild(expiryCell(unit));

  return tr;
}

function highlightClass(unit) {
  if (unit.status === BLOOD_UNIT_STATUS.EXPIRED) return 'row-highlight--expired';
  if (unit.near_expiry) return 'row-highlight--near-expiry';
  return '';
}

function checkboxCell(unit) {
  const td = document.createElement('td');
  const isExpired = unit.status === BLOOD_UNIT_STATUS.EXPIRED;

  const checkbox = document.createElement('input');
  checkbox.type    = 'checkbox';
  checkbox.disabled = !isExpired;
  checkbox.checked  = _selected.has(unit.unit_id);
  checkbox.setAttribute('aria-label', `Select unit ${unit.barcode}`);

  if (isExpired) {
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) _selected.add(unit.unit_id);
      else _selected.delete(unit.unit_id);
      syncSelectAllCheckbox();
      updateBulkControls();
    });
  }

  td.appendChild(checkbox);
  return td;
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text ?? '-';
  return td;
}

// Explicit expiry label alongside the row highlight color, so the state
// isn't conveyed by color alone.
function expiryCell(unit) {
  const td   = document.createElement('td');
  const span = document.createElement('span');

  if (unit.status === BLOOD_UNIT_STATUS.EXPIRED) {
    span.className   = 'status-badge status-badge--expired';
    span.textContent = 'Expired';
  } else if (unit.near_expiry) {
    span.className   = 'status-badge status-badge--near-expiry';
    span.textContent = 'Near Expiry';
  } else {
    span.className   = 'status-badge status-badge--available';
    span.textContent = 'Good';
  }

  td.appendChild(span);
  return td;
}

// ---------------------------------------------------------------------------
// Select-all-expired (header checkbox) — only ever touches expired rows
// ---------------------------------------------------------------------------

export function initSelectAllControl() {
  const selectAll = document.getElementById(SELECT_ALL_ID);
  if (!selectAll) return;

  selectAll.addEventListener('change', () => {
    const expiredIds = _allRows
      .filter(u => u.status === BLOOD_UNIT_STATUS.EXPIRED)
      .map(u => u.unit_id);

    if (selectAll.checked) {
      expiredIds.forEach(id => _selected.add(id));
    } else {
      expiredIds.forEach(id => _selected.delete(id));
    }

    renderRows(_allRows);
    updateBulkControls();
  });
}

function syncSelectAllCheckbox() {
  const selectAll = document.getElementById(SELECT_ALL_ID);
  if (!selectAll) return;

  const expiredRows = _allRows.filter(u => u.status === BLOOD_UNIT_STATUS.EXPIRED);

  if (!expiredRows.length) {
    selectAll.checked  = false;
    selectAll.disabled = true;
    return;
  }

  selectAll.disabled = false;
  selectAll.checked  = expiredRows.every(u => _selected.has(u.unit_id));
}

function updateBulkControls() {
  const btn = document.getElementById(REMOVE_BTN_ID);
  if (!btn) return;
  btn.disabled   = _selected.size === 0;
  btn.textContent = _selected.size > 0
    ? `Remove Selected (${_selected.size})`
    : 'Remove Selected';
}

// ---------------------------------------------------------------------------
// Bulk removal — modal listing selected units, reason, type "remove" gate
// ---------------------------------------------------------------------------

export function initBulkRemoveButton() {
  const btn = document.getElementById(REMOVE_BTN_ID);
  if (!btn) return;
  btn.addEventListener('click', openBulkRemoveModal);
}

function openBulkRemoveModal() {
  const selectedUnits = _allRows.filter(u => _selected.has(u.unit_id));
  if (!selectedUnits.length) return;

  const body = document.createElement('div');

  const intro = document.createElement('p');
  intro.textContent = `You are about to dispose of ${selectedUnits.length} expired unit(s):`;
  body.appendChild(intro);

  const list = document.createElement('ul');
  list.className = 'detail-list';
  selectedUnits.forEach(u => {
    const li = document.createElement('li');
    li.textContent = `${u.barcode} — ${u.blood_type} ${u.component} (expired ${formatDate(u.expiration_date)})`;
    list.appendChild(li);
  });
  body.appendChild(list);

  const reasonLabel = document.createElement('label');
  reasonLabel.setAttribute('for', 'cleaning-reason-input');
  reasonLabel.textContent = 'Reason for disposal';
  reasonLabel.className   = 'modal-field-label';

  const reasonInput = document.createElement('textarea');
  reasonInput.id          = 'cleaning-reason-input';
  reasonInput.rows        = 3;
  reasonInput.placeholder = 'e.g. Routine expiry cleanup';
  reasonInput.className   = 'modal-textarea';
  reasonInput.value       = 'Expired! Removed during inventory cleaning';

  const confirmLabel = document.createElement('label');
  confirmLabel.setAttribute('for', 'cleaning-confirm-input');
  confirmLabel.textContent = `Type "${CONFIRM_WORD}" to confirm`;
  confirmLabel.className   = 'modal-field-label';

  const confirmInput = document.createElement('input');
  confirmInput.type        = 'text';
  confirmInput.id          = 'cleaning-confirm-input';
  confirmInput.autocomplete = 'off';
  confirmInput.className   = 'modal-textarea';

  const errorEl = document.createElement('div');
  errorEl.className = 'field-error';
  errorEl.setAttribute('aria-live', 'polite');

  body.appendChild(reasonLabel);
  body.appendChild(reasonInput);
  body.appendChild(confirmLabel);
  body.appendChild(confirmInput);
  body.appendChild(errorEl);

  const confirmBtn = {
    label:     `Remove ${selectedUnits.length} Unit(s)`,
    className: 'btn-danger',
    onClick:   () => submitBulkRemove(selectedUnits, reasonInput, confirmInput, errorEl),
  };

  openModal('Remove Expired Units', body, [
    { label: 'Cancel', className: 'btn-secondary', onClick: closeModal },
    confirmBtn,
  ]);

  reasonInput.focus();
}

async function submitBulkRemove(selectedUnits, reasonInput, confirmInput, errorEl) {
  const reason      = reasonInput.value.trim();
  const confirmText = confirmInput.value.trim().toLowerCase();

  if (!reason) {
    errorEl.textContent = 'A reason is required.';
    return;
  }

  if (confirmText !== CONFIRM_WORD) {
    errorEl.textContent = `Type "${CONFIRM_WORD}" exactly to confirm.`;
    return;
  }

  const unitIds = selectedUnits.map(u => u.unit_id);

  try {
    const { succeeded, failed } = await bulkDisposeUnits(unitIds, reason);
    closeModal();

    if (failed.length === 0) {
      showToast(`${succeeded.length} unit(s) disposed.`, 'success');
    } else if (succeeded.length === 0) {
      showToast(`Failed to dispose ${failed.length} unit(s). Please try again.`, 'error');
    } else {
      showToast(
        `${succeeded.length} unit(s) disposed, ${failed.length} failed. Please review and retry the failed ones.`,
        'error'
      );
    }

    await renderCleaningTable(_branchId);
  } catch (err) {
    errorEl.textContent = err.message || 'Something went wrong. Please try again.';
  }
}

// ---------------------------------------------------------------------------
// Skeleton / error / empty state helpers — same pattern as bloodUnitsUI.js
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
  el.textContent = message || 'Could not load inventory. Please try again.';
}

function showEmptyState() {
  let empty = document.getElementById(EMPTY_STATE_ID);
  if (!empty) {
    empty           = document.createElement('div');
    empty.id        = EMPTY_STATE_ID;
    empty.className = 'empty-state';

    const h3 = document.createElement('h3');
    h3.textContent = 'Nothing to clean up';
    const p = document.createElement('p');
    p.textContent = 'No expired or near-expiry units in this branch right now.';

    empty.appendChild(h3);
    empty.appendChild(p);
    document.getElementById(TABLE_WRAP_ID).insertAdjacentElement('afterend', empty);
  }
  empty.style.display = '';
}

function hideEmptyState() {
  const empty = document.getElementById(EMPTY_STATE_ID);
  if (empty) empty.style.display = 'none';
}

function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}