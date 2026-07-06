import { showToast }             from '../../components/toast.js';
import { getFulfillmentOptions } from './bloodRequestApi.js';

const SKELETON_ID      = 'fulfillment-skeleton';
const ERROR_ID         = 'fulfillment-error';
const INSUFFICIENT_ID  = 'fulfillment-insufficient-banner';
const LOCATION_NOTE_ID = 'fulfillment-location-note';
const BRANCH_LIST_ID   = 'branch-options-list';
const CONTINUE_ID      = 'btn-fulfillment-continue';
const BACK_ID          = 'btn-fulfillment-back';

let _selectedBranchId = null;
let _items            = null;
let _onContinue       = null;
let _onBack           = null;
let _listenersBound    = false; // guard — prevents duplicate listeners if the
                                 // requestor goes back and continues again

// ---------------------------------------------------------------------------
// Public entry — called from the entry file each time this step is entered
// ---------------------------------------------------------------------------

export async function initFulfillmentStep(items, onContinue, onBack) {
  _selectedBranchId = null;
  _items            = items;
  _onContinue       = onContinue;
  _onBack           = onBack;

  if (!_listenersBound) {
    document.getElementById(CONTINUE_ID).addEventListener('click', handleContinue);
    document.getElementById(BACK_ID).addEventListener('click', () => _onBack());
    _listenersBound = true;
  }

  await loadOptions(items);
}

async function loadOptions(items) {
  showSkeleton();

  const { latitude, longitude, usedLocation } = await getRequestorLocation();
  setLocationNote(usedLocation);

  try {
    const result = await getFulfillmentOptions(items, latitude, longitude);
    hideSkeleton();
    renderResult(result);
  } catch (err) {
    hideSkeleton();
    showLoadError(err.message);
  }
}

// ---------------------------------------------------------------------------
// Geolocation — auto-prompted on load, per confirmed UX decision.
// Silently falls back if denied/unavailable — backend already handles
// missing coordinates gracefully (alphabetical order instead of distance).
// ---------------------------------------------------------------------------

function getRequestorLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: undefined, longitude: undefined, usedLocation: false });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude:     pos.coords.latitude,
        longitude:    pos.coords.longitude,
        usedLocation: true,
      }),
      () => resolve({ latitude: undefined, longitude: undefined, usedLocation: false }),
      { timeout: 8000 }
    );
  });
}

function setLocationNote(usedLocation) {
  document.getElementById(LOCATION_NOTE_ID).textContent = usedLocation
    ? 'Branches sorted by distance from your current location.'
    : 'Location unavailable — showing branches in default order.';
}

// ---------------------------------------------------------------------------
// Aggregate per-item plans into per-branch candidates.
//
// POST /api/blood-requests only accepts ONE branch_id for the whole request.
// The backend does not return full per-branch stock for every item — only
// the branches needed to satisfy each item's plan (singleBranchOption =
// nearest branch with enough; splitOption = branches used to fully cover
// the requested count). We union these across all items to build a branch
// picker. bloodRequestService.js's approveRequest() already re-checks stock
// at approval time and spills to other branches per item automatically if
// the chosen primary branch falls short — so this is a best-effort
// recommendation, not a hard per-item guarantee.
// ---------------------------------------------------------------------------

