import { openModal, closeModal, confirmModal } from '../../components/modal.js';
import { showToast }                            from '../../components/toast.js';
import { BLOOD_UNIT_STATUS }                    from '../../constants/statusConstants.js';
import { BLOOD_TYPES }                          from '../../constants/bloodTypes.js';
import {
  getUnitsByBranch,
  getUnitById,
  updateUnitStatus,
} from './bloodUnitsApi.js';

const TBODY_ID        = 'units-tbody';
const SKELETON_ID     = 'units-skeleton';
const ERROR_ID        = 'units-error';
const TABLE_WRAP_ID   = 'units-table-container';
const TABS_WRAP_ID    = 'units-tabs';
const RESULT_COUNT_ID = 'units-result-count';

const FILTER_IDS = {
  bloodType:  'filter-blood-type',
  status:     'filter-status',
  donor:      'filter-donor',
  nearExpiry: 'filter-near-expiry',
  clear:      'filter-clear',
};

// Terminal for THIS page's purposes — no action buttons once a unit reaches
// any of these. Matches contract.md's terminal-state table. 'Expired' is
// included here even though it's computed server-side rather than a status
// ever explicitly set — backend (getUnitsByBranch) already returns 'Expired'
// in the status field when applicable, so no date math needed client-side.
const TERMINAL_UNIT_STATUSES = [
  BLOOD_UNIT_STATUS.RELEASED,
  BLOOD_UNIT_STATUS.DISPOSED,
  BLOOD_UNIT_STATUS.WITHDRAWN,
  BLOOD_UNIT_STATUS.EXPIRED,
  BLOOD_UNIT_STATUS.SEPARATED,
];

// Display order for grouping rows by status (top -> bottom). Per product
// direction: Available first, then Disposed, Expired, Released, Separated.
// Reserved and Withdrawn weren't specified — placed next to their nearest
// conceptual neighbor (Reserved beside Available as a "live" status,
// Withdrawn beside Disposed as a removal-reason terminal status). Any
// status not in this list falls to the very end rather than being dropped.
// Also reused as the option list for the Status filter dropdown.
const STATUS_DISPLAY_ORDER = [
  BLOOD_UNIT_STATUS.AVAILABLE,
  BLOOD_UNIT_STATUS.RESERVED,
  BLOOD_UNIT_STATUS.DISPOSED,
  BLOOD_UNIT_STATUS.WITHDRAWN,
  BLOOD_UNIT_STATUS.EXPIRED,
  BLOOD_UNIT_STATUS.RELEASED,
  BLOOD_UNIT_STATUS.SEPARATED,
];

// Display labels for the component tabs / empty-state messaging. Component
// enum values themselves (contract.md's Blood Components list) aren't in
// statusConstants.js — mirrored here locally rather than introducing a new
// shared constants file unprompted. Candidate for a componentConstants.js
// mirror if component values end up reused elsewhere.
const COMPONENT_LABELS = {
  'Whole Blood':               'Whole Blood',
  'Packed Red Blood Cells':    'RBC',
  'Platelets':                 'Platelet',
  'Fresh Frozen Plasma':       'Plasma',
};

let _branchId        = null;
let _allRows         = [];      // unfiltered cache from last fetch
let _activeComponent = 'all';   // 'all' | one of the component enum strings

// Filter state lives here (not read from the DOM on each pass) so it
// survives renderUnitsTable() refetches after Dispose/Withdraw — the
// filter inputs themselves are static HTML and are never re-created.
const _filters = {
  bloodType:  '',     // '' = any
  status:     '',     // '' = any
  donor:      '',     // free text, matched against "first last"
  nearExpiry: false,
};

// ---------------------------------------------------------------------------
// Public entry — called from the entry file
// ---------------------------------------------------------------------------

export async function renderUnitsTable(branchId) {
  _branchId = branchId;

  showSkeleton();

  try {
    _allRows = await getUnitsByBranch(_branchId);
    hideSkeleton();
    applyFilterAndRender();
  } catch (err) {
    hideSkeleton();
    showLoadError(err.message);
  }
}

// Wires the All / Whole Blood / RBC / Platelet / Plasma tab buttons.
// Client-side filter over the already-fetched branch rows — no backend
// query param exists for component filtering (contract.md), and none is
// needed since the full branch dataset is already in hand after fetch.
export function initComponentTabs() {
  const tabsWrap = document.getElementById(TABS_WRAP_ID);
  if (!tabsWrap) return;

  tabsWrap.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeComponent = btn.dataset.component;
      updateTabState(tabsWrap);
      applyFilterAndRender();
    });
  });
  updateTabState(tabsWrap);
}

