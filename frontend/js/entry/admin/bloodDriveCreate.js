import { requireAuth }          from '../../core/guards/authGuard.js';
import { requireRole }          from '../../core/guards/roleGuard.js';
import { renderNavbar }         from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }         from '../../layouts/sidebar.js';
import { revealAppShell }       from '../../layouts/appShell.js';
import { getSidebarItems }      from '../../constants/sidebarItems.js';
import { ROLES }                from '../../constants/roles.js';
import { ROUTES }               from '../../constants/routes.js';
import { saveForm, restoreForm, clearForm } from '../../core/formPersist.js';
import { showError, clearFeedback }         from '../../components/feedback.js';
import { showErrorBoundary }                from '../../components/errorBoundary.js';
import { showToast }                        from '../../components/toast.js';
import { getBranches, createDrive, getDriveById, updateDrive } from '../../features/bloodDrives/bloodDrivesApi.js';
import { validateDriveForm }                from '../../features/bloodDrives/bloodDrivesValidation.js';

const FORM_KEY    = 'blood-drive-create';
const REQUIRED    = ['name', 'branch_id', 'start_datetime', 'end_datetime'];

// ─── Determine mode ───────────────────────────────────────────────────────────

function getEditId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('edit');
  return id ? parseInt(id, 10) : null;
}

// ─── Branch dropdown ──────────────────────────────────────────────────────────

// Admin: shows full branch dropdown.
// PRC Staff: branch is auto-set to their own branch (bloodsync.md item 4) —
// Staff cannot pick a different branch when creating a drive.
async function populateBranches(user, selectedId = null) {
  const select = document.getElementById('branch_id');

  if (user.role_id === ROLES.PRC_STAFF) {
    // Staff: hide the dropdown, show their branch as read-only text,
    // set the hidden value so it gets submitted correctly.
    select.value = user.branch_id;

    // Visually replace the select with a read-only display
    const wrapper = select.parentElement;
    select.style.display = 'none';

    const readOnly = document.createElement('p');
    readOnly.id = 'branch-readonly';
    readOnly.className = 'form-readonly-value';
    readOnly.textContent = 'Loading branch…';
    wrapper.appendChild(readOnly);

    // Still fetch branches to show the branch name
    try {
      const branches = await getBranches();
      const branch = branches.find(b => b.branch_id === user.branch_id);
      readOnly.textContent = branch ? (branch.branch_name || branch.name) : `Branch #${user.branch_id}`;
      // Pre-set the select value even though it's hidden — it will be read by readFormValues()
      const opt = document.createElement('option');
      opt.value = user.branch_id;
      opt.selected = true;
      select.appendChild(opt);
    } catch {
      readOnly.textContent = `Branch #${user.branch_id}`;
      const opt = document.createElement('option');
      opt.value = user.branch_id;
      opt.selected = true;
      select.appendChild(opt);
    }
    return;
  }

  // Admin: full branch dropdown
  try {
    const branches = await getBranches();
    branches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.branch_id;
      opt.textContent = b.branch_name || b.name;
      if (selectedId && b.branch_id === selectedId) opt.selected = true;
      select.appendChild(opt);
    });
  } catch {
    showToast('Could not load branches. Please refresh.', 'error');
  }
}

// ─── Required-field button guard ──────────────────────────────────────────────

function updateSubmitState() {
  const btn = document.getElementById('submit-btn');
  const allFilled = REQUIRED.every(id => {
    const el = document.getElementById(id);
    return el && el.value.trim() !== '';
  });
  btn.disabled = !allFilled;
}

function attachRequiredListeners() {
  REQUIRED.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateSubmitState);
    if (el) el.addEventListener('change', updateSubmitState);
  });
}

// ─── Field error helpers ──────────────────────────────────────────────────────

function clearAllFieldErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
}

function showFieldError(field, message) {
  const el = document.getElementById(`${field}-error`);
  if (el) el.textContent = message;
}

// ─── Read form values ─────────────────────────────────────────────────────────

