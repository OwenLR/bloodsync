import {
  getAllDonors,
  searchDonors,
  getDonorById,
  updateDonor,
  deleteDonor,
} from './donorsApi.js';
import { validateDonorForm, validateSearchQuery } from './donorsValidation.js';
import { showToast }         from '../../components/toast.js';
import { showSkeleton, hideSkeleton } from '../../components/skeleton.js';
import { confirmModal }      from '../../components/modal.js';
import { ROLES }             from '../../constants/roles.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const SEX_OPTIONS = ['Male', 'Female'];

/**
 * Format an ISO date string or YYYY-MM-DD to a plain YYYY-MM-DD display/
 * input string. API returns ISO timestamps like "1995-06-08T16:00:00.000Z";
 * <input type="date"> and the view modal both need just the date part.
 */
function _formatBirthdate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

// ─── State ───────────────────────────────────────────────────────────────────

let _user               = null;   // set via initDonorsPage
let _searchTimer        = null;
let _currentDonors      = [];

// ─── Init ─────────────────────────────────────────────────────────────────────

/**
 * Main entry point — called by entry files.
 * @param {Object} user  — current user from requireAuth()
 */
export async function initDonorsPage(user) {
  _user = user;
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
        <td colspan="3">
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
    tr.className = 'donor-row';
    tr.tabIndex = 0;
    tr.setAttribute('role', 'button');
    tr.setAttribute('aria-label', `View details for ${donor.first_name} ${donor.last_name}`);

    const name = document.createElement('td');
    name.className = 'donor-name-cell';

    const dot = document.createElement('span');
    const statusKey = (donor.status || 'active').toLowerCase();
    dot.className = `status-dot status-dot-${statusKey}`;
    dot.title = donor.status || 'Active';

    const nameText = document.createElement('span');
    const firstInitial = donor.first_name ? `${donor.first_name.charAt(0).toUpperCase()}.` : '';
    nameText.textContent = `${donor.last_name}, ${firstInitial}`;

    name.appendChild(dot);
    name.appendChild(nameText);

    const email = document.createElement('td');
    email.className = 'donor-email-cell';
    email.textContent = donor.email || '-';

    const bloodType = document.createElement('td');
    bloodType.className = 'donor-bloodtype-cell';
    bloodType.textContent = donor.blood_type || '-';

    tr.appendChild(name);
    tr.appendChild(email);
    tr.appendChild(bloodType);

    const openDetails = () => _openViewModal(donor.donor_id);
    tr.addEventListener('click', openDetails);
    tr.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDetails();
      }
    });

    tbody.appendChild(tr);
  });
}

function _renderTableError(message) {
  const tbody = document.getElementById('donors-table-body');
  if (!tbody) return;
  tbody.innerHTML = `
    <tr class="empty-row">
      <td colspan="3">
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
    ['Birthdate',    _formatBirthdate(donor.birthdate) || '-'],
    ['Sex',          donor.sex         || '-'],
    ['Blood Type',   donor.blood_type  || '-'],
    ['Email',        donor.email       || '-'],
    ['Contact',      donor.contact     || '-'],
    ['Status',       donor.status      || '-'],
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
  _setField('edit-birthdate',  _formatBirthdate(donor.birthdate));
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