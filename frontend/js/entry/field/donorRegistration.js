import { requireAuth }        from '../../core/guards/authGuard.js';
import { requireRole }        from '../../core/guards/roleGuard.js';
import { renderNavbar }       from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }       from '../../layouts/sidebar.js';
import { revealAppShell }     from '../../layouts/appShell.js';
import { getSidebarItems }    from '../../constants/sidebarItems.js';
import { ROLES }              from '../../constants/roles.js';
import { showToast }          from '../../components/toast.js';
import { apiFetch }                from '../../core/api.js';
import { initSearchableDropdown } from '../../components/searchableDropdown.js';
import {
  getDonorById,
  createDonor,
  searchDonors,
  updateDonorContact,
  updateDonorFull,
} from '../../features/fieldWorkflow/fieldWorkflowApi.js';
import {
  validateDonorRegistration,
  validateContactUpdate,
} from '../../features/fieldWorkflow/fieldWorkflowValidation.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _user             = null;
let _selectedDonor    = null;  // existing donor selected from search
let _registeredDonor  = null;  // newly created donor after form submit
let _searchTimer      = null;
let _duplicateTimers  = {};    // per-field blur timers

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  _user = await requireAuth();
  if (!_user) return;

  if (!requireRole(_user, [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST, ROLES.ADMIN, ROLES.PRC_STAFF])) return;

  renderNavbar(_user, 0);
  clearSidebar();
  renderSidebar(getSidebarItems(_user.role_id, 'general'),  'General');
  renderSidebar(getSidebarItems(_user.role_id, 'workflow'), 'Workflow');
  renderSidebar(getSidebarItems(_user.role_id, 'drive'),    'My Drive');

  revealAppShell();

  await _initSearchDropdown();
  _setupDuplicateDetection();
  _setupRegistrationForm();
  _setupContactUpdateForm();
  _setupClearSelection();
  _setupResetBtn();
  _setupRegisterAnotherBtn();
}

// ─── Search ───────────────────────────────────────────────────────────────────
// ─── Search Dropdown (existing donor lookup) ─────────────────────────────────
// Loads all donors on page load and filters client-side.
// On select: auto-fills form fields (read-only) and shows contact update section.

let _searchDropdown = null;

async function _initSearchDropdown() {
  const errorEl = document.getElementById('donor-search-error');

  try {
    // Load all donors for client-side filtering
    const donors = await _loadAllDonors();

    _searchDropdown = initSearchableDropdown({
      inputId:      'donor-search-input',
      listId:       'donor-search-list',
      items:         donors,
      displayFn:    (d) => `${d.first_name} ${d.last_name}`,
      subDisplayFn: (d) => [d.blood_type, d.sex, d.birthdate].filter(Boolean).join(' · '),
      filterFn:     (d, q) =>
        `${d.first_name} ${d.last_name}`.toLowerCase().includes(q) ||
        (d.id_number || '').toLowerCase().includes(q),
      onSelect:     _selectExistingDonor,
      placeholder:  'Click to search existing donors…',
      emptyMessage: 'No matching donor found. Register them as new below.',
    });
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = err.message || 'Failed to load donor list. Refresh to try again.';
      errorEl.classList.remove('field-error-hidden');
    }
  }
}

async function _loadAllDonors() {
  const res  = await apiFetch('/api/donors');
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load donors.');
  return body.data || [];
}

// ─── Select Existing Donor ────────────────────────────────────────────────────

async function _selectExistingDonor(donor) {
  _selectedDonor   = donor;
  _registeredDonor = null;

  // Clear the search dropdown — keeps input clean after selection
  if (_searchDropdown) _searchDropdown.clear();

  // Show banner
  const banner = document.getElementById('selected-donor-banner');
  const nameEl = document.getElementById('selected-donor-name');
  const metaEl = document.getElementById('selected-donor-meta');
  if (banner && nameEl && metaEl) {
    nameEl.textContent = `${donor.first_name} ${donor.last_name}`;
    metaEl.textContent = [donor.blood_type, donor.sex, donor.contact, donor.email]
      .filter(Boolean).join(' · ');
    _showEl(banner);
  }

  // Auto-fill registration form (read-only view of existing data)
  _populateForm(donor);
  _lockFormFields(true);

  // Update card title
  const title = document.getElementById('form-card-title');
  if (title) title.textContent = 'Existing Donor Details';

  // Hide register button, show contact update section
  _hideEl(document.getElementById('reg-submit-btn'));
  _hideEl(document.getElementById('reg-reset-btn'));
  _showEl(document.getElementById('contact-update-section'));

  // Pre-fill contact update form
  const emailEl   = document.getElementById('update-email');
  const contactEl = document.getElementById('update-contact');
  if (emailEl)   emailEl.value   = donor.email   || '';
  if (contactEl) contactEl.value = donor.contact || '';

  // Check if donor has no email — prompt to add one
  if (!donor.email) {
    showToast(
      'This donor has no email on record. Please add one before proceeding to donation.',
      'warning'
    );
  }

  // Show proceed section if no email issue — staff can still proceed to interview
  _showProceedSection(donor);
}