function readFormValues() {
  const get = id => document.getElementById(id)?.value ?? '';

  // Strip non-digits from contact number before sending
  const rawContact = get('contact_number');
  const contact_number = rawContact ? rawContact.replace(/\D/g, '') : '';

  const lat = get('venue_latitude');
  const lon = get('venue_longitude');

  return {
    name:             get('name').trim(),
    description:      get('description').trim() || undefined,
    branch_id:        get('branch_id') ? parseInt(get('branch_id'), 10) : undefined,
    slots_available:  get('slots_available') ? parseInt(get('slots_available'), 10) : undefined,
    start_datetime:   get('start_datetime'),
    end_datetime:     get('end_datetime'),
    venue_name:       get('venue_name').trim() || undefined,
    venue_type:       get('venue_type') || undefined,
    building:         get('building').trim() || undefined,
    floor_room:       get('floor_room').trim() || undefined,
    street_address:   get('street_address').trim() || undefined,
    city:             get('city').trim() || undefined,
    province:         get('province').trim() || undefined,
    postal_code:      get('postal_code').trim() || undefined,
    contact_person:   get('contact_person').trim() || undefined,
    contact_number:   contact_number || undefined,
    contact_email:    get('contact_email').trim() || undefined,
    venue_latitude:   lat ? parseFloat(lat) : undefined,
    venue_longitude:  lon ? parseFloat(lon) : undefined,
  };
}

// ─── Populate form for edit mode ──────────────────────────────────────────────

function populateForm(drive) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== null && val !== undefined) el.value = val;
  };

  set('name',            drive.name);
  set('description',     drive.description);
  set('branch_id',       drive.branch_id);
  set('slots_available', drive.slots_available);
  set('venue_name',      drive.venue_name);
  set('venue_type',      drive.venue_type);
  set('building',        drive.building);
  set('floor_room',      drive.floor_room);
  set('street_address',  drive.street_address);
  set('city',            drive.city);
  set('province',        drive.province);
  set('postal_code',     drive.postal_code);
  set('contact_person',  drive.contact_person);
  set('contact_number',  drive.contact_number);
  set('contact_email',   drive.contact_email);

  // Venue coordinates — set hidden inputs so initMap() can read them
  // and place the marker at the existing location
  if (drive.venue_latitude)  set('venue_latitude',  drive.venue_latitude);
  if (drive.venue_longitude) set('venue_longitude', drive.venue_longitude);

  // datetime-local expects "YYYY-MM-DDTHH:mm"
  if (drive.start_datetime) {
    set('start_datetime', toDatetimeLocal(drive.start_datetime));
  }
  if (drive.end_datetime) {
    set('end_datetime', toDatetimeLocal(drive.end_datetime));
  }
}

function toDatetimeLocal(isoString) {
  // Slice to "YYYY-MM-DDTHH:mm" which datetime-local inputs expect
  return isoString ? isoString.slice(0, 16) : '';
}

// ─── Submit ───────────────────────────────────────────────────────────────────

async function handleSubmit(editId, user) {
  clearAllFieldErrors();
  clearFeedback('submit-error');

  const values = readFormValues();
  const validation = validateDriveForm(values);

  if (!validation.valid) {
    if (validation.field) showFieldError(validation.field, validation.message);
    else showError('submit-error', validation.message);
    return;
  }

  const btn = document.getElementById('submit-btn');
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = editId ? 'Saving…' : 'Creating…';

  // Remove undefined fields before sending
  const payload = Object.fromEntries(
    Object.entries(values).filter(([, v]) => v !== undefined)
  );

  const drivesRoute = user.role_id === ROLES.ADMIN
    ? ROUTES.ADMIN.BLOOD_DRIVES
    : ROUTES.STAFF.BLOOD_DRIVES;

  try {
    if (editId) {
      await updateDrive(editId, payload);
      clearForm(FORM_KEY);
      showToast('Blood drive updated.', 'success');
    } else {
      await createDrive(payload);
      clearForm(FORM_KEY);
      showToast('Blood drive created.', 'success');
    }
    window.location.href = drivesRoute;
  } catch (err) {
    showError('submit-error', err.message);
    btn.disabled = false;
    btn.textContent = originalLabel;
    updateSubmitState();
  }
}

