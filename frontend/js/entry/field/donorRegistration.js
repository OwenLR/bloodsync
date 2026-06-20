import { requireAuth }        from '../../core/guards/authGuard.js';
import { requireRole }        from '../../core/guards/roleGuard.js';
import { renderNavbar }       from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }       from '../../layouts/sidebar.js';
import { revealAppShell }     from '../../layouts/appShell.js';
import { getSidebarItems }    from '../../constants/sidebarItems.js';
import { ROLES }              from '../../constants/roles.js';
import { showToast }          from '../../components/toast.js';
import {
  searchDonors,
  getDonorById,
  createDonor,
  updateDonorContact,
} from '../../features/fieldWorkflow/fieldWorkflowApi.js';
import {
  validateDonorRegistration,
  validateContactUpdate,
  validateSearchQuery,
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

  if (!requireRole(_user, [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST])) return;

  renderNavbar(_user, 0);
  clearSidebar();
  renderSidebar(getSidebarItems(_user.role_id, 'general'),  'General');
  renderSidebar(getSidebarItems(_user.role_id, 'workflow'), 'Workflow');
  renderSidebar(getSidebarItems(_user.role_id, 'drive'),    'My Drive');

  revealAppShell();

  _setupSearch();
  _setupDuplicateDetection();
  _setupRegistrationForm();
  _setupContactUpdateForm();
  _setupClearSelection();
  _setupResetBtn();
}

// ─── Search ───────────────────────────────────────────────────────────────────

function _setupSearch() {
  const btn   = document.getElementById('donor-search-btn');
  const input = document.getElementById('donor-search-input');
  if (!btn || !input) return;

  btn.addEventListener('click', () => _runSearch());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') _runSearch();
  });
}

async function _runSearch() {
  const input     = document.getElementById('donor-search-input');
  const errorEl   = document.getElementById('donor-search-error');
  const statusEl  = document.getElementById('donor-search-status');
  const resultsEl = document.getElementById('donor-search-results');
  const btn       = document.getElementById('donor-search-btn');

  if (!input) return;
  const query = input.value.trim();

  _hideEl(errorEl);
  _hideEl(resultsEl);
  _hideEl(statusEl);

  const { valid, message } = validateSearchQuery(query);
  if (!valid) {
    _showEl(errorEl);
    errorEl.textContent = message;
    return;
  }

  btn.disabled        = true;
  btn.textContent     = 'Searching...';
  statusEl.textContent = 'Searching for matching donors...';
  _showEl(statusEl);

  try {
    const donors = await searchDonors(query);
    _hideEl(statusEl);
    _renderSearchResults(donors, resultsEl);
  } catch (err) {
    _hideEl(statusEl);
    _showEl(errorEl);
    errorEl.textContent = err.message || 'Search failed. Please try again.';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Search';
  }
}

function _renderSearchResults(donors, container) {
  container.innerHTML = '';

  if (!donors || donors.length === 0) {
    container.innerHTML = '<p class="search-status" style="padding:10px 14px;">No matching donor found.</p>';
    _showEl(container);
    return;
  }

  donors.forEach(donor => {
    const item = document.createElement('div');
    item.className = 'search-result-item';

    const info = document.createElement('div');
    info.className = 'search-result-info';

    const name = document.createElement('span');
    name.className   = 'search-result-name';
    name.textContent = `${donor.first_name} ${donor.last_name}`;

    const meta = document.createElement('span');
    meta.className   = 'search-result-meta';
    meta.textContent = [
      donor.blood_type,
      donor.sex,
      donor.birthdate,
    ].filter(Boolean).join(' · ');

    info.appendChild(name);
    info.appendChild(meta);

    const selectBtn = document.createElement('button');
    selectBtn.className   = 'btn-action btn-view';
    selectBtn.textContent = 'Select';
    selectBtn.style.fontSize = '12px';
    selectBtn.addEventListener('click', () => _selectExistingDonor(donor));

    item.appendChild(info);
    item.appendChild(selectBtn);
    container.appendChild(item);
  });

  _showEl(container);
}

// ─── Select Existing Donor ────────────────────────────────────────────────────

async function _selectExistingDonor(donor) {
  _selectedDonor   = donor;
  _registeredDonor = null;

  // Hide search results
  _hideEl(document.getElementById('donor-search-results'));
  const searchInput = document.getElementById('donor-search-input');
  if (searchInput) searchInput.value = '';

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
  _setField('reg-birthdate',   donor.birthdate);
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
  const query = type === 'id'
    ? searchData.id_number
    : `${searchData.first_name} ${searchData.last_name}`;

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

      // For name+birthdate: only warn if birthdate also matches
      let match = null;
      if (type === 'id') {
        match = donors.find(d => d.id_number === searchData.id_number);
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
    const updated = await updateDonorContact(_selectedDonor.donor_id, data);
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
  _hideEl(document.getElementById('reg-name-birthdate-duplicate'));
  _hideEl(document.getElementById('proceed-section'));
  _registeredDonor = null;
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