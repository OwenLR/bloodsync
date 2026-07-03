import { openModal, closeModal, confirmModal } from '../../components/modal.js';
import { showToast }              from '../../components/toast.js';
import { BLOOD_UNIT_STATUS }      from '../../constants/statusConstants.js';
import {
  getUnitsByBranch,
  separateUnit,
} from './bloodUnitsApi.js';

const TBODY_ID      = 'separation-tbody';
const SKELETON_ID   = 'separation-skeleton';
const ERROR_ID      = 'separation-error';
const TABLE_WRAP_ID = 'separation-table-container';

let _branchId = null;

// ---------------------------------------------------------------------------
// Public entry — called from the entry file
// ---------------------------------------------------------------------------

export async function renderSeparationTable(branchId) {
  _branchId = branchId;

  showSkeleton();

  try {
    const rows = await getUnitsByBranch(_branchId);
    // Only Whole Blood + Available units can be separated (backend: assertSeparable).
    // 'Available' here is already the server-computed status — a unit past its
    // expiration_date is returned as 'Expired' by getUnitsByBranchAll, so no
    // extra date check is needed client-side, same as Inventory Cleaning.
    const separable = rows.filter(
      u => u.component === 'Whole Blood' && u.status === BLOOD_UNIT_STATUS.AVAILABLE
    );
    hideSkeleton();
    renderRows(separable);
  } catch (err) {
    hideSkeleton();
    showLoadError(err.message);
  }
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
}

function buildRow(unit) {
  const tr = document.createElement('tr');

  tr.appendChild(cell(unit.blood_type));
  tr.appendChild(cell(`${unit.volume_ml} mL`));
  tr.appendChild(cell(unit.barcode));
  tr.appendChild(cell(`${unit.first_name} ${unit.last_name}`));
  tr.appendChild(cell(formatDate(unit.expiration_date)));
  tr.appendChild(actionsCell(unit));

  return tr;
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text ?? '—';
  return td;
}

function actionsCell(unit) {
  const td = document.createElement('td');
  td.className = 'table-actions';

  const separateBtn = document.createElement('button');
  separateBtn.className   = 'btn-primary btn-xs';
  separateBtn.textContent = 'Separate';
  separateBtn.addEventListener('click', () => handleSeparate(unit));
  td.appendChild(separateBtn);

  return td;
}

// ---------------------------------------------------------------------------
// Separate — plain confirm modal, no typed word.
// This IS a one-way action (source unit → Separated, terminal; 3 new Pending
// collections created) but bloodsync.md only requires the typed-word pattern
// for bulk inventory removal (#11), not separation. The confirm message
// carries the "no going back" warning instead of a typed gate.
// ---------------------------------------------------------------------------

async function handleSeparate(unit) {
  const confirmed = await confirmModal(
    `Separate this ${unit.blood_type} Whole Blood unit (${unit.barcode})? ` +
    'There is no going back — the unit will be marked Separated and 3 new ' +
    'Pending collections (Packed Red Blood Cells, Platelets, Fresh Frozen ' +
    'Plasma) will be created, each needing to pass Blood Testing again.',
    'Separate Unit'
  );
  if (!confirmed) return;

  try {
    const result = await separateUnit(unit.unit_id);
    showToast('Blood unit separated into 3 pending collections.', 'success');
    showResultModal(unit, result.derived_collections);
    await renderSeparationTable(_branchId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// Result modal — shows the 3 derived collections so staff know they now
// exist as Pending in the Blood Testing queue (separate page/feature).
// ---------------------------------------------------------------------------

function showResultModal(sourceUnit, derivedCollections) {
  const body = document.createElement('div');

  const intro = document.createElement('p');
  intro.textContent =
    `${sourceUnit.blood_type} Whole Blood (${sourceUnit.barcode}) was separated ` +
    'into the following collections. Each is Pending and must be reviewed on the Blood Testing page.';
  body.appendChild(intro);

  const list = document.createElement('ul');
  (derivedCollections || []).forEach(c => {
    const li = document.createElement('li');
    li.textContent = `${c.component} — expires ${formatDate(c.expiration_date)}`;
    list.appendChild(li);
  });
  body.appendChild(list);

  openModal('Separation Complete', body, [
    { label: 'Close', className: 'btn-secondary', onClick: closeModal },
  ]);
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

function showEmptyState() {
  let empty = document.getElementById('separation-empty-state');
  if (!empty) {
    empty           = document.createElement('div');
    empty.id        = 'separation-empty-state';
    empty.className = 'empty-state';

    const h3 = document.createElement('h3');
    h3.textContent = 'No units available for separation';
    const p = document.createElement('p');
    p.textContent = 'There are no Available Whole Blood units in this branch\u2019s inventory right now.';

    empty.appendChild(h3);
    empty.appendChild(p);
    document.getElementById(TABLE_WRAP_ID).insertAdjacentElement('afterend', empty);
  }
  empty.style.display = '';
}

function hideEmptyState() {
  const empty = document.getElementById('separation-empty-state');
  if (empty) empty.style.display = 'none';
}

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}