// ─── Map picker (Leaflet + OpenStreetMap + Nominatim) ────────────────────────
//
// Section A: map renders, click to drop pin, coordinates saved to hidden inputs.
// Section B: on pin drop/drag, Nominatim reverse geocode auto-fills address fields.
// Section C: search bar forward geocodes a typed address, flies map to result,
//            drops pin, then triggers Section B auto-fill.
//
// Default center: Batangas City (PRC branch area).
// Leaflet is loaded via <script> tag in the HTML — available as window.L.

const MAP_DEFAULT_CENTER = [13.7565, 121.0583]; // Batangas City
const MAP_DEFAULT_ZOOM   = 13;
const NOMINATIM_BASE     = 'https://nominatim.openstreetmap.org';

let _map       = null; // inline map instance
let _marker    = null; // inline map marker
let _modalMap  = null; // modal map instance (separate — Leaflet can't move between containers)
let _modalMarker = null; // modal map marker

// ── Section B: Nominatim reverse geocode ─────────────────────────────────────
//
// Maps Nominatim address components to the form fields.
// Nominatim returns an `address` object — field names vary by location type.
// Priority order handles cases where some fields are absent (e.g. no road name).

async function reverseGeocode(lat, lng) {
  const statusEl = document.getElementById('map-pin-status');
  statusEl.textContent = '📍 Looking up address…';

  try {
    const res = await fetch(
      `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );

    if (!res.ok) throw new Error('Nominatim request failed');

    const data = await res.json();
    const addr = data.address || {};

    // street_address — road + house number if available
    const road        = addr.road || addr.pedestrian || addr.footway || addr.path || '';
    const houseNumber = addr.house_number || '';
    const street      = houseNumber ? `${houseNumber} ${road}` : road;

    // city — municipality > city > town > village > suburb (in priority order)
    const city = addr.city_district || addr.municipality || addr.city || addr.town || addr.village || addr.suburb || '';

    // province — state is the Nominatim key for Philippine provinces
    const province = addr.state || addr.province || '';

    // postal_code
    const postal_code = addr.postcode || '';

    autofillField('street_address', street);
    autofillField('city',           city);
    autofillField('province',       province);
    autofillField('postal_code',    postal_code);

    statusEl.textContent = `📍 Pinned at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    // Save draft after auto-fill if in create mode
    if (!getEditId()) saveForm(FORM_KEY);

  } catch {
    // Reverse geocode failure is non-fatal — coordinates are still saved,
    // staff can fill in address fields manually.
    statusEl.textContent = `📍 Pinned at ${lat.toFixed(6)}, ${lng.toFixed(6)} (address lookup unavailable)`;
  }
}

// Always overwrite — the map pin is the source of truth.
// Dropping a new pin means a new location is selected;
// address fields must update to match even if they had prior content.
function autofillField(fieldId, value) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.value = value || '';
}

// ── Section C: Nominatim forward geocode (search bar) ────────────────────────