function _lockFormFields(locked) {
  const fields = [
    'reg-first-name', 'reg-last-name', 'reg-birthdate',
    'reg-sex', 'reg-email', 'reg-contact', 'reg-blood-type', 'reg-id-number',
  ];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = locked;
  });
}

function _populateForm(donor) {
  _setField('reg-first-name',  donor.first_name);
  _setField('reg-last-name',   donor.last_name);
  // Birthdate from API may be a full ISO string (e.g. "1995-06-14T16:00:00.000Z").
  // date inputs require exactly "yyyy-MM-dd" — slice to first 10 characters.
  _setField('reg-birthdate',   donor.birthdate ? donor.birthdate.slice(0, 10) : '');
  _setField('reg-sex',         donor.sex);
  _setField('reg-email',       donor.email);
  _setField('reg-contact',     donor.contact);
  _setField('reg-blood-type',  donor.blood_type);
  _setField('reg-id-number',   donor.id_number);
}

// ─── Clear Selection ──────────────────────────────────────────────────────────

function _setupClearSelection() {
  const btn = document.getElementById('clear-selection-btn');
  if (!btn) return;
  btn.addEventListener('click', _clearSelection);
}

function _clearSelection() {
  _selectedDonor   = null;
  _registeredDonor = null;

  _hideEl(document.getElementById('selected-donor-banner'));
  _hideEl(document.getElementById('contact-update-section'));
  _hideEl(document.getElementById('proceed-section'));

  const title = document.getElementById('form-card-title');
  if (title) title.textContent = 'Donor Information';

  _showEl(document.getElementById('reg-submit-btn'));
  _showEl(document.getElementById('reg-reset-btn'));

  _resetForm();
  _lockFormFields(false);
}

// ─── Duplicate Detection (blur) ───────────────────────────────────────────────

function _setupDuplicateDetection() {
  // Government ID — single field trigger
  const idInput = document.getElementById('reg-id-number');
  if (idInput) {
    idInput.addEventListener('blur', () => {
      if (_selectedDonor) return; // already viewing existing donor
      const val = idInput.value.trim();
      if (!val) return;
      _checkDuplicate('id', { id_number: val }, 'reg-id-duplicate');
    });
  }

  // Email — warn if the same email is already registered
  const emailInput = document.getElementById('reg-email');
  if (emailInput) {
    emailInput.addEventListener('blur', () => {
      if (_selectedDonor) return;
      const email = emailInput.value.trim();
      if (!email) return;
      _checkDuplicate('email', { email }, 'reg-email-duplicate');
    });
  }

  // Contact — warn if the same contact number is already registered
  const contactInput = document.getElementById('reg-contact');
  if (contactInput) {
    contactInput.addEventListener('blur', () => {
      if (_selectedDonor) return;
      const contact = contactInput.value.trim();
      if (!contact) return;
      _checkDuplicate('contact', { contact }, 'reg-contact-duplicate');
    });
  }

  // Name + birthdate — only trigger when ALL THREE have values
  const firstNameInput = document.getElementById('reg-first-name');
  const lastNameInput  = document.getElementById('reg-last-name');
  const birthdateInput = document.getElementById('reg-birthdate');

  [firstNameInput, lastNameInput, birthdateInput].forEach(input => {
    if (!input) return;
    input.addEventListener('blur', () => {
      if (_selectedDonor) return;

      const firstName = firstNameInput ? firstNameInput.value.trim() : '';
      const lastName  = lastNameInput  ? lastNameInput.value.trim()  : '';
      const birthdate = birthdateInput ? birthdateInput.value.trim() : '';

      // All three must have values to trigger
      if (!firstName || !lastName || !birthdate) return;

      _checkDuplicate(
        'name-birthdate',
        { first_name: firstName, last_name: lastName, birthdate },
        'reg-name-birthdate-duplicate'
      );
    });
  });
}

