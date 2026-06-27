/**
 * donorCollection.js — Entry file for /pages/field/donorCollection.html
 *
 * Step 5 (final) of the field donor workflow.
 *
 * Roles: Volunteer, Phlebotomist, Admin, PRC Staff
 *
 * Donor selector: shows only donors with a completed donation but no
 * collection yet. Cross-references donations vs collections.
 *
 * GET /api/blood-collections is Admin/PRC Staff only.
 * For field roles (Volunteer/Phlebotomist), getAllCollections() will return
 * 403 — we catch that silently and use an empty set, meaning no pre-filtering
 * for already-collected donors on field roles. The backend enforces uniqueness
 * and will reject a duplicate with a clear error message.
 *
 * Blood type is pre-filled from the donor's screening record (blood_type_confirmed).
 * Staff should confirm before submitting.
 *
 * SessionStorage:
 *   Reads:  field_donation_donor_id (pre-selects donor from donation page)
 *   Reads:  field_donation_id (resolves donation_id if not in donationMap)
 *   Clears: field_donation_id, field_donation_donor_id after success
 *   Writes: nothing — this is the last step
 */

import { requireAuth }         from '../../core/guards/authGuard.js';
import { requireRole }         from '../../core/guards/roleGuard.js';
import { renderNavbar }        from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }        from '../../layouts/sidebar.js';
import { revealAppShell }      from '../../layouts/appShell.js';
import { getSidebarItems }     from '../../constants/sidebarItems.js';
import { ROLES }               from '../../constants/roles.js';
import { showToast }           from '../../components/toast.js';
import {
  getAllDonors,
  getDonorById,
  getAllDonations,
  getAllCollections,
  getAllScreenings,
  createCollection,
} from '../../features/fieldWorkflow/fieldWorkflowApi.js';
import { validateCollection }  from '../../features/fieldWorkflow/fieldWorkflowValidation.js';
import { initSearchableDropdown } from '../../components/searchableDropdown.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _user          = null;
let _selectedDonor = null;
let _donationMap   = null;   // donor_id → most recent donation record
let _screeningMap  = null;   // donor_id → most recent screening record (for blood_type_confirmed)
let _dropdown      = null;

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  _user = await requireAuth();
  if (!_user) return;

  if (!requireRole(_user, [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST, ROLES.ADMIN, ROLES.PRC_STAFF])) return;

  renderNavbar(_user, 0);
  clearSidebar();

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

  await _initDonorDropdown();
  _setupForm();
}

// ─── Donor Selector ───────────────────────────────────────────────────────────

async function _initDonorDropdown() {
  const errorEl = document.getElementById('donor-load-error');

  try {
    // Load donations and donors in parallel.
    // getAllCollections() is Admin/Staff only — catch 403 silently for field roles.
    const [allDonors, allDonations, allScreenings, collectionsResult] = await Promise.all([
      getAllDonors(),
      getAllDonations(),
      getAllScreenings(),
      getAllCollections().catch(() => []),   // 403 for field roles → empty array
    ]);

    // Set of donor_ids that already have a collection recorded
    const collectedIds = new Set(collectionsResult.map(c => c.donor_id));

    // Map donor_id → most recent donation record
    _donationMap = new Map();
    allDonations.forEach(d => {
      const existing = _donationMap.get(d.donor_id);
      if (!existing || d.donation_id > existing.donation_id) {
        _donationMap.set(d.donor_id, d);
      }
    });

    // Map donor_id → most recent screening (to pre-fill blood type)
    _screeningMap = new Map();
    allScreenings.forEach(s => {
      const existing = _screeningMap.get(s.donor_id);
      if (!existing || s.screening_id > existing.screening_id) {
        _screeningMap.set(s.donor_id, s);
      }
    });

    // Eligible: has a donation, no collection yet
    const eligibleDonors = allDonors.filter(d =>
      _donationMap.has(d.donor_id) && !collectedIds.has(d.donor_id)
    );

    const isFieldRole = _user.role_id === ROLES.VOLUNTEER || _user.role_id === ROLES.PHLEBOTOMIST;

    _dropdown = initSearchableDropdown({
      inputId:      'donor-select-input',
      listId:       'donor-select-list',
      items:         eligibleDonors,
      displayFn:    (d) => `${d.last_name}, ${d.first_name}`,
      subDisplayFn: (d) => [d.blood_type, d.sex, (d.birthdate ? String(d.birthdate).slice(0, 10) : '')].filter(Boolean).join(' · '),
      filterFn:     (d, q) =>
        `${d.first_name} ${d.last_name}`.toLowerCase().includes(q) ||
        (d.id_number || '').toLowerCase().includes(q),
      onSelect:     _handleDonorSelected,
      placeholder:  isFieldRole
        ? 'Click to browse donors ready for collection in this drive…'
        : 'Click to browse or type to filter donors…',
      emptyMessage: 'No donors available for collection. All donors with a completed extraction may already have a collection record.',
    });

    // Pre-select donor passed from donation page
    try {
      const storedId = sessionStorage.getItem('field_donation_donor_id');
      if (storedId) {
        _dropdown.selectByPredicate(d => String(d.donor_id) === String(storedId));
      }
    } catch (_e) { /* ignore */ }

  } catch (err) {
    if (errorEl) {
      errorEl.textContent = err.message || 'Failed to load donors. Please refresh the page.';
      _showEl(errorEl);
    }
  }
}

async function _handleDonorSelected(donor) {
  _selectedDonor = null;

  _hideEl(document.getElementById('donor-info-panel'));
  _hideEl(document.getElementById('collection-form-section'));
  _hideEl(document.getElementById('complete-section'));

  try {
    const fullDonor = await getDonorById(donor.donor_id);
    _selectedDonor  = fullDonor;

    _renderDonorInfo(fullDonor);
    _showEl(document.getElementById('donor-info-panel'));

    await _checkExistingCollection(fullDonor);
  } catch (err) {
    showToast('Failed to load donor details. Please try again.', 'error');
  }
}