async function geocodeSearch(query) {
  const searchError = document.getElementById('map-search-error');
  const btn         = document.getElementById('map-search-btn');

  searchError.textContent = '';
  btn.disabled    = true;
  btn.textContent = 'Searching…';

  try {
    const res = await fetch(
      `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );

    if (!res.ok) throw new Error('Search request failed');

    const results = await res.json();

    if (!results.length) {
      searchError.textContent = 'No location found for that address. Try a more specific search.';
      return;
    }

    const { lat, lon } = results[0];
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);

    // Fly the map to the result then drop the pin
    // placeMarker triggers saveCoordinates which saves hidden inputs
    // Then reverseGeocode auto-fills address fields from the landed coordinates
    _map.flyTo([parsedLat, parsedLon], 16, { animate: true, duration: 1 });
    placeMarker(parsedLat, parsedLon);

  } catch {
    searchError.textContent = 'Address search is unavailable right now. You can still click the map to drop a pin.';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Search';
  }
}

function attachSearchListeners() {
  const btn   = document.getElementById('map-search-btn');
  const input = document.getElementById('map-search-input');

  btn.addEventListener('click', () => {
    const q = input.value.trim();
    if (q) geocodeSearch(q);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // prevent accidental form submit
      const q = input.value.trim();
      if (q) geocodeSearch(q);
    }
  });
}

// ── Section A: map init, pin placement, coordinate persistence ───────────────

function initMap(existingLat, existingLon) {
  // Guard — L must be available from the CDN script tag
  if (typeof window.L === 'undefined') {
    document.getElementById('map-pin-status').textContent =
      'Map could not load. Please check your internet connection.';
    return;
  }

  const center = (existingLat && existingLon)
    ? [existingLat, existingLon]
    : MAP_DEFAULT_CENTER;

  const zoom = (existingLat && existingLon) ? 15 : MAP_DEFAULT_ZOOM;

  _map = window.L.map('venue-map').setView(center, zoom);

  // OpenStreetMap tile layer — free, no API key
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(_map);

  // If editing a drive that already has coordinates, place the marker immediately.
  // Do NOT reverse geocode in edit mode — address fields are already populated.
  if (existingLat && existingLon) {
    placeMarkerOnly(existingLat, existingLon);
    document.getElementById('map-pin-status').textContent =
      `📍 Pinned at ${existingLat.toFixed(6)}, ${existingLon.toFixed(6)}`;
  }

  // Click anywhere on the map to drop/move the pin + trigger reverse geocode
  _map.on('click', (e) => {
    placeMarker(e.latlng.lat, e.latlng.lng);
  });

  attachSearchListeners();

  // Expand button — opens modal map
  document.getElementById('map-expand-btn').addEventListener('click', openMapModal);
}

// placeMarker: used for new pins (click or search result) — saves coords + reverse geocodes
function placeMarker(lat, lng) {
  placeMarkerOnly(lat, lng);
  saveCoordinates(lat, lng);
  reverseGeocode(lat, lng); // Section B — async, non-blocking
}

// placeMarkerOnly: moves the pin visually without triggering geocode side-effects.
// Used in edit mode on init (address already known) and internally by placeMarker.
function placeMarkerOnly(lat, lng) {
  if (_marker) {
    _marker.setLatLng([lat, lng]);
  } else {
    _marker = window.L.marker([lat, lng], { draggable: true }).addTo(_map);

    // Drag to fine-tune — saves coords + reverse geocodes on dragend
    _marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      saveCoordinates(pos.lat, pos.lng);
      reverseGeocode(pos.lat, pos.lng);
    });
  }
}

function saveCoordinates(lat, lng) {
  document.getElementById('venue_latitude').value  = lat;
  document.getElementById('venue_longitude').value = lng;

  // Status line updated by reverseGeocode() after it resolves;
  // show interim message immediately so the user sees feedback right away.
  document.getElementById('map-pin-status').textContent =
    `📍 Pinned at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  // Save draft if in create mode
  if (!getEditId()) saveForm(FORM_KEY);
}

// ── Map expand modal (Section D) ─────────────────────────────────────────────
//
// Clicking the expand button opens a fullscreen modal with a second Leaflet map.
// Two separate instances are used — Leaflet does not support moving a map between
// DOM containers. Both maps stay in sync via the shared hidden inputs.
// Closing the modal (✕ or backdrop click) tears down the modal map instance.

function openMapModal() {
  const existingLat = parseFloat(document.getElementById('venue_latitude').value) || null;
  const existingLon = parseFloat(document.getElementById('venue_longitude').value) || null;

  // Build modal DOM
  const overlay = document.createElement('div');
  overlay.id = 'map-modal-overlay';
  overlay.className = 'map-modal-overlay';

  overlay.innerHTML = `
    <div class="map-modal">
      <div class="map-modal-header">
        <span class="map-modal-title">Pick Venue Location</span>
        <button type="button" class="map-modal-close" id="map-modal-close" aria-label="Close map">✕</button>
      </div>
      <div class="map-modal-search-row">
        <input id="map-modal-search-input" type="text" class="map-search-input"
          placeholder="Search address… (e.g. Batangas City Hall)" autocomplete="off" />
        <button id="map-modal-search-btn" type="button" class="btn-secondary map-search-btn">Search</button>
      </div>
      <div id="map-modal-search-error" class="map-search-error"></div>
      <div id="venue-map-modal" class="map-modal-canvas"></div>
      <p id="map-modal-pin-status" class="map-pin-status"></p>
    </div>
  `;

  document.body.appendChild(overlay);

  // Prevent body scroll while modal is open
  document.body.classList.add('map-modal-open');

  // Init modal map — center on existing pin if set, else default
  const center = (existingLat && existingLon) ? [existingLat, existingLon] : MAP_DEFAULT_CENTER;
  const zoom   = (existingLat && existingLon) ? 15 : MAP_DEFAULT_ZOOM;

  _modalMap = window.L.map('venue-map-modal').setView(center, zoom);

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(_modalMap);

  // Pre-place marker if coordinates already set
  if (existingLat && existingLon) {
    placeModalMarker(existingLat, existingLon, false); // false = no geocode on open
    document.getElementById('map-modal-pin-status').textContent =
      `📍 Pinned at ${existingLat.toFixed(6)}, ${existingLon.toFixed(6)}`;
  }

  // Click to drop pin on modal map
  _modalMap.on('click', (e) => {
    placeModalMarker(e.latlng.lat, e.latlng.lng, true);
  });

  // Search bar inside modal
  attachModalSearchListeners();

  // Close handlers
  document.getElementById('map-modal-close').addEventListener('click', closeMapModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeMapModal();
  });
  document.addEventListener('keydown', onModalKeydown);

  // Leaflet needs a size invalidation after the modal becomes visible
  setTimeout(() => _modalMap && _modalMap.invalidateSize(), 50);
}

function placeModalMarker(lat, lng, triggerGeocode) {
  if (_modalMarker) {
    _modalMarker.setLatLng([lat, lng]);
  } else {
    _modalMarker = window.L.marker([lat, lng], { draggable: true }).addTo(_modalMap);

    _modalMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      syncPinFromModal(pos.lat, pos.lng, true);
    });
  }

  syncPinFromModal(lat, lng, triggerGeocode);
}