// Wires the filter bar (blood type, status, donor, near-expiry, clear).
// Filters apply across every component tab — switching tabs only narrows
// by component, it never resets these. Blood type and status options are
// populated from constants rather than hardcoded in the HTML.
export function initUnitFilters() {
  const typeSel   = document.getElementById(FILTER_IDS.bloodType);
  const statusSel = document.getElementById(FILTER_IDS.status);
  const donorIn   = document.getElementById(FILTER_IDS.donor);
  const nearChk   = document.getElementById(FILTER_IDS.nearExpiry);
  const clearBtn  = document.getElementById(FILTER_IDS.clear);
  if (!typeSel || !statusSel || !donorIn || !nearChk || !clearBtn) return;

  populateSelect(typeSel, BLOOD_TYPES);
  populateSelect(statusSel, STATUS_DISPLAY_ORDER);

  typeSel.addEventListener('change', () => {
    _filters.bloodType = typeSel.value;
    applyFilterAndRender();
  });

  statusSel.addEventListener('change', () => {
    _filters.status = statusSel.value;
    applyFilterAndRender();
  });

  donorIn.addEventListener('input', () => {
    _filters.donor = donorIn.value.trim();
    applyFilterAndRender();
  });

  nearChk.addEventListener('change', () => {
    _filters.nearExpiry = nearChk.checked;
    applyFilterAndRender();
  });

  clearBtn.addEventListener('click', () => {
    _filters.bloodType  = '';
    _filters.status     = '';
    _filters.donor      = '';
    _filters.nearExpiry = false;

    typeSel.value   = '';
    statusSel.value = '';
    donorIn.value   = '';
    nearChk.checked = false;

    applyFilterAndRender();
  });
}

function populateSelect(select, values) {
  values.forEach(value => {
    const opt = document.createElement('option');
    opt.value       = value;
    opt.textContent = value;
    select.appendChild(opt);
  });
}

function updateTabState(tabsWrap) {
  tabsWrap.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.toggle('tab-button--active', btn.dataset.component === _activeComponent);
  });
}

// ---------------------------------------------------------------------------
// Filtering + counts
// ---------------------------------------------------------------------------

function hasActiveFilters() {
  return Boolean(
    _filters.bloodType || _filters.status || _filters.donor || _filters.nearExpiry
  );
}

// Everything EXCEPT the component tab. Tab counts are computed from this
// set so they answer "how many of each component match my filters" —
// while the table additionally narrows by the active component tab.
function matchesFilters(row) {
  if (_filters.bloodType  && row.blood_type !== _filters.bloodType) return false;
  if (_filters.status     && row.status     !== _filters.status)    return false;
  if (_filters.nearExpiry && !row.near_expiry)                      return false;

  if (_filters.donor) {
    const name   = `${row.first_name ?? ''} ${row.last_name ?? ''}`.toLowerCase();
    const tokens = _filters.donor.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.every(token => name.includes(token))) return false;
  }

  return true;
}

function applyFilterAndRender() {
  const filtered = _allRows.filter(matchesFilters);

  const rows = _activeComponent === 'all'
    ? filtered
    : filtered.filter(r => r.component === _activeComponent);

  updateTabCounts(filtered);
  updateResultLine(rows.length);
  updateClearButton();
  renderRows(rows);
}

// Writes the count into each tab's .tab-count span. Counts are derived
// from rows already in memory — no extra requests, no date math (status
// and near_expiry are server-computed, see contract.md).
function updateTabCounts(filtered) {
  const tabsWrap = document.getElementById(TABS_WRAP_ID);
  if (!tabsWrap) return;

  tabsWrap.querySelectorAll('.tab-button').forEach(btn => {
    const key = btn.dataset.component;
    const n   = key === 'all'
      ? filtered.length
      : filtered.filter(r => r.component === key).length;

    const el = btn.querySelector('.tab-count');
    if (el) el.textContent = String(n);
  });
}

