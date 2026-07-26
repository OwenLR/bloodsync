import { showToast }             from '../../components/toast.js';
import { getFulfillmentOptions, getWaitEstimate } from './bloodRequestApi.js';
import { getBranches }           from '../bloodDrives/bloodDrivesApi.js';

const SKELETON_ID      = 'fulfillment-skeleton';
const ERROR_ID         = 'fulfillment-error';
const INSUFFICIENT_ID  = 'fulfillment-insufficient-banner';
const LOCATION_NOTE_ID = 'fulfillment-location-note';
const BRANCH_LIST_ID   = 'branch-options-list';
const CONTINUE_ID      = 'btn-fulfillment-continue';
const BACK_ID          = 'btn-fulfillment-back';
const ESTIMATE_ID      = 'fulfillment-wait-estimate';
const MAP_ID           = 'fulfillment-map';
const MAP_DEFAULT_CENTER = [13.7565, 121.0583]; // Batangas City — same default as bloodDriveCreate.js's map

let _selectedBranchId = null;
let _items            = null;
let _onContinue       = null;
let _onBack           = null;
let _listenersBound    = false; // guard — prevents duplicate listeners if the
                                 // requestor goes back and continues again
let _estimateRequestToken = 0;  // guards against a stale estimate fetch
                                 // overwriting a newer branch selection's result

// Minimum time the "searching" state stays visible, regardless of how fast
// the actual fetch resolves — psychological-effect request: a near-instant
// response feels less trustworthy than a moment of visible "work". Messages
// rotate on an interval to reinforce the impression rather than sitting
// frozen on one line for the full 3s.
const MIN_SEARCH_DISPLAY_MS = 3000;
const MESSAGE_ROTATE_MS     = 1000;
const SEARCH_MESSAGES = [
  'Searching for the nearest blood bank…',
  'Checking branch availability…',
  'Finding your best match…',
];
let _messageRotationTimer = null;

// Map state — mirrors bloodDriveCreate.js's Leaflet pattern. One map
// instance persists for the lifetime of the page (re-created maps on the
// same container id throw), markers just move when the selection changes.
let _map             = null;
let _requestorMarker = null;
let _branchMarker    = null;
let _requestorCoords = null;              // { lat, lon } | null — from geolocation
let _branchCoordsById = new Map();        // branch_id -> { lat, lon }, loaded once

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
  const searchStartedAt = Date.now();

  const { latitude, longitude, usedLocation } = await getRequestorLocation();
  setLocationNote(usedLocation);
  _requestorCoords = usedLocation ? { lat: latitude, lon: longitude } : null;

  try {
    const [result] = await Promise.all([
      getFulfillmentOptions(items, latitude, longitude),
      loadBranchCoords(),
    ]);
    await waitForMinimumSearchDisplay(searchStartedAt);
    hideSkeleton();
    renderResult(result);
  } catch (err) {
    await waitForMinimumSearchDisplay(searchStartedAt);
    hideSkeleton();
    showLoadError(err.message);
  }
}

// Loads every branch's coordinates once per page load (branches list is
// small and effectively static within a session) via the existing
// bloodDrivesApi.getBranches() — reused per the project's feature-to-feature
// API reuse convention rather than duplicating a fetch here. Failure is
// non-blocking: the map simply won't have a branch pin to place if this
// doesn't resolve, but the fulfillment-options flow itself still works.
async function loadBranchCoords() {
  if (_branchCoordsById.size > 0) return;
  try {
    const branches = await getBranches();
    branches.forEach((b) => {
      if (b.latitude != null && b.longitude != null) {
        _branchCoordsById.set(b.branch_id, {
          lat: parseFloat(b.latitude),
          lon: parseFloat(b.longitude),
        });
      }
    });
  } catch {
    // Silent — map degrades to "no branch pin" rather than blocking the step
  }
}

// Pads out the remaining time (if any) so the "searching" state is visible
// for at least MIN_SEARCH_DISPLAY_MS from when it first appeared, whether
// the request succeeds or fails.
function waitForMinimumSearchDisplay(startedAt) {
  const elapsed   = Date.now() - startedAt;
  const remaining = MIN_SEARCH_DISPLAY_MS - elapsed;
  if (remaining <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, remaining));
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
    // Loading text is already shown by showSkeleton() before this runs, so
    // the requestor sees feedback during both the location prompt and the
    // fulfillment-options fetch that follows, not just a blank gap.
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
    : 'Location unavailable - showing branches in default order.';
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
  fetchAndRenderEstimate(_selectedBranchId);
  updateMap(_selectedBranchId);
}