function syncPinFromModal(lat, lng, triggerGeocode) {
  // Update hidden inputs (shared with inline map)
  document.getElementById('venue_latitude').value  = lat;
  document.getElementById('venue_longitude').value = lng;

  // Update inline map marker position to stay in sync
  if (_marker) {
    _marker.setLatLng([lat, lng]);
  } else if (_map) {
    _marker = window.L.marker([lat, lng], { draggable: true }).addTo(_map);
    _marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      saveCoordinates(pos.lat, pos.lng);
      reverseGeocode(pos.lat, pos.lng);
    });
  }

  const statusText = `📍 Pinned at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  document.getElementById('map-pin-status').textContent = statusText;

  const modalStatus = document.getElementById('map-modal-pin-status');
  if (modalStatus) modalStatus.textContent = statusText;

  if (triggerGeocode) reverseGeocode(lat, lng);

  if (!getEditId()) saveForm(FORM_KEY);
}

function attachModalSearchListeners() {
  const btn   = document.getElementById('map-modal-search-btn');
  const input = document.getElementById('map-modal-search-input');
  const errEl = document.getElementById('map-modal-search-error');

  async function doSearch() {
    const q = input.value.trim();
    if (!q) return;

    errEl.textContent   = '';
    btn.disabled        = true;
    btn.textContent     = 'Searching…';

    try {
      const res = await fetch(
        `${NOMINATIM_BASE}/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );

      if (!res.ok) throw new Error();
      const results = await res.json();

      if (!results.length) {
        errEl.textContent = 'No location found. Try a more specific search.';
        return;
      }

      const parsedLat = parseFloat(results[0].lat);
      const parsedLon = parseFloat(results[0].lon);

      _modalMap.flyTo([parsedLat, parsedLon], 16, { animate: true, duration: 1 });
      placeModalMarker(parsedLat, parsedLon, true);

    } catch {
      errEl.textContent = 'Search unavailable right now. Click the map to drop a pin.';
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Search';
    }
  }

  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
  });
}

