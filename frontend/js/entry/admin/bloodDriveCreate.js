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

  // Venue coordinates — set hidden inputs so they are included in updates
  if (drive.venue_latitude)  set('venue_latitude',  drive.venue_latitude);
  if (drive.venue_longitude) set('venue_longitude', drive.venue_longitude);

  // Show pinned status if coordinates exist
  if (drive.venue_latitude && drive.venue_longitude) {
    const statusEl = document.getElementById('pin-location-status');
    if (statusEl) {
      statusEl.textContent = `📍 Pinned (${Number(drive.venue_latitude).toFixed(5)}, ${Number(drive.venue_longitude).toFixed(5)})`;
      statusEl.classList.add('pin-status--set');
    }
  }

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

// ─── Init ─────────────────────────────────────────────────────────────────────

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

  // Pin location button — uses browser geolocation.
  // TODO: replace with Google Maps picker when API key is available.
  document.getElementById('pin-location-btn')?.addEventListener('click', () => {
    const btn    = document.getElementById('pin-location-btn');
    const status = document.getElementById('pin-location-status');

    if (!navigator.geolocation) {
      status.textContent = 'Geolocation is not supported by your browser.';
      status.classList.remove('pin-status--set');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Getting location…';
    status.textContent = '';
    status.classList.remove('pin-status--set');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        document.getElementById('venue_latitude').value  = lat;
        document.getElementById('venue_longitude').value = lon;

        status.textContent = `📍 Pinned (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
        status.classList.add('pin-status--set');
        btn.disabled = false;
        btn.textContent = '📍 Pin Location';

        if (!getEditId()) saveForm(FORM_KEY);
      },
      () => {
        status.textContent = 'Could not get your location. Please enter the address manually.';
        btn.disabled = false;
        btn.textContent = '📍 Pin Location';
      },
      { timeout: 10000 }
    );
  });

  document.getElementById('submit-btn').addEventListener('click', () => {
    handleSubmit(editId, user);
  });
}

init();