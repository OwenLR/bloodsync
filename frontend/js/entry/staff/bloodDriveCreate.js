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

const FORM_KEY = 'blood-drive-create-staff';
const REQUIRED = ['name', 'branch_id', 'start_datetime', 'end_datetime'];

function getEditId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('edit');
  return id ? parseInt(id, 10) : null;
}

async function populateBranches(selectedId = null) {
  const select = document.getElementById('branch_id');
  try {
    const branches = await getBranches();
    branches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.branch_id;
      opt.textContent = b.branch_name || b.name;
      if (selectedId && b.branch_id === selectedId) opt.selected = true;
      select.appendChild(opt);
    });
    // Staff are branch-scoped — pre-select their own branch
    if (!selectedId && user_branch_id) {
      select.value = user_branch_id;
    }
  } catch {
    showToast('Could not load branches. Please refresh.', 'error');
  }
}

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

function clearAllFieldErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
}

function showFieldError(field, message) {
  const el = document.getElementById(`${field}-error`);
  if (el) el.textContent = message;
}

function readFormValues() {
  const get = id => document.getElementById(id)?.value ?? '';
  const rawContact = get('contact_number');
  const contact_number = rawContact ? rawContact.replace(/\D/g, '') : '';

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
  };
}

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
  if (drive.start_datetime) set('start_datetime', drive.start_datetime.slice(0, 16));
  if (drive.end_datetime)   set('end_datetime',   drive.end_datetime.slice(0, 16));
}

async function handleSubmit(editId) {
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

  const payload = Object.fromEntries(
    Object.entries(values).filter(([, v]) => v !== undefined)
  );

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
    window.location.href = ROUTES.STAFF.BLOOD_DRIVES;
  } catch (err) {
    showError('submit-error', err.message);
    btn.disabled = false;
    btn.textContent = originalLabel;
    updateSubmitState();
  }
}

// Staff branch_id for pre-selection — set after user loads
let user_branch_id = null;

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.STAFF])) return;

  user_branch_id = user.branch_id;

  const unreadCount = 0;
  renderNavbar(user, unreadCount);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  revealAppShell();

  const editId = getEditId();

  if (editId) {
    document.getElementById('page-title').textContent = 'Edit Blood Drive';
    document.getElementById('submit-btn').textContent = 'Save Changes';
    document.getElementById('submit-btn').disabled = true;
    document.title = 'Edit Blood Drive — BloodSync';

    document.getElementById('drive-form').classList.add('form-loading');

    try {
      await populateBranches();
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
    await populateBranches();
    restoreForm(FORM_KEY);
    updateSubmitState();

    document.getElementById('drive-form').addEventListener('input', () => saveForm(FORM_KEY));
    document.getElementById('drive-form').addEventListener('change', () => saveForm(FORM_KEY));
  }

  attachRequiredListeners();

  document.getElementById('submit-btn').addEventListener('click', () => handleSubmit(editId));
}

init();