function onModalKeydown(e) {
  if (e.key === 'Escape') closeMapModal();
}

function closeMapModal() {
  // Also pan the inline map to the current pin if one was set
  const lat = parseFloat(document.getElementById('venue_latitude').value);
  const lng = parseFloat(document.getElementById('venue_longitude').value);
  if (_map && lat && lng) {
    _map.setView([lat, lng], 15, { animate: false });
  }

  // Tear down modal map — must remove before removing the container from DOM
  if (_modalMap) {
    _modalMap.remove();
    _modalMap    = null;
    _modalMarker = null;
  }

  document.removeEventListener('keydown', onModalKeydown);
  document.body.classList.remove('map-modal-open');

  const overlay = document.getElementById('map-modal-overlay');
  if (overlay) overlay.remove();
}


async function init() {
  const user = await requireAuth();
  if (!user) return;

  // Both Admin and PRC Staff can create/edit blood drives (bloodsync.md item 1)
  if (!requireRole(user, [ROLES.ADMIN, ROLES.PRC_STAFF])) return;

  const unreadCount = 0;
  renderNavbar(user, unreadCount);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  revealAppShell();

  // Set back/cancel links to the correct role's blood drives page
  const drivesRoute = user.role_id === ROLES.ADMIN
    ? ROUTES.ADMIN.BLOOD_DRIVES
    : ROUTES.STAFF.BLOOD_DRIVES;

  document.getElementById('back-link').href   = drivesRoute;
  document.getElementById('cancel-link').href = drivesRoute;

  const editId = getEditId();

  if (editId) {
    document.getElementById('page-title').textContent = 'Edit Blood Drive';
    document.getElementById('submit-btn').textContent = 'Save Changes';
    document.getElementById('submit-btn').disabled = true;
    document.title = 'Edit Blood Drive — BloodSync';

    document.getElementById('drive-form').classList.add('form-loading');

    try {
      await populateBranches(user);
      const drive = await getDriveById(editId);

      if (drive.status === 'Ended' || drive.status === 'Cancelled') {
        showErrorBoundary('form-error-boundary',
          `This drive is ${drive.status} and cannot be edited.`);
        document.getElementById('drive-form').style.display = 'none';
        return;
      }

      populateForm(drive);
      document.getElementById('drive-form').classList.remove('form-loading');
      updateSubmitState();
    } catch (err) {
      showErrorBoundary('form-error-boundary',
        'Could not load drive details. Please go back and try again.');
      return;
    }
  } else {
    // Create mode — populate branches then restore draft
    await populateBranches(user);
    restoreForm(FORM_KEY);
    updateSubmitState();

    // Auto-save draft on every change
    document.getElementById('drive-form').addEventListener('input', () => {
      saveForm(FORM_KEY);
    });
    document.getElementById('drive-form').addEventListener('change', () => {
      saveForm(FORM_KEY);
    });
  }

  attachRequiredListeners();

  // Initialise the map picker.
  // In edit mode: map starts at existing coordinates (marker pre-placed).
  // In create mode: map starts at Batangas City default center.
  const existingLat = parseFloat(document.getElementById('venue_latitude').value) || null;
  const existingLon = parseFloat(document.getElementById('venue_longitude').value) || null;
  initMap(existingLat, existingLon);

  document.getElementById('submit-btn').addEventListener('click', () => {
    handleSubmit(editId, user);
  });
}

init();