// "Showing 3 units · Whole Blood · AB+ · Available" — the number staff
// read out to a requestor, with the active filters spelled out beside it
// so it's unambiguous what was counted.
function updateResultLine(count) {
  const el = document.getElementById(RESULT_COUNT_ID);
  if (!el) return;

  const parts = [];
  if (_activeComponent !== 'all') {
    parts.push(COMPONENT_LABELS[_activeComponent] || _activeComponent);
  }
  if (_filters.bloodType)  parts.push(_filters.bloodType);
  if (_filters.status)     parts.push(_filters.status);
  if (_filters.nearExpiry) parts.push('Near expiry');
  if (_filters.donor)      parts.push(`Donor: \u201C${_filters.donor}\u201D`);

  el.textContent = '';

  el.appendChild(document.createTextNode('Showing '));

  const strong = document.createElement('strong');
  strong.textContent = `${count} ${count === 1 ? 'unit' : 'units'}`;
  el.appendChild(strong);

  if (parts.length) {
    el.appendChild(document.createTextNode(` \u00B7 ${parts.join(' \u00B7 ')}`));
  }
}

function updateClearButton() {
  const btn = document.getElementById(FILTER_IDS.clear);
  if (btn) btn.disabled = !hasActiveFilters();
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

  const sorted = sortByStatusGroup(rows);
  sorted.forEach(row => tbody.appendChild(buildRow(row)));
}

// Groups rows by STATUS_DISPLAY_ORDER; stable within each group (keeps the
// order rows arrived in from the API). Unrecognized statuses sort last.
function sortByStatusGroup(rows) {
  const rank = status => {
    const i = STATUS_DISPLAY_ORDER.indexOf(status);
    return i === -1 ? STATUS_DISPLAY_ORDER.length : i;
  };
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => rank(a.row.status) - rank(b.row.status) || a.i - b.i)
    .map(({ row }) => row);
}

function buildRow(unit) {
  const tr = document.createElement('tr');

  tr.appendChild(cell(unit.blood_type));
  tr.appendChild(cell(unit.component));
  tr.appendChild(cell(`${unit.volume_ml} mL`));
  tr.appendChild(cell(`${unit.first_name} ${unit.last_name}`));
  tr.appendChild(cell(formatDate(unit.expiration_date)));
  tr.appendChild(statusCell(unit));
  tr.appendChild(actionsCell(unit));

  return tr;
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text ?? '-';
  return td;
}

function statusCell(unit) {
  const td   = document.createElement('td');
  const span = document.createElement('span');
  span.className   = `status-badge status-badge--${unit.status.toLowerCase().replace(/\s+/g, '-')}`;
  span.textContent = unit.status;
  td.appendChild(span);
  return td;
}

// Dispose/Withdraw only — Separate lives on a different page (Section 4).
// For terminal statuses, the buttons are still rendered but hidden via
// visibility:hidden (not omitted from the DOM) so every row reserves the
// same button-slot space — otherwise rows with only "Details" render
// shorter than rows with all three buttons, throwing off row height/
// border alignment across status groups.
function actionsCell(unit) {
  const td  = document.createElement('td');
  const box = document.createElement('div');
  box.className = 'table-actions';

  const isTerminal = TERMINAL_UNIT_STATUSES.includes(unit.status);

  const detailsBtn = document.createElement('button');
  detailsBtn.className   = 'btn-secondary btn-xs';
  detailsBtn.textContent = 'Details';
  detailsBtn.addEventListener('click', () => openDetailModal(unit.unit_id));
  box.appendChild(detailsBtn);

  const disposeBtn = document.createElement('button');
  disposeBtn.className   = 'btn-danger btn-xs';
  disposeBtn.textContent = 'Dispose';
  disposeBtn.addEventListener('click', () => openReasonModal(unit, BLOOD_UNIT_STATUS.DISPOSED));
  box.appendChild(disposeBtn);

  const withdrawBtn = document.createElement('button');
  withdrawBtn.className   = 'btn-secondary btn-xs';
  withdrawBtn.textContent = 'Withdraw';
  withdrawBtn.addEventListener('click', () => openReasonModal(unit, BLOOD_UNIT_STATUS.WITHDRAWN));
  box.appendChild(withdrawBtn);

  if (isTerminal) {
    disposeBtn.style.visibility  = 'hidden';
    withdrawBtn.style.visibility = 'hidden';
    disposeBtn.tabIndex  = -1;
    withdrawBtn.tabIndex = -1;
  }

  td.appendChild(box);
  return td;
}

// ---------------------------------------------------------------------------
// Dispose / Withdraw — shared modal, both require a reason
// (backend: REASON_REQUIRED_STATUSES = ['Disposed', 'Withdrawn'])
// ---------------------------------------------------------------------------

