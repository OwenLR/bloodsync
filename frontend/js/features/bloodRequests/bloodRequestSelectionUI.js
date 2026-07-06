import { BLOOD_TYPES, COMPONENTS } from '../../constants/bloodTypes.js';
import { MAX_UNITS_PER_ITEM, MAX_UNITS_PER_REQUEST } from '../../constants/bloodRequestConstant.js';

const TITLE_ID          = 'component-title';
const GRID_ID           = 'blood-type-grid';
const PREV_ID           = 'component-prev';
const NEXT_ID           = 'component-next';
const SUMMARY_LIST_ID   = 'selection-summary-list';
const SUMMARY_EMPTY_ID  = 'selection-summary-empty';
const TOTAL_ID          = 'selection-total';
const ERROR_ID          = 'selection-error';
const CONTINUE_ID       = 'btn-continue';

// selection[component][bloodType] = units_requested (0 = not selected)
let selection = buildEmptySelection();

// COMPONENTS[0] is 'Whole Blood' (bloodTypes.js order) — carousel defaults there.
let activeComponentIndex = 0;

function buildEmptySelection() {
  const map = {};
  COMPONENTS.forEach(c => {
    map[c] = {};
    BLOOD_TYPES.forEach(bt => { map[c][bt] = 0; });
  });
  return map;
}

// ---------------------------------------------------------------------------
// Public entry — called from the entry file
// ---------------------------------------------------------------------------

export function initSelectionStep(onContinue) {
  document.getElementById(PREV_ID).addEventListener('click', () => navigateComponent(-1));
  document.getElementById(NEXT_ID).addEventListener('click', () => navigateComponent(1));
  document.getElementById(CONTINUE_ID).addEventListener('click', () => handleContinue(onContinue));

  renderComponentTitle();
  renderBloodTypeGrid();
  renderSummary();
}

/**
 * getSelectedItems()
 * Flattens selection state into the { blood_type, component, units_requested }
 * shape the backend expects (bloodRequestValidator.js / POST /api/blood-requests
 * and POST /fulfillment-options). Exported for the next step (1b) to consume.
 */
export function getSelectedItems() {
  const items = [];
  COMPONENTS.forEach(component => {
    BLOOD_TYPES.forEach(bloodType => {
      const units = selection[component][bloodType];
      if (units > 0) items.push({ blood_type: bloodType, component, units_requested: units });
    });
  });
  return items;
}

// ---------------------------------------------------------------------------
// Carousel navigation — wraps around (4 components, arrows cycle both ways)
// ---------------------------------------------------------------------------

function navigateComponent(direction) {
  const len = COMPONENTS.length;
  activeComponentIndex = (activeComponentIndex + direction + len) % len;
  renderComponentTitle();
  renderBloodTypeGrid();
  clearError();
}

function renderComponentTitle() {
  document.getElementById(TITLE_ID).textContent = COMPONENTS[activeComponentIndex];
}

// ---------------------------------------------------------------------------
// Blood type grid — 8 boxes for whichever component is currently active
// ---------------------------------------------------------------------------

function renderBloodTypeGrid() {
  const grid = document.getElementById(GRID_ID);
  grid.textContent = '';

  const component = COMPONENTS[activeComponentIndex];

  BLOOD_TYPES.forEach(bloodType => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'blood-type-box';
    if (selection[component][bloodType] > 0) btn.classList.add('blood-type-box--selected');

    const label = document.createElement('span');
    label.className = 'blood-type-label';
    label.textContent = bloodType;

    const count = document.createElement('span');
    count.className = 'blood-type-count';
    count.textContent = selection[component][bloodType] > 0
      ? `× ${selection[component][bloodType]}`
      : '';

    btn.appendChild(label);
    btn.appendChild(count);
    btn.addEventListener('click', () => handleIncrement(component, bloodType));

    grid.appendChild(btn);
  });
}

function handleIncrement(component, bloodType) {
  clearError();

  const currentLineUnits  = selection[component][bloodType];
  const currentTotalUnits = getTotalUnits();

  // Mirrors backend bloodRequestValidator.js validateItems() caps
  if (currentLineUnits >= MAX_UNITS_PER_ITEM) {
    showError(`You can request at most ${MAX_UNITS_PER_ITEM} units of ${bloodType} ${component} per request.`);
    return;
  }

  if (currentTotalUnits >= MAX_UNITS_PER_REQUEST) {
    showError(`You can request at most ${MAX_UNITS_PER_REQUEST} units total per request.`);
    return;
  }

  selection[component][bloodType] += 1;
  renderBloodTypeGrid();
  renderSummary();
}

function getTotalUnits() {
  let total = 0;
  COMPONENTS.forEach(c => BLOOD_TYPES.forEach(bt => { total += selection[c][bt]; }));
  return total;
}

// ---------------------------------------------------------------------------
// Summary panel — every non-zero component+type line, with a remove control
// ---------------------------------------------------------------------------

function renderSummary() {
  const list  = document.getElementById(SUMMARY_LIST_ID);
  const empty = document.getElementById(SUMMARY_EMPTY_ID);
  const total = document.getElementById(TOTAL_ID);

  list.textContent = '';
  const items = getSelectedItems();

  if (!items.length) {
    list.style.display  = 'none';
    empty.style.display = '';
    total.textContent   = '';
    return;
  }

  empty.style.display = 'none';
  list.style.display  = '';
  items.forEach(item => list.appendChild(buildSummaryRow(item)));
  total.textContent = `Total: ${getTotalUnits()} / ${MAX_UNITS_PER_REQUEST} units`;
}

function buildSummaryRow(item) {
  const li = document.createElement('li');
  li.className = 'selection-summary-row';

  const text = document.createElement('span');
  text.textContent = `${item.units_requested} × ${item.blood_type} — ${item.component}`;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-secondary btn-xs';
  removeBtn.textContent = 'Remove';
  removeBtn.addEventListener('click', () => handleRemove(item.component, item.blood_type));

  li.appendChild(text);
  li.appendChild(removeBtn);
  return li;
}

function handleRemove(component, bloodType) {
  selection[component][bloodType] = 0;
  clearError();
  if (COMPONENTS[activeComponentIndex] === component) renderBloodTypeGrid();
  renderSummary();
}

// ---------------------------------------------------------------------------
// Continue — hands off to the fulfillment-options step (1b, not yet built)
// ---------------------------------------------------------------------------

function handleContinue(onContinue) {
  const items = getSelectedItems();
  if (!items.length) {
    showError('Select at least one blood type and component before continuing.');
    return;
  }
  clearError();
  onContinue(items);
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

function showError(message) { document.getElementById(ERROR_ID).textContent = message; }
function clearError()       { document.getElementById(ERROR_ID).textContent = ''; }