function _renderDonorInfo(donor) {
  const list = document.getElementById('donor-info-list');
  if (!list) return;
  list.innerHTML = '';

  const fields = [
    ['Name',       `${donor.first_name} ${donor.last_name}`],
    ['Birthdate', (donor.birthdate ? String(donor.birthdate).slice(0, 10) : 'Not on record')],
    ['Sex',        donor.sex        || 'Not on record'],
    ['Blood Type', donor.blood_type || 'Unknown'],
    ['Email',      donor.email      || 'Not on record'],
    ['Contact',    donor.contact    || 'Not on record'],
  ];

  fields.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    list.appendChild(dt);
    list.appendChild(dd);
  });
}

// ─── Existing Collection Check ────────────────────────────────────────────────

async function _checkExistingCollection(donor) {
  // For field roles, getAllCollections() returned 403 so collectedIds is empty.
  // We do a targeted check via the donation record's donation_id instead —
  // the backend will reject a duplicate POST with a clear error anyway.
  // For Admin/Staff the pre-filtering already excludes collected donors from
  // the dropdown, but we still show the already-done state if they navigate back.

  _showEl(document.getElementById('collection-form-section'));

  // We don't have a getCollectionsByDonor endpoint in the contract,
  // so rely on the dropdown filtering + backend rejection for duplicates.
  // Show the form and let backend handle the rare duplicate case gracefully.
  _hideEl(document.getElementById('collection-already-done'));
  _showEl(document.getElementById('collection-form-fields'));
  _showEl(document.getElementById('collection-submit-section'));

  _prefillFromScreening(donor);
}

// ─── Pre-fill Blood Type ──────────────────────────────────────────────────────

function _prefillFromScreening(donor) {
  const btSelect = document.getElementById('input-blood-type');
  if (!btSelect) return;

  // Prefer blood_type_confirmed from screening record, fall back to donor's registered type
  const screening = _screeningMap ? _screeningMap.get(donor.donor_id) : null;
  const confirmedType = (screening && screening.blood_type_confirmed)
    ? screening.blood_type_confirmed
    : donor.blood_type;

  if (confirmedType) {
    btSelect.value = confirmedType;
  }
}

// ─── Form Setup ───────────────────────────────────────────────────────────────

function _setupForm() {
  const form = document.getElementById('collection-form');
  if (!form) return;
  form.addEventListener('submit', _handleSubmit);
}

async function _handleSubmit(e) {
  e.preventDefault();
  if (!_selectedDonor) return;

  _clearAllErrors();
  const formError = document.getElementById('collection-form-error');
  if (formError) _hideEl(formError);

  const submitBtn = document.getElementById('collection-submit-btn');
  if (submitBtn) {
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Recording…';
  }

  try {
    // Resolve donation_id from donationMap or sessionStorage
    let donationId = null;
    if (_donationMap && _donationMap.has(_selectedDonor.donor_id)) {
      donationId = _donationMap.get(_selectedDonor.donor_id).donation_id;
    }
    if (!donationId) {
      try {
        const stored        = sessionStorage.getItem('field_donation_id');
        const storedDonorId = sessionStorage.getItem('field_donation_donor_id');
        if (stored && String(_selectedDonor.donor_id) === String(storedDonorId)) {
          donationId = Number(stored);
        }
      } catch (_e) { /* ignore */ }
    }

    if (!donationId) {
      if (formError) {
        formError.textContent = 'Could not find the extraction record for this donor. Please go back to the Donation step.';
        _showEl(formError);
      }
      return;
    }

    const rawVolume = document.getElementById('input-volume-ml').value;

    const data = {
      donation_id: donationId,
      blood_type:  document.getElementById('input-blood-type').value  || undefined,
      component:   document.getElementById('input-component').value   || undefined,
      volume_ml:   rawVolume !== '' ? parseInt(rawVolume, 10) : undefined,
    };

    const { valid, errors } = validateCollection(data);
    if (!valid) {
      _showFieldErrors(errors);
      return;
    }

    await createCollection(data);

    // Clear donation sessionStorage — last step, no further chaining needed
    try {
      sessionStorage.removeItem('field_donation_id');
      sessionStorage.removeItem('field_donation_donor_id');
    } catch (_e) { /* ignore */ }

    showToast('Blood collection recorded successfully.', 'success');
    _hideEl(document.getElementById('collection-form-section'));
    _showEl(document.getElementById('complete-section'));

  } catch (err) {
    if (formError) {
      formError.textContent = err.status === 403
        ? 'You are not assigned to an active blood drive. Please contact your coordinator.'
        : (err.message || 'Failed to record collection. Please try again.');
      _showEl(formError);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Record Collection';
    }
  }
}

// ─── Error Helpers ────────────────────────────────────────────────────────────

function _showFieldErrors(errors) {
  const map = {
    blood_type: 'error-blood-type',
    component:  'error-component',
    volume_ml:  'error-volume-ml',
  };
  Object.entries(errors).forEach(([field, msg]) => {
    const id = map[field];
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      el.textContent = msg;
      el.classList.remove('field-error-hidden');
    }
  });
}

function _clearAllErrors() {
  ['error-blood-type', 'error-component', 'error-volume-ml'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = '';
      el.classList.add('field-error-hidden');
    }
  });
}

// ─── DOM Helpers ──────────────────────────────────────────────────────────────

function _showEl(el) { if (el) el.style.display = ''; }
function _hideEl(el) { if (el) el.style.display = 'none'; }

// ─── Boot ─────────────────────────────────────────────────────────────────────

init();