function openReasonModal(unit, status) {
  const body = document.createElement('div');

  const label = document.createElement('label');
  label.setAttribute('for', 'unit-status-reason-input');
  label.textContent = `Reason for marking this unit as ${status}`;
  label.className   = 'modal-field-label';

  const textarea = document.createElement('textarea');
  textarea.id         = 'unit-status-reason-input';
  textarea.rows        = 4;
  textarea.placeholder = status === BLOOD_UNIT_STATUS.DISPOSED
    ? 'e.g. Failed quality check, contamination suspected…'
    : 'e.g. Recalled by branch, donor-requested withdrawal…';
  textarea.className   = 'modal-textarea';

  const errorEl = document.createElement('div');
  errorEl.className = 'field-error';
  errorEl.setAttribute('aria-live', 'polite');

  body.appendChild(label);
  body.appendChild(textarea);
  body.appendChild(errorEl);

  openModal(`Mark Unit as ${status}`, body, [
    {
      label:     'Cancel',
      className: 'btn-secondary',
      onClick:   closeModal,
    },
    {
      label:     `Confirm ${status}`,
      className: 'btn-danger',
      onClick:   () => submitStatusChange(unit, status, textarea, errorEl),
    },
  ]);

  textarea.focus();
}

async function submitStatusChange(unit, status, textarea, errorEl) {
  const reason = textarea.value.trim();

  if (!reason) {
    errorEl.textContent = 'A reason is required.';
    return;
  }

  try {
    await updateUnitStatus(unit.unit_id, status, reason);
    closeModal();
    showToast(`Unit marked as ${status}.`, 'success');
    await renderUnitsTable(_branchId);
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

// ---------------------------------------------------------------------------
// Detail modal — full record via GET /:id
// ---------------------------------------------------------------------------

async function openDetailModal(unitId) {
  const loadingBody = document.createElement('p');
  loadingBody.textContent = 'Loading…';
  openModal('Blood Unit Details', loadingBody, [
    { label: 'Close', className: 'btn-secondary', onClick: closeModal },
  ]);

  try {
    const detail = await getUnitById(unitId);
    const body   = buildDetailBody(detail);
    openModal('Blood Unit Details', body, [
      { label: 'Close', className: 'btn-secondary', onClick: closeModal },
    ]);
  } catch {
    const errorBody = document.createElement('p');
    errorBody.textContent = 'Could not load unit details. Please try again.';
    openModal('Blood Unit Details', errorBody, [
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

  if (detail.status === BLOOD_UNIT_STATUS.DISPOSED) {
    addDetailRow(dl, 'Disposal Reason', detail.disposal_reason);
  }

  if (detail.status === BLOOD_UNIT_STATUS.WITHDRAWN) {
    addDetailRow(dl, 'Withdrawal Reason', detail.withdrawal_reason);
  }

  addDetailRow(dl, 'Processed By',
    detail.processed_by_first ? `${detail.processed_by_first} ${detail.processed_by_last}` : '-');

  return dl;
}

function addDetailRow(dl, label, value) {
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = value ?? '-';
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
  el.textContent = message || 'Could not load blood units. Please try again.';
}

// Three cases, most specific first:
//   1. Any filter active  -> "No matching units" (the inventory may well
//      have units; the filters just exclude all of them — saying "no units
//      in this branch yet" there would be wrong and misleading).
//   2. Component tab only -> "No RBC units…" etc.
//   3. Nothing active     -> the original generic wording.
function showEmptyState() {
  let empty = document.getElementById('units-empty-state');
  if (!empty) {
    empty           = document.createElement('div');
    empty.id        = 'units-empty-state';
    empty.className = 'empty-state';
    document.getElementById(TABLE_WRAP_ID).insertAdjacentElement('afterend', empty);
  }

  empty.textContent = '';

  const h3 = document.createElement('h3');
  const p  = document.createElement('p');

  if (hasActiveFilters()) {
    h3.textContent = 'No matching units';
    p.textContent  = 'No blood units match the current filters. Try changing or clearing a filter.';
  } else if (_activeComponent === 'all') {
    h3.textContent = 'No blood units found';
    p.textContent  = 'There are no blood units in this branch\u2019s inventory yet.';
  } else {
    const label = COMPONENT_LABELS[_activeComponent] || _activeComponent;
    h3.textContent = `No ${label} units found`;
    p.textContent  = `There are no ${label} units in this branch\u2019s inventory yet.`;
  }

  empty.appendChild(h3);
  empty.appendChild(p);
  empty.style.display = '';
}

function hideEmptyState() {
  const empty = document.getElementById('units-empty-state');
  if (empty) empty.style.display = 'none';
}

function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}