async function _checkDuplicate(type, searchData, warningElId) {
  const warningEl = document.getElementById(warningElId);
  if (!warningEl) return;

  // Clear previous warning
  _hideEl(warningEl);

  // Build query string
  let query;
  if (type === 'id') {
    query = searchData.id_number;
  } else if (type === 'email') {
    query = searchData.email;
  } else if (type === 'contact') {
    query = searchData.contact.replace(/\D/g, '');
  } else {
    query = `${searchData.first_name} ${searchData.last_name}`;
  }

  // Show checking state
  const checkingEl = type === 'id'
    ? document.getElementById('reg-id-number-error')
    : null;

  // Use a small debounce
  clearTimeout(_duplicateTimers[type]);
  _duplicateTimers[type] = setTimeout(async () => {
    try {
      const donors = await searchDonors(query);
      if (!donors || donors.length === 0) return;

      let match = null;
      if (type === 'id') {
        match = donors.find(d => d.id_number === searchData.id_number);
      } else if (type === 'email') {
        match = donors.find(d => d.email && d.email.toLowerCase() === searchData.email.toLowerCase());
      } else if (type === 'contact') {
        const normalized = searchData.contact.replace(/\D/g, '');
        match = donors.find(d => d.contact && d.contact.replace(/\D/g, '') === normalized);
      } else {
        match = donors.find(d =>
          d.first_name.toLowerCase()  === searchData.first_name.toLowerCase() &&
          d.last_name.toLowerCase()   === searchData.last_name.toLowerCase()  &&
          d.birthdate                 === searchData.birthdate
        );
      }

      if (!match) return;

      // Show warning
      const textEl = warningEl.querySelector('.duplicate-warning-text');
      if (textEl) {
        textEl.textContent = type === 'id'
          ? 'A donor with this ID number is already registered.'
          : type === 'email'
          ? 'A donor with this email address is already registered.'
          : type === 'contact'
          ? 'A donor with this contact number is already registered.'
          : 'A donor with the same name and birthdate is already registered.';
      }

      const viewBtn = warningEl.querySelector('.duplicate-warning-btn');
      if (viewBtn) {
        viewBtn.onclick = () => _selectExistingDonor(match);
      }

      _showEl(warningEl);
    } catch (_err) {
      // Silently ignore — duplicate check is best-effort
    }
  }, 400);
}

// ─── Registration Form ────────────────────────────────────────────────────────

function _setupRegistrationForm() {
  const form = document.getElementById('donor-registration-form');
  if (!form) return;
  form.addEventListener('submit', _handleRegisterSubmit);
}

async function _handleRegisterSubmit(e) {
  e.preventDefault();
  if (_selectedDonor) return; // should not happen — button is hidden

  _clearAllFieldErrors('donor-registration-form');

  const data = {
    first_name:  _getField('reg-first-name'),
    last_name:   _getField('reg-last-name'),
    birthdate:   _getField('reg-birthdate'),
    sex:         _getField('reg-sex'),
    email:       _getField('reg-email'),
    contact:     _getField('reg-contact')
      ? _getField('reg-contact').replace(/\D/g, '') || undefined
      : undefined,
    blood_type:  _getField('reg-blood-type') || undefined,
  };

  // Include ID number if filled
  const idVal = _getField('reg-id-number');
  if (idVal) data.id_number = idVal;

  const { valid, errors } = validateDonorRegistration(data);
  if (!valid) {
    _showFieldErrors(errors, {
      first_name: 'reg-first-name-error',
      last_name:  'reg-last-name-error',
      birthdate:  'reg-birthdate-error',
      sex:        'reg-sex-error',
      email:      'reg-email-error',
      contact:    'reg-contact-error',
      blood_type: 'reg-blood-type-error',
    });
    return;
  }

  const submitBtn = document.getElementById('reg-submit-btn');
  if (submitBtn) {
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Registering...';
  }

  try {
    const donor = await createDonor(data);
    _registeredDonor = donor;
    showToast('Donor registered successfully.', 'success');
    _showProceedSection(donor);

    // Hide form buttons after success
    if (submitBtn) _hideEl(submitBtn);
    _hideEl(document.getElementById('reg-reset-btn'));
  } catch (err) {
    if (err.status === 409) {
      const formError = document.getElementById('reg-form-error');
      if (formError) {
        formError.textContent = 'A donor with this information is already registered. Search for them above and select their existing record.';
        _showEl(formError);
      }
    } else {
      const formError = document.getElementById('reg-form-error');
      if (formError) {
        formError.textContent = err.message || 'Failed to register donor. Please try again.';
        _showEl(formError);
      }
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Register Donor';
    }
  }
}

// ─── Contact Update Form ──────────────────────────────────────────────────────

function _setupContactUpdateForm() {
  const form = document.getElementById('contact-update-form');
  if (!form) return;
  form.addEventListener('submit', _handleContactUpdateSubmit);
}

