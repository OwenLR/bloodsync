import { requireAuth }        from '../../core/guards/authGuard.js';
import { requireRole }        from '../../core/guards/roleGuard.js';
import { renderNavbar }       from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }       from '../../layouts/sidebar.js';
import { revealAppShell }     from '../../layouts/appShell.js';
import { refreshBadge } from '../../features/notifications/notificationsUI.js';
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
  getAllInterviews,
  getAllScreenings,
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

/**
 * Map of donor_id → deferral info for donors deferred in this drive.
 * { step: 'interview'|'screening', date: 'YYYY-MM-DD' }
 * Built at page load from interview + screening records.
 * Used to: (a) show badge in dropdown, (b) block selection.
 */
let _deferredDonorMap = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format an ISO date string or YYYY-MM-DD to YYYY-MM-DD display string.
 * Handles both "1990-05-15" and "1990-05-15T00:00:00.000Z".
 */
function _formatBirthdate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  _user = await requireAuth();
  if (!_user) return;

  if (!requireRole(_user, [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST, ROLES.PRC_STAFF])) return;

  renderNavbar(_user, 0);
  clearSidebar();

  // FIX: branch sidebar by role — admin/staff get management, field roles get workflow
  const isFieldRole = _user.role_id === ROLES.VOLUNTEER || _user.role_id === ROLES.PHLEBOTOMIST;
  if (isFieldRole) {
    renderSidebar(getSidebarItems(_user.role_id, 'general'),  'General');
    renderSidebar(getSidebarItems(_user.role_id, 'workflow'), 'Workflow');
    renderSidebar(getSidebarItems(_user.role_id, 'drive'),    'My Drive');
  } else {
    renderSidebar(getSidebarItems(_user.role_id, 'general'),    'General');
    renderSidebar(getSidebarItems(_user.role_id, 'management'), 'Management');
  }

  revealAppShell();

  refreshBadge(); // non-blocking, sets navbar badge to the real unread count

  // Set birthdate max to today (no future dates, age validation in validation.js)
  const bdInput = document.getElementById('reg-birthdate');
  if (bdInput) bdInput.max = new Date().toISOString().slice(0, 10);

  await _initSearchDropdown();
  _setupDuplicateDetection();
  _setupRegistrationForm();
  _setupContactUpdateForm();
  _setupClearSelection();
  _setupResetBtn();
  _setupRegisterAnotherBtn();
}

// ─── Search Dropdown (existing donor lookup) ──────────────────────────────────
// Loads all donors on page load and filters client-side.
// On select: auto-fills form fields (read-only) and shows contact update section.

let _searchDropdown = null;

async function _initSearchDropdown() {
  const errorEl = document.getElementById('donor-search-error');

  try {
    // Load donors, interviews, and screenings in parallel.
    // Interviews + screenings are used to build the deferred donor map.
    // For field roles, backend scopes interviews/screenings to their active drive.
    // For Admin/Staff (walk-in), all records are returned — still useful for
    // flagging donors who were deferred in any prior context.
    const [donors, allInterviews, allScreenings] = await Promise.all([
      _loadAllDonors(),
      getAllInterviews().catch(() => []),
      getAllScreenings().catch(() => []),
    ]);

    // Build deferred donor map from interview and screening results
    _deferredDonorMap = new Map();

    allInterviews.forEach(iv => {
      if (_isDeferredResult(iv.interview_result)) {
        const dateStr = _formatBirthdate(iv.deferred_at || iv.created_at || '');
        _deferredDonorMap.set(iv.donor_id, { step: 'interview', date: dateStr });
      }
    });

    allScreenings.forEach(s => {
      if (s.screening_result === 'Deferred') {
        // Screening deferral overrides interview deferral in the map if both exist
        const dateStr = _formatBirthdate(s.deferred_at || s.created_at || '');
        _deferredDonorMap.set(s.donor_id, { step: 'screening', date: dateStr });
      }
    });

    _searchDropdown = initSearchableDropdown({
      inputId:      'donor-search-input',
      listId:       'donor-search-list',
      items:         donors,
      displayFn:    (d) => `${d.first_name} ${d.last_name}`,
      // Issue 3: format birthdate. Issue 5: append deferred badge if applicable.
      subDisplayFn: (d) => {
        const parts = [d.blood_type, d.sex, _formatBirthdate(d.birthdate)].filter(Boolean);
        const deferral = _deferredDonorMap.get(d.donor_id);
        if (deferral) {
          parts.push(`⚠ Deferred at ${deferral.step}${deferral.date ? ' · ' + deferral.date : ''}`);
        }
        return parts.join(' · ');
      },
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

/**
 * Determine if an interview result string means the donor was deferred.
 */
function _isDeferredResult(result) {
  if (!result) return false;
  const normalized = String(result).toLowerCase();
  return normalized === 'deferred' || normalized === 'failed';
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

  if (_searchDropdown) _searchDropdown.clear();

  // Issue 5: if this donor is deferred in this drive, block and show notice
  const deferral = _deferredDonorMap.get(donor.donor_id);
  if (deferral) {
    _hideEl(document.getElementById('selected-donor-banner'));
    _hideEl(document.getElementById('contact-update-section'));
    _hideEl(document.getElementById('proceed-section'));
    _hideEl(document.getElementById('reg-submit-btn'));
    _hideEl(document.getElementById('reg-reset-btn'));

    // Show deferred block notice
    const notice = document.getElementById('donor-deferred-notice');
    if (notice) {
      const stepLabel = deferral.step === 'interview' ? 'the donor interview' : 'donor screening';
      notice.textContent =
        `This donor was deferred during ${stepLabel}` +
        (deferral.date ? ` on ${deferral.date}` : '') +
        `. They cannot participate in this blood drive. Please search for a different donor.`;
      _showEl(notice);
    }
    _selectedDonor = null;
    return;
  }

  // Not deferred — clear any previous deferred notice
  _hideEl(document.getElementById('donor-deferred-notice'));

  const banner = document.getElementById('selected-donor-banner');
  const nameEl = document.getElementById('selected-donor-name');
  const metaEl = document.getElementById('selected-donor-meta');
  if (banner && nameEl && metaEl) {
    nameEl.textContent = `${donor.first_name} ${donor.last_name}`;
    metaEl.textContent = [donor.blood_type, donor.sex, donor.contact, donor.email]
      .filter(Boolean).join(' · ');
    _showEl(banner);
  }

  _populateForm(donor);
  _lockFormFields(true);

  const title = document.getElementById('form-card-title');
  if (title) title.textContent = 'Existing Donor Details';

  _hideEl(document.getElementById('reg-submit-btn'));
  _hideEl(document.getElementById('reg-reset-btn'));
  _showEl(document.getElementById('contact-update-section'));

  const emailEl   = document.getElementById('update-email');
  const contactEl = document.getElementById('update-contact');
  if (emailEl)   emailEl.value   = donor.email   || '';
  if (contactEl) contactEl.value = donor.contact || '';

  if (!donor.email) {
    showToast(
      'This donor has no email on record. Please add one before proceeding to donation.',
      'warning'
    );
  }

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
  // FIX Issue 3: slice to YYYY-MM-DD for date input compatibility
  _setField('reg-birthdate',   _formatBirthdate(donor.birthdate));
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
  _hideEl(document.getElementById('donor-deferred-notice'));

  const title = document.getElementById('form-card-title');
  if (title) title.textContent = 'Donor Information';

  _showEl(document.getElementById('reg-submit-btn'));
  _showEl(document.getElementById('reg-reset-btn'));

  _resetForm();
  _lockFormFields(false);
}

// ─── Duplicate Detection (blur) ───────────────────────────────────────────────

function _setupDuplicateDetection() {
  const idInput = document.getElementById('reg-id-number');
  if (idInput) {
    idInput.addEventListener('blur', () => {
      if (_selectedDonor) return;
      const val = idInput.value.trim();
      if (!val) return;
      _checkDuplicate('id', { id_number: val }, 'reg-id-duplicate');
    });
  }

  const emailInput = document.getElementById('reg-email');
  if (emailInput) {
    emailInput.addEventListener('blur', () => {
      if (_selectedDonor) return;
      const email = emailInput.value.trim();
      if (!email) return;
      _checkDuplicate('email', { email }, 'reg-email-duplicate');
    });
  }

  const contactInput = document.getElementById('reg-contact');
  if (contactInput) {
    contactInput.addEventListener('blur', () => {
      if (_selectedDonor) return;
      const contact = contactInput.value.trim();
      if (!contact) return;
      _checkDuplicate('contact', { contact }, 'reg-contact-duplicate');
    });
  }

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

  _hideEl(warningEl);

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
        // FIX Issue 1: normalize both sides to YYYY-MM-DD before comparing
        // API returns ISO strings like "1990-05-15T00:00:00.000Z"; form input gives "1990-05-15"
        const inputDate = searchData.birthdate.slice(0, 10);
        match = donors.find(d =>
          d.first_name.toLowerCase() === searchData.first_name.toLowerCase() &&
          d.last_name.toLowerCase()  === searchData.last_name.toLowerCase()  &&
          _formatBirthdate(d.birthdate) === inputDate
        );
      }

      if (!match) return;

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
  if (_selectedDonor) return;

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

    if (submitBtn) _hideEl(submitBtn);
    _hideEl(document.getElementById('reg-reset-btn'));
  } catch (err) {
    const formError = document.getElementById('reg-form-error');
    if (err.status === 409) {
      if (formError) {
        formError.textContent = 'A donor with this information is already registered. Search for them above and select their existing record.';
        _showEl(formError);
      }
    } else {
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
    const isFieldRole = _user.role_id === ROLES.VOLUNTEER || _user.role_id === ROLES.PHLEBOTOMIST;
    const updated = isFieldRole
      ? await updateDonorContact(_selectedDonor.donor_id, data)
      : await updateDonorFull(_selectedDonor.donor_id, data);
    _selectedDonor = updated;
    showToast('Contact information updated.', 'success');

    const metaEl = document.getElementById('selected-donor-meta');
    if (metaEl) {
      metaEl.textContent = [updated.blood_type, updated.sex, updated.contact, updated.email]
        .filter(Boolean).join(' · ');
    }

    _setField('reg-email',   updated.email);
    _setField('reg-contact', updated.contact);

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

  _showEl(section);

  try {
    sessionStorage.setItem('field_donor_id', donor.donor_id);
    sessionStorage.setItem('field_donor_name', `${donor.first_name} ${donor.last_name}`);
  } catch (_e) { /* sessionStorage unavailable */ }
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
    // Re-enable register and reset buttons in case they were hidden after success
    _showEl(document.getElementById('reg-submit-btn'));
    _showEl(document.getElementById('reg-reset-btn'));
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