function buildBranchOption(branch, plans, isDefault) {
  const label = document.createElement('label');
  label.className = 'branch-option';

  const radio     = document.createElement('input');
  radio.type      = 'radio';
  radio.name      = 'branch-option';
  radio.value     = branch.branch_id;
  radio.checked   = isDefault;
  radio.addEventListener('change', () => {
    _selectedBranchId = branch.branch_id;
    fetchAndRenderEstimate(branch.branch_id);
    updateMap(branch.branch_id);
  });

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
// Waiting time estimate — bloodsync.md #22-23. Refetched whenever the
// selected branch changes (default selection or a radio change), since the
// estimate is queue-depth per branch, not per request. _estimateRequestToken
// guards against a slow earlier fetch overwriting a newer selection's result
// if the requestor flips between branch options quickly.
// ---------------------------------------------------------------------------

async function fetchAndRenderEstimate(branchId) {
  const el = getOrCreateEstimateEl();
  const token = ++_estimateRequestToken;
  el.textContent = 'Checking estimated response time…';

  try {
    const est = await getWaitEstimate(branchId);
    if (token !== _estimateRequestToken) return; // a newer selection superseded this fetch
    el.textContent = est.is_open
      ? `Estimated response time: ${est.estimate}`
      : `${est.estimate} - ${est.next_open}`;
  } catch {
    if (token !== _estimateRequestToken) return;
    el.textContent = ''; // non-blocking — don't let this fail the branch selection flow
  }
}

function getOrCreateEstimateEl() {
  let el = document.getElementById(ESTIMATE_ID);
  if (!el) {
    el = document.createElement('p');
    el.id = ESTIMATE_ID;
    el.className = 'fulfillment-wait-estimate';
    document.getElementById(LOCATION_NOTE_ID).insertAdjacentElement('afterend', el);
  }
  return el;
}

// ---------------------------------------------------------------------------
// Map — requestor + selected branch pins, Leaflet + OpenStreetMap.
// Same tile source / attribution as bloodDriveCreate.js's venue map.
// One map instance persists for this page's lifetime (Leaflet throws if you
// re-init on the same container id) — subsequent calls just move markers
// and refit the view rather than recreating anything.
// ---------------------------------------------------------------------------

function ensureMapInitialized() {
  if (_map) return;
  if (typeof window.L === 'undefined') return; // CDN failed to load — map silently unavailable

  const mapEl = document.getElementById(MAP_ID);
  if (!mapEl) return;

  const initialCenter = _requestorCoords
    ? [_requestorCoords.lat, _requestorCoords.lon]
    : MAP_DEFAULT_CENTER;

  _map = window.L.map(MAP_ID).setView(initialCenter, 12);

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(_map);

  // Leaflet mis-sizes if the container was hidden (display:none) at init —
  // the fulfillment step should already be visible by the time this runs,
  // but a short invalidateSize() covers any timing edge case, same
  // precedent as bloodDriveCreate.js's modal map.
  setTimeout(() => _map && _map.invalidateSize(), 50);
}

function updateRequestorMarker() {
  if (!_map || !_requestorCoords) return;
  const { lat, lon } = _requestorCoords;
  if (_requestorMarker) {
    _requestorMarker.setLatLng([lat, lon]);
  } else {
    _requestorMarker = window.L.marker([lat, lon]).addTo(_map).bindPopup('Your location');
  }
}

function updateMap(branchId) {
  const mapEl = document.getElementById(MAP_ID);
  if (!mapEl) return;

  if (typeof window.L === 'undefined') {
    mapEl.textContent = 'Map preview is unavailable right now.';
    return;
  }

  ensureMapInitialized();
  if (!_map) return;

  updateRequestorMarker();

  const branchCoords = _branchCoordsById.get(branchId);
  if (!branchCoords) return; // no coordinates on file for this branch — leave map as-is

  if (_branchMarker) {
    _branchMarker.setLatLng([branchCoords.lat, branchCoords.lon]);
  } else {
    _branchMarker = window.L.marker([branchCoords.lat, branchCoords.lon])
      .addTo(_map)
      .bindPopup('Selected branch');
  }

  if (_requestorCoords) {
    const bounds = window.L.latLngBounds([
      [_requestorCoords.lat, _requestorCoords.lon],
      [branchCoords.lat, branchCoords.lon],
    ]);
    _map.fitBounds(bounds, { padding: [40, 40] });
  } else {
    _map.setView([branchCoords.lat, branchCoords.lon], 13);
  }
}

// ---------------------------------------------------------------------------
// Skeleton / error helpers
//
// #fulfillment-skeleton is an empty <div> in submitRequest.html — nothing
// ever rendered inside it, so the requestor previously saw a blank gap
// between selecting items and the branch list appearing. Now populates a
// loading message on show, clears it on hide (matches bloodsync.md's
// requirement for a between-state message during nearest-branch lookup).
// ---------------------------------------------------------------------------

function showSkeleton() {
  const skeletonEl = document.getElementById(SKELETON_ID);
  skeletonEl.textContent = '';
  const msg = document.createElement('p');
  msg.id          = 'fulfillment-loading-message';
  msg.className   = 'fulfillment-loading-message';
  msg.textContent = SEARCH_MESSAGES[0];
  skeletonEl.appendChild(msg);
  skeletonEl.style.display = '';

  document.getElementById(BRANCH_LIST_ID).style.display  = 'none';
  document.getElementById(ERROR_ID).textContent          = '';
  document.getElementById(INSUFFICIENT_ID).style.display = 'none';

  const estimateEl = document.getElementById(ESTIMATE_ID);
  if (estimateEl) estimateEl.textContent = '';

  startMessageRotation();
}

// Cycles through SEARCH_MESSAGES while the skeleton is visible. Guarded by
// _messageRotationTimer so a rapid back-and-forth through this step never
// stacks multiple intervals against the same message element.
function startMessageRotation() {
  stopMessageRotation();
  let index = 0;
  _messageRotationTimer = setInterval(() => {
    index = (index + 1) % SEARCH_MESSAGES.length;
    const msgEl = document.getElementById('fulfillment-loading-message');
    if (msgEl) msgEl.textContent = SEARCH_MESSAGES[index];
  }, MESSAGE_ROTATE_MS);
}

function stopMessageRotation() {
  if (_messageRotationTimer) {
    clearInterval(_messageRotationTimer);
    _messageRotationTimer = null;
  }
}

function hideSkeleton() {
  stopMessageRotation();
  const skeletonEl = document.getElementById(SKELETON_ID);
  skeletonEl.style.display = 'none';
  skeletonEl.textContent   = '';
  document.getElementById(BRANCH_LIST_ID).style.display = '';
}

function showLoadError(message) {
  document.getElementById(ERROR_ID).textContent =
    message || 'Could not load fulfillment options. Please try again.';
}