async function _handleContactUpdateSubmit(e) {
  e.preventDefault();
  if (!_selectedDonor) return;

  _clearAllFieldErrors('contact-update-form');

  const data = {};
  const emailVal   = _getField('update-email');
  const contactVal = _getField('update-contact');
  if (emailVal)   data.email   = emailVal;
  if (contactVal) data.contact = contactVal.replace(/\D/g, '');

  const { valid, errors } = validateContactUpdate(data);
  if (!valid) {
    _showFieldErrors(errors, {
      email:   'update-email-error',
      contact: 'update-contact-error',
    });
    if (errors.general) {
      const errEl = document.getElementById('contact-update-error');
      if (errEl) {
        errEl.textContent = errors.general;
        _showEl(errEl);
      }
    }
    return;
  }

  const btn = document.getElementById('contact-update-btn');
  if (btn) {
    btn.disabled    = true;
    btn.textContent = 'Updating...';
  }

  try {
    // Admin and PRC Staff must use PATCH /api/donors/:id (full update endpoint).
    // Volunteer and Phlebotomist use PATCH /api/donors/:id/contact (contact-only).
    // The contact-only endpoint rejects Admin/Staff with 403 — backend enforces this.
    const isFieldRole = _user.role_id === ROLES.VOLUNTEER || _user.role_id === ROLES.PHLEBOTOMIST;
    const updated = isFieldRole
      ? await updateDonorContact(_selectedDonor.donor_id, data)
      : await updateDonorFull(_selectedDonor.donor_id, data);
    _selectedDonor = updated;
    showToast('Contact information updated.', 'success');

    // Update banner meta
    const metaEl = document.getElementById('selected-donor-meta');
    if (metaEl) {
      metaEl.textContent = [updated.blood_type, updated.sex, updated.contact, updated.email]
        .filter(Boolean).join(' · ');
    }

    // Update form fields to reflect new values
    _setField('reg-email',   updated.email);
    _setField('reg-contact', updated.contact);

    // Re-check proceed section (email may now be present)
    _showProceedSection(updated);
  } catch (err) {
    const errEl = document.getElementById('contact-update-error');
    if (errEl) {
      errEl.textContent = err.message || 'Failed to update contact. Please try again.';
      _showEl(errEl);
    }
  } finally {
    if (btn) {
      btn.disabled    = false;
      btn.textContent = 'Update Contact';
    }
  }
}

// ─── Proceed Section ──────────────────────────────────────────────────────────

function _showProceedSection(donor) {
  const section = document.getElementById('proceed-section');
  if (!section) return;

  // Always show proceed — interview step doesn't require email
  _showEl(section);

  // Store donor_id in sessionStorage so interview page can pre-select this donor
  try {
    sessionStorage.setItem('field_donor_id', donor.donor_id);
    sessionStorage.setItem('field_donor_name', `${donor.first_name} ${donor.last_name}`);
  } catch (_e) {
    // sessionStorage unavailable — not a blocker
  }
}

// ─── Reset ────────────────────────────────────────────────────────────────────

function _setupResetBtn() {
  const btn = document.getElementById('reg-reset-btn');
  if (!btn) return;
  btn.addEventListener('click', _resetForm);
}

function _resetForm() {
  const form = document.getElementById('donor-registration-form');
  if (form) form.reset();
  _clearAllFieldErrors('donor-registration-form');
  _hideEl(document.getElementById('reg-form-error'));
  _hideEl(document.getElementById('reg-id-duplicate'));
  _hideEl(document.getElementById('reg-email-duplicate'));
  _hideEl(document.getElementById('reg-contact-duplicate'));
  _hideEl(document.getElementById('reg-name-birthdate-duplicate'));
  _hideEl(document.getElementById('proceed-section'));
  _registeredDonor = null;
}

function _setupRegisterAnotherBtn() {
  const btn = document.getElementById('proceed-register-another-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    _clearSelection();
    _resetForm();
  });
}

// ─── DOM Helpers ──────────────────────────────────────────────────────────────

function _getField(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function _setField(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

function _showEl(el) {
  if (el) el.style.display = '';
}

function _hideEl(el) {
  if (el) el.style.display = 'none';
}

function _showFieldErrors(errors, idMap) {
  Object.entries(errors).forEach(([field, message]) => {
    const errorId = idMap[field];
    if (!errorId) return;
    const el = document.getElementById(errorId);
    if (el) {
      el.textContent = message;
      el.classList.remove('field-error-hidden');
    }
  });
}

function _clearAllFieldErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('.field-error').forEach(el => {
    el.textContent = '';
    el.classList.add('field-error-hidden');
  });
  const formErr = form.querySelector('.form-error');
  if (formErr) _hideEl(formErr);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

init();