function aggregateBranches(plans) {
  const branchMap = new Map();

  plans.forEach((item, itemIndex) => {
    const candidates = [];

    if (item.plan.singleBranchOption) {
      candidates.push({ ...item.plan.singleBranchOption, units_covered: item.units_requested });
    }

    item.plan.splitOption.forEach((split) => {
      candidates.push({
        branch_id:     split.branch_id,
        branch_name:   split.branch_name,
        distance_km:   split.distance_km,
        units_covered: split.units_to_take,
      });
    });

    candidates.forEach((cand) => {
      if (!branchMap.has(cand.branch_id)) {
        branchMap.set(cand.branch_id, {
          branch_id:   cand.branch_id,
          branch_name: cand.branch_name,
          distance_km: cand.distance_km,
          coverage:    new Map(),
        });
      }
      const entry    = branchMap.get(cand.branch_id);
      const existing = entry.coverage.get(itemIndex) || 0;
      entry.coverage.set(itemIndex, Math.max(existing, cand.units_covered));
    });
  });

  return Array.from(branchMap.values())
    .map((branch) => ({
      ...branch,
      itemsFullyCovered: plans.filter((item, i) =>
        (branch.coverage.get(i) || 0) >= item.units_requested).length,
      itemsPartiallyCovered: plans.filter((item, i) => {
        const covered = branch.coverage.get(i) || 0;
        return covered > 0 && covered < item.units_requested;
      }).length,
    }))
    .sort((a, b) => {
      if (b.itemsFullyCovered !== a.itemsFullyCovered) return b.itemsFullyCovered - a.itemsFullyCovered;
      return (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity);
    });
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderResult(result) {
  const { plans, any_insufficient } = result;

  document.getElementById(INSUFFICIENT_ID).style.display = any_insufficient ? '' : 'none';

  const branches = aggregateBranches(plans);
  const list      = document.getElementById(BRANCH_LIST_ID);
  list.textContent = '';

  if (!branches.length) {
    showLoadError('No branches currently have any of the requested blood types/components in stock.');
    return;
  }

  branches.forEach((branch, index) => list.appendChild(buildBranchOption(branch, plans, index === 0)));

  // Auto-select the top recommendation (most items fully covered, then nearest)
  _selectedBranchId = branches[0].branch_id;
}

function buildBranchOption(branch, plans, isDefault) {
  const label = document.createElement('label');
  label.className = 'branch-option';

  const radio     = document.createElement('input');
  radio.type      = 'radio';
  radio.name      = 'branch-option';
  radio.value     = branch.branch_id;
  radio.checked   = isDefault;
  radio.addEventListener('change', () => { _selectedBranchId = branch.branch_id; });

  const info = document.createElement('div');
  info.className = 'branch-option-info';

  const name = document.createElement('div');
  name.className   = 'branch-option-name';
  name.textContent = branch.branch_name;

  const distance = document.createElement('div');
  distance.className = 'branch-option-distance';
  distance.textContent = Number.isFinite(branch.distance_km)
    ? `${branch.distance_km.toFixed(1)} km away`
    : 'Distance unknown';

  const coverage = document.createElement('div');
  coverage.className = 'branch-option-coverage';
  const totalItems = plans.length;
  coverage.textContent = branch.itemsFullyCovered === totalItems
    ? 'Fully covers your entire request.'
    : `Fully covers ${branch.itemsFullyCovered} of ${totalItems} item(s)` +
      (branch.itemsPartiallyCovered > 0 ? `, partially covers ${branch.itemsPartiallyCovered} more.` : '.') +
      ' Remaining units may be sourced from other branches once approved.';

  info.appendChild(name);
  info.appendChild(distance);
  info.appendChild(coverage);
  label.appendChild(radio);
  label.appendChild(info);
  return label;
}

// ---------------------------------------------------------------------------
// Continue
// ---------------------------------------------------------------------------

function handleContinue() {
  if (!_selectedBranchId) {
    showToast('Please select a branch to continue.', 'error');
    return;
  }
  _onContinue(_items, _selectedBranchId);
}

// ---------------------------------------------------------------------------
// Skeleton / error helpers — same toggle pattern as bloodUnitsUI.js
// ---------------------------------------------------------------------------

function showSkeleton() {
  document.getElementById(SKELETON_ID).style.display     = '';
  document.getElementById(BRANCH_LIST_ID).style.display   = 'none';
  document.getElementById(ERROR_ID).textContent           = '';
  document.getElementById(INSUFFICIENT_ID).style.display = 'none';
}

function hideSkeleton() {
  document.getElementById(SKELETON_ID).style.display   = 'none';
  document.getElementById(BRANCH_LIST_ID).style.display = '';
}

function showLoadError(message) {
  document.getElementById(ERROR_ID).textContent =
    message || 'Could not load fulfillment options. Please try again.';
}