import {
  getAllDonors,
  searchDonors,
  getDonorById,
  createDonor,
  updateDonor,
  deleteDonor,
} from './donorsApi.js';
import { validateDonorForm, validateSearchQuery } from './donorsValidation.js';
import { showToast }         from '../../components/toast.js';
import { showSkeleton, hideSkeleton } from '../../components/skeleton.js';
import { confirmModal }      from '../../components/modal.js';
import { showError, clearFeedback } from '../../components/feedback.js';
import { ROLES }             from '../../constants/roles.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const SEX_OPTIONS = ['Male', 'Female'];

// ─── State ───────────────────────────────────────────────────────────────────

let _user               = null;   // set via initDonorsPage
let _searchTimer        = null;
let _currentDonors      = [];
let _duplicateCheckTimer = null;  // debounce for inline duplicate detection

// ─── Init ─────────────────────────────────────────────────────────────────────

/**
 * Main entry point — called by entry files.
 * @param {Object} user  — current user from requireAuth()
 */
export async function initDonorsPage(user) {
  _user = user;
  _setupAddButton();
  _setupSearchInput();
  await _loadDonors();
}

// ─── Load & Render Table ──────────────────────────────────────────────────────

async function _loadDonors(query = '') {
  showSkeleton('donors-table-body', 6, 'table', 7);

  try {
    const donors = query
      ? await searchDonors(query)
      : await getAllDonors();

    _currentDonors = donors;
    hideSkeleton('donors-table-body');
    _renderTable(donors);
  } catch (err) {
    hideSkeleton('donors-table-body');
    _renderTableError(err.message);
  }
}

function _renderTable(donors) {
  const tbody = document.getElementById('donors-table-body');
  if (!tbody) return;

  if (!donors || donors.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">
          <div class="empty-state">
            <p class="empty-state-title">No donors found</p>
            <p class="empty-state-body">Register a new donor using the button above, or try a different search.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = '';
  donors.forEach(donor => {
    const tr = document.createElement('tr');

    const name = document.createElement('td');
    name.textContent = `${donor.last_name}, ${donor.first_name}`;

    const bloodType = document.createElement('td');
    bloodType.textContent = donor.blood_type || '—';

    const sex = document.createElement('td');
    sex.textContent = donor.sex || '—';

    const contact = document.createElement('td');
    contact.textContent = donor.contact || '—';

    const email = document.createElement('td');
    email.textContent = donor.email || '—';

    const status = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `status-badge status-${(donor.status || 'active').toLowerCase()}`;
    badge.textContent = donor.status || 'Active';
    status.appendChild(badge);

    const actions = document.createElement('td');
    actions.className = 'actions-cell';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn-action btn-view';
    viewBtn.textContent = 'View';
    viewBtn.addEventListener('click', () => _openViewModal(donor.donor_id));

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-action btn-edit';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => _openEditModal(donor.donor_id));

    actions.appendChild(viewBtn);
    actions.appendChild(editBtn);

    tr.appendChild(name);
    tr.appendChild(bloodType);
    tr.appendChild(sex);
    tr.appendChild(contact);
    tr.appendChild(email);
    tr.appendChild(status);
    tr.appendChild(actions);

    tbody.appendChild(tr);
  });
}

function _renderTableError(message) {
  const tbody = document.getElementById('donors-table-body');
  if (!tbody) return;
  tbody.innerHTML = `
    <tr class="empty-row">
      <td colspan="7">
        <div class="empty-state empty-state-error">
          <p class="empty-state-title">Could not load donors</p>
          <p class="empty-state-body">${_esc(message)} Please try refreshing the page.</p>
        </div>
      </td>
    </tr>`;
}

// ─── Search ───────────────────────────────────────────────────────────────────

function _setupSearchInput() {
  const input = document.getElementById('donor-search');
  if (!input) return;

  input.addEventListener('input', () => {
    clearTimeout(_searchTimer);
    const query = input.value.trim();

    if (!query) {
      _loadDonors();
      return;
    }

    const { valid, message } = validateSearchQuery(query);
    if (!valid) return; // wait for more input

    _searchTimer = setTimeout(() => _loadDonors(query), 350);
  });
}

// ─── Add Donor Button ─────────────────────────────────────────────────────────

function _setupAddButton() {
  const btn = document.getElementById('add-donor-btn');
  if (!btn) return;
  btn.addEventListener('click', () => _openCreateModal());
}

// ─── View Modal ───────────────────────────────────────────────────────────────

async function _openViewModal(donorId) {
  const modal   = document.getElementById('donor-view-modal');
  const content = document.getElementById('donor-view-content');
  if (!modal || !content) return;

  content.innerHTML = '<p class="modal-loading">Loading donor details…</p>';
  modal.classList.add('modal-open');

  try {
    const donor = await getDonorById(donorId);
    _renderViewContent(donor, content);
  } catch (err) {
    content.innerHTML = `<p class="modal-error">${_esc(err.message)}</p>`;
  }

  // Edit button inside view modal
  const editBtn = document.getElementById('view-modal-edit-btn');
  if (editBtn) {
    editBtn.onclick = () => {
      _closeModal('donor-view-modal');
      _openEditModal(donorId);
    };
  }
}

function _renderViewContent(donor, container) {
  container.innerHTML = '';

  const fields = [
    ['Full Name',    `${donor.first_name} ${donor.last_name}`],
    ['Birthdate',    donor.birthdate   || '—'],
    ['Sex',          donor.sex         || '—'],
    ['Blood Type',   donor.blood_type  || '—'],
    ['Email',        donor.email       || '—'],
    ['Contact',      donor.contact     || '—'],
    ['Status',       donor.status      || '—'],
  ];

  const dl = document.createElement('dl');
  dl.className = 'detail-list';

  fields.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    dl.appendChild(dt);
    dl.appendChild(dd);
  });

  container.appendChild(dl);
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

async function _openEditModal(donorId) {
  const modal = document.getElementById('donor-edit-modal');
  if (!modal) return;

  const form = document.getElementById('donor-edit-form');
  if (form) {
    form.reset();
    _clearFormErrors('donor-edit-form');
  }

  // Birthdate max = today — consistent with create form
  const editBirthdate = document.getElementById('edit-birthdate');
  if (editBirthdate) {
    editBirthdate.max = new Date().toISOString().split('T')[0];
  }

  modal.classList.add('modal-open');

  // Show loading state in form
  const submitBtn = document.getElementById('donor-edit-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Loading…';
  }

  try {
    const donor = await getDonorById(donorId);
    _populateEditForm(donor);

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';
    }

    // Wire up submit
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        _submitEditForm(donor.donor_id);
      };
    }

    // Wire up delete (Admin only)
    const deleteBtn = document.getElementById('donor-edit-delete-btn');
    if (deleteBtn) {
      if (_user.role_id === ROLES.ADMIN) {
        deleteBtn.style.display = '';
        deleteBtn.onclick = () => _handleDelete(donor.donor_id, `${donor.first_name} ${donor.last_name}`);
      } else {
        deleteBtn.style.display = 'none';
      }
    }
  } catch (err) {
    showToast('Failed to load donor details. Please try again.', 'error');
    _closeModal('donor-edit-modal');
  }
}

function _populateEditForm(donor) {
  _setField('edit-first-name', donor.first_name);
  _setField('edit-last-name',  donor.last_name);
  _setField('edit-birthdate',  donor.birthdate);
  _setField('edit-sex',        donor.sex);
  _setField('edit-blood-type', donor.blood_type);
  _setField('edit-email',      donor.email);
  _setField('edit-contact',    donor.contact);
}

async function _submitEditForm(donorId) {
  const submitBtn = document.getElementById('donor-edit-submit');
  _clearFormErrors('donor-edit-form');

  const data = {
    first_name:  _getField('edit-first-name'),
    last_name:   _getField('edit-last-name'),
    birthdate:   _getField('edit-birthdate'),
    sex:         _getField('edit-sex'),
    blood_type:  _getField('edit-blood-type') || undefined,
    email:       _getField('edit-email'),
    contact:     _getField('edit-contact')
      ? _getField('edit-contact').replace(/\D/g, '')
      : undefined,
  };

  const { valid, errors } = validateDonorForm(data, { requireAll: true });
  if (!valid) {
    _showFormErrors(errors, {
      first_name: 'edit-first-name-error',
      last_name:  'edit-last-name-error',
      birthdate:  'edit-birthdate-error',
      sex:        'edit-sex-error',
      blood_type: 'edit-blood-type-error',
      email:      'edit-email-error',
      contact:    'edit-contact-error',
    });
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';
  }

  try {
    await updateDonor(donorId, data);
    showToast('Donor updated successfully.', 'success');
    _closeModal('donor-edit-modal');
    await _loadDonors(_getCurrentSearchQuery());
  } catch (err) {
    showToast(err.message || 'Failed to update donor. Please try again.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';
    }
  }
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function _openCreateModal() {
  const modal = document.getElementById('donor-create-modal');
  if (!modal) return;

  // Reset to search step
  _showCreateStep('search');

  const searchInput = document.getElementById('create-search-input');
  if (searchInput) searchInput.value = '';

  const resultsContainer = document.getElementById('create-search-results');
  if (resultsContainer) resultsContainer.innerHTML = '';

  const form = document.getElementById('donor-create-form');
  if (form) {
    form.reset();
    _clearFormErrors('donor-create-form');
  }

  // Clear any leftover duplicate warning
  _clearDuplicateWarning();

  // Birthdate max = today — prevents selecting tomorrow and beyond (bloodsync item 41)
  const birthdateInput = document.getElementById('create-birthdate');
  if (birthdateInput) {
    birthdateInput.max = new Date().toISOString().split('T')[0];
  }

  // Hide Register Donor button until form step is shown
  const submitBtn = document.getElementById('donor-create-submit');
  if (submitBtn) submitBtn.style.display = 'none';

  modal.classList.add('modal-open');

  // Wire up search button + Enter key on search input
  const searchBtn = document.getElementById('create-search-btn');
  if (searchBtn) searchBtn.onclick = () => _handleCreateSearch();
  if (searchInput) {
    searchInput.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); _handleCreateSearch(); }
    };
  }

  // Wire up "Register new donor" button
  const registerBtn = document.getElementById('create-register-new-btn');
  if (registerBtn) {
    registerBtn.onclick = () => _showCreateStep('form');
  }

  // Wire up back button
  const backBtn = document.getElementById('create-back-btn');
  if (backBtn) {
    backBtn.onclick = () => {
      _showCreateStep('search');
      _clearDuplicateWarning();
    };
  }

  // Wire up form submit
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      _submitCreateForm();
    };
  }

  // Inline duplicate detection — fires when last_name + first_name + birthdate
  // are all filled. Matches bloodsync.md items 12-15: detect similar donor
  // while typing. Uses a fresh addEventListener each time modal opens.
  // Clone fields to remove any prior listeners before re-attaching.
  ['create-last-name', 'create-first-name', 'create-birthdate'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    // Remove old listeners by replacing with clone
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener('input', _debouncedDuplicateCheck);
    clone.addEventListener('change', _debouncedDuplicateCheck);
  });
}

// ─── Inline Duplicate Detection ───────────────────────────────────────────────
// bloodsync.md items 12-16: while filling the registration form, if last name +
// first name + birthdate all have values, search for a potential match and show
// an inline warning. Does NOT block the user — they can still proceed.
// Item 16: a second confirmation fires on the Register button click.

function _debouncedDuplicateCheck() {
  clearTimeout(_duplicateCheckTimer);
  _duplicateCheckTimer = setTimeout(_checkForDuplicates, 600);
}

async function _checkForDuplicates() {
  const lastName  = document.getElementById('create-last-name')  ? document.getElementById('create-last-name').value.trim()  : '';
  const firstName = document.getElementById('create-first-name') ? document.getElementById('create-first-name').value.trim() : '';
  const birthdate = document.getElementById('create-birthdate')  ? document.getElementById('create-birthdate').value.trim()  : '';

  // Only run when all three fields have values
  if (!lastName || !firstName || !birthdate) {
    _clearDuplicateWarning();
    return;
  }

  try {
    const query   = `${firstName} ${lastName}`;
    const matches = await searchDonors(query);

    // Strict match: ALL THREE must match (bloodsync item 14 — partial name match alone won't trigger)
    const duplicate = matches.find(d => {
      const nameMatch = d.first_name.toLowerCase() === firstName.toLowerCase() &&
                        d.last_name.toLowerCase()  === lastName.toLowerCase();
      const dobMatch  = d.birthdate && d.birthdate.slice(0, 10) === birthdate;
      return nameMatch && dobMatch;
    });

    if (duplicate) {
      _showDuplicateWarning(duplicate);
    } else {
      _clearDuplicateWarning();
    }
  } catch {
    // Silent fail — duplicate check is best-effort, not a blocker
    _clearDuplicateWarning();
  }
}

function _showDuplicateWarning(donor) {
  let warningEl = document.getElementById('duplicate-warning');
  if (!warningEl) {
    warningEl = document.createElement('div');
    warningEl.id = 'duplicate-warning';
    warningEl.className = 'duplicate-warning';
    // Insert before the form's first field row
    const form = document.getElementById('donor-create-form');
    if (form) form.insertBefore(warningEl, form.firstChild);
  }

  warningEl.innerHTML = '';

  const msg = document.createElement('p');
  msg.className = 'duplicate-warning-text';
  msg.textContent = `A donor named ${donor.first_name} ${donor.last_name} with the same birthdate already exists in the system.`;

  const viewBtn = document.createElement('button');
  viewBtn.type = 'button';
  viewBtn.className = 'btn-action btn-view duplicate-warning-btn';
  viewBtn.textContent = 'View existing donor';
  viewBtn.addEventListener('click', () => {
    _closeModal('donor-create-modal');
    _openViewModal(donor.donor_id);
  });

  warningEl.appendChild(msg);
  warningEl.appendChild(viewBtn);
}

function _clearDuplicateWarning() {
  const el = document.getElementById('duplicate-warning');
  if (el) el.remove();
}


function _showCreateStep(step) {
  const searchStep = document.getElementById('create-step-search');
  const formStep   = document.getElementById('create-step-form');
  if (searchStep) searchStep.style.display = step === 'search' ? '' : 'none';
  if (formStep)   formStep.style.display   = step === 'form'   ? '' : 'none';
}

async function _handleCreateSearch() {
  const input = document.getElementById('create-search-input');
  const resultsEl = document.getElementById('create-search-results');
  const errorEl   = document.getElementById('create-search-error');
  if (!input || !resultsEl) return;

  const query = input.value.trim();
  const { valid, message } = validateSearchQuery(query);
  if (!valid) {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = '';
    }
    return;
  }
  if (errorEl) errorEl.style.display = 'none';

  const searchBtn = document.getElementById('create-search-btn');
  if (searchBtn) {
    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching…';
  }

  resultsEl.innerHTML = '';

  try {
    const donors = await searchDonors(query);

    if (!donors || donors.length === 0) {
      resultsEl.innerHTML = `
        <p class="search-no-results">No donor found matching "<strong>${_esc(query)}</strong>".</p>`;
      const registerBtn = document.getElementById('create-register-new-btn');
      if (registerBtn) registerBtn.style.display = '';
    } else {
      const registerBtn = document.getElementById('create-register-new-btn');
      if (registerBtn) registerBtn.style.display = 'none';

      donors.forEach(donor => {
        const item = document.createElement('div');
        item.className = 'search-result-item';

        const info = document.createElement('div');
        info.className = 'search-result-info';

        const nameEl = document.createElement('span');
        nameEl.className = 'search-result-name';
        nameEl.textContent = `${donor.first_name} ${donor.last_name}`;

        const metaEl = document.createElement('span');
        metaEl.className = 'search-result-meta';
        metaEl.textContent = [donor.blood_type, donor.sex, donor.contact].filter(Boolean).join(' · ');

        info.appendChild(nameEl);
        info.appendChild(metaEl);

        const selectBtn = document.createElement('button');
        selectBtn.className = 'btn-action btn-view';
        selectBtn.textContent = 'Select';
        selectBtn.addEventListener('click', () => {
          _closeModal('donor-create-modal');
          _openViewModal(donor.donor_id);
        });

        item.appendChild(info);
        item.appendChild(selectBtn);
        resultsEl.appendChild(item);
      });
    }
  } catch (err) {
    resultsEl.innerHTML = `<p class="modal-error">${_esc(err.message)}</p>`;
  } finally {
    if (searchBtn) {
      searchBtn.disabled = false;
      searchBtn.textContent = 'Search';
    }
  }
}

async function _submitCreateForm() {
  const submitBtn = document.getElementById('donor-create-submit');
  _clearFormErrors('donor-create-form');

  const data = {
    first_name:  _getField('create-first-name'),
    last_name:   _getField('create-last-name'),
    birthdate:   _getField('create-birthdate'),
    sex:         _getField('create-sex'),
    blood_type:  _getField('create-blood-type') || undefined,
    email:       _getField('create-email'),
    contact:     _getField('create-contact')
      ? _getField('create-contact').replace(/\D/g, '')
      : undefined,
  };

  const { valid, errors } = validateDonorForm(data, { requireAll: true });
  if (!valid) {
    _showFormErrors(errors, {
      first_name: 'create-first-name-error',
      last_name:  'create-last-name-error',
      birthdate:  'create-birthdate-error',
      sex:        'create-sex-error',
      blood_type: 'create-blood-type-error',
      email:      'create-email-error',
      contact:    'create-contact-error',
    });
    return;
  }

  // bloodsync item 16 — double-check confirmation before registering.
  // If a duplicate warning is currently visible, require explicit confirmation.
  const hasDuplicateWarning = !!document.getElementById('duplicate-warning');
  if (hasDuplicateWarning) {
    const confirmed = await confirmModal({
      title:        'Possible Duplicate Detected',
      message:      'A donor with the same name and birthdate was found. Are you sure this is a different person and you want to register them as a new donor?',
      confirmLabel: 'Yes, Register as New',
      danger:       true,
    });
    if (!confirmed) return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering…';
  }

  try {
    await createDonor(data);
    showToast('Donor registered successfully.', 'success');
    _closeModal('donor-create-modal');
    await _loadDonors();
  } catch (err) {
    if (err.status === 409) {
      showError(
        'donor-create-form-error',
        'This donor is already registered. Please search for them and select their existing record.'
      );
    } else {
      showError('donor-create-form-error', err.message || 'Failed to register donor. Please try again.');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Register Donor';
    }
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

async function _handleDelete(donorId, donorName) {
  const confirmed = await confirmModal({
    title:   'Delete Donor',
    message: `Are you sure you want to permanently delete ${donorName}? This cannot be undone.`,
    confirmLabel: 'Delete',
    danger:  true,
  });
  if (!confirmed) return;

  try {
    await deleteDonor(donorId);
    showToast(`${donorName} has been deleted.`, 'success');
    _closeModal('donor-edit-modal');
    await _loadDonors(_getCurrentSearchQuery());
  } catch (err) {
    showToast(err.message || 'Failed to delete donor. Please try again.', 'error');
  }
}

// ─── Modal Close ──────────────────────────────────────────────────────────────

/**
 * Call this from entry files to wire up all modal close buttons.
 */
export function initModalCloseButtons() {
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-close-modal');
      _closeModal(targetId);
    });
  });

  // Close on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        _closeModal(overlay.id);
      }
    });
  });
}

function _closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('modal-open');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _getField(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function _setField(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

function _getCurrentSearchQuery() {
  const input = document.getElementById('donor-search');
  return input ? input.value.trim() : '';
}

function _showFormErrors(errors, idMap) {
  Object.entries(errors).forEach(([field, message]) => {
    const errorId = idMap[field];
    if (!errorId) return;
    const el = document.getElementById(errorId);
    if (el) {
      el.textContent = message;
      el.style.display = '';
    }
  });
}

function _clearFormErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('.field-error').forEach(el => {
    el.textContent = '';
    el.style.display = 'none';
  });
  const formError = form.querySelector('.form-error');
  if (formError) {
    formError.textContent = '';
    formError.style.display = 'none';
  }
}

/** Escapes a string for safe use in textContent contexts via DOM. */
function _esc(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}