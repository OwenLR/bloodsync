/**
 * donorDonation.js — Entry file for /pages/field/donorDonation.html
 *
 * Combined Step 4 + 5 of the field donor workflow.
 * Records blood extraction (donation) AND blood collection in one page.
 *
 * Roles: Volunteer, Phlebotomist, Admin, PRC Staff
 *
 * Flow:
 *   1. Select donor (Eligible screening, no donation yet)
 *   2. Fill extraction details — time, phlebotomist who performed it
 *   3. Submit extraction → POST /api/donations
 *   4. Collection form appears immediately below
 *      - Component defaults to "Whole Blood"
 *      - Volume defaults to 450 mL (editable)
 *      - Blood type pre-filled from screening record
 *   5. Submit collection → POST /api/blood-collections
 *
 * Phlebotomist dropdown:
 *   - If active drive found: GET /api/blood-drives/:id/participants filtered to role_id 6
 *   - If no active drive (Admin/Staff walk-in): GET /api/volunteers/available?role=6
 *
 * SessionStorage:
 *   Reads:  field_screening_donor_id (pre-selects donor from screening page)
 *   Reads:  field_screening_id (resolves screening_id if not in screeningMap)
 *   Writes: nothing — this is the last step (collection absorbed here)
 *   Clears: field_screening_id, field_screening_donor_id after donation success
 */

import { requireAuth }         from '../../core/guards/authGuard.js';
import { requireRole }         from '../../core/guards/roleGuard.js';
import { renderNavbar }        from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }        from '../../layouts/sidebar.js';
import { revealAppShell }      from '../../layouts/appShell.js';
import { refreshBadge } from '../../features/notifications/notificationsUI.js';
import { getSidebarItems }     from '../../constants/sidebarItems.js';
import { ROLES }               from '../../constants/roles.js';
import { showToast }           from '../../components/toast.js';
import {
  getAllDonors,
  getDonorById,
  getAllScreenings,
  getAllDonations,
  getAllCollections,
  getDonationsByDonor,
  createDonation,
  createCollection,
  getMyActiveDrive,
  getDrivePhlebotomists,
  getAvailablePhlebotomists,
} from '../../features/fieldWorkflow/fieldWorkflowApi.js';
import {
  validateDonation,
  validateCollection,
} from '../../features/fieldWorkflow/fieldWorkflowValidation.js';
import { initSearchableDropdown } from '../../components/searchableDropdown.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _user             = null;
let _selectedDonor    = null;
let _screeningMap     = null;
let _donationMap      = null;
let _activeDrive      = null;
let _phlebotomists    = [];
let _dropdown         = null;
let _phlebDropdown    = null;   // searchableDropdown instance for phlebotomist
let _createdDonation  = null;

const QNS_THRESHOLD = 15;

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  _user = await requireAuth();
  if (!_user) return;

  if (!requireRole(_user, [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST, ROLES.PRC_STAFF])) return;

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

  refreshBadge(); // non-blocking, sets navbar badge to the real unread count

  // Load active drive and phlebotomists in parallel with donor data
  await Promise.all([
    _initDonorDropdown(),
    _loadPhlebotomists(),
  ]);

  _setupDonationForm();
  _setupCollectionForm();
}

// ─── Phlebotomist Searchable Dropdown ────────────────────────────────────────

async function _loadPhlebotomists() {
  const hint   = document.getElementById('phlebotomist-hint');
  const isFieldRole = _user.role_id === ROLES.VOLUNTEER || _user.role_id === ROLES.PHLEBOTOMIST;

  try {
    if (isFieldRole) {
      // Field roles: must have an active drive — load only assigned phlebotomists
      _activeDrive = await getMyActiveDrive();
      if (_activeDrive) {
        _phlebotomists = await getDrivePhlebotomists(_activeDrive.drive_id);
      } else {
        _phlebotomists = [];
      }
      if (hint) hint.textContent = _phlebotomists.length
        ? 'Phlebotomists assigned to this blood drive.'
        : 'No phlebotomists found for this drive. Ensure phlebotomists are assigned.';
    } else {
      // Admin/Staff walk-in: show all active phlebotomists — no drive required
      _phlebotomists = await getAvailablePhlebotomists();
      if (hint) hint.textContent = 'All active phlebotomists (walk-in session — no drive required).';
    }
  } catch (_err) {
    _phlebotomists = [];
    if (hint) hint.textContent = 'Could not load phlebotomist list. Refresh to try again.';
  }

  // Pre-select self if logged-in user is a Phlebotomist and is in the list
  const selfId = (_user.role_id === ROLES.PHLEBOTOMIST)
    ? _user.user_id
    : null;

  _phlebDropdown = initSearchableDropdown({
    inputId:      'phlebotomist-search-input',
    listId:       'phlebotomist-search-list',
    items:         _phlebotomists,
    displayFn:    (p) => `${p.first_name} ${p.last_name}`,
    subDisplayFn: (p) => p.role_name || 'Phlebotomist',
    filterFn:     (p, q) =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q),
    onSelect:     (p) => {
      // Write selected user_id to hidden input — read on form submit
      const hidden = document.getElementById('input-phlebotomist');
      if (hidden) hidden.value = p.user_id;
      // Clear any error
      const errEl = document.getElementById('error-phlebotomist');
      if (errEl) errEl.classList.add('field-error-hidden');
    },
    placeholder:  isFieldRole
      ? 'Click to browse phlebotomists in this drive…'
      : 'Click to browse or type to filter phlebotomists…',
    emptyMessage: isFieldRole
      ? 'No phlebotomists assigned to this drive.'
      : 'No active phlebotomists found.',
  });

  // Auto-select self if Phlebotomist
  if (selfId) {
    _phlebDropdown.selectByPredicate(p => p.user_id === selfId);
  }
}

// ─── Donor Selector ───────────────────────────────────────────────────────────

async function _initDonorDropdown() {
  const errorEl = document.getElementById('donor-load-error');

  try {
    const [allDonors, allScreenings, allDonations] = await Promise.all([
      getAllDonors(),
      getAllScreenings(),
      getAllDonations(),
    ]);

    const donatedIds = new Set(allDonations.map(d => d.donor_id));

    // Map donor_id → most recent Eligible screening
    _screeningMap = new Map();
    allScreenings.forEach(s => {
      if (s.screening_result !== 'Eligible') return;
      const existing = _screeningMap.get(s.donor_id);
      if (!existing || s.screening_id > existing.screening_id) {
        _screeningMap.set(s.donor_id, s);
      }
    });

    const eligibleDonors = allDonors.filter(d =>
      _screeningMap.has(d.donor_id) && !donatedIds.has(d.donor_id)
    );

    const isFieldRole = _user.role_id === ROLES.VOLUNTEER || _user.role_id === ROLES.PHLEBOTOMIST;

    _dropdown = initSearchableDropdown({
      inputId:      'donor-select-input',
      listId:       'donor-select-list',
      items:         eligibleDonors,
      displayFn:    (d) => `${d.last_name}, ${d.first_name}`,
      subDisplayFn: (d) => [
        d.blood_type,
        d.sex,
        d.birthdate ? String(d.birthdate).slice(0, 10) : '',
      ].filter(Boolean).join(' · '),
      filterFn:     (d, q) =>
        `${d.first_name} ${d.last_name}`.toLowerCase().includes(q) ||
        (d.id_number || '').toLowerCase().includes(q),
      onSelect:     _handleDonorSelected,
      placeholder:  isFieldRole
        ? 'Click to browse eligible donors in this drive…'
        : 'Click to browse or type to filter donors…',
      emptyMessage: 'No donors ready for donation. All eligible donors may already have a donation recorded, or no donors have passed screening yet.',
    });

    // Pre-select donor passed from screening page
    try {
      const storedId = sessionStorage.getItem('field_screening_donor_id');
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
  _selectedDonor   = null;
  _createdDonation = null;

  _hideEl(document.getElementById('donor-info-panel'));
  _hideEl(document.getElementById('email-missing-warning'));
  _hideEl(document.getElementById('donation-form-section'));
  _hideEl(document.getElementById('collection-form-section'));
  _hideEl(document.getElementById('complete-section'));

  try {
    const fullDonor = await getDonorById(donor.donor_id);
    _selectedDonor  = fullDonor;

    _renderDonorInfo(fullDonor);
    _showEl(document.getElementById('donor-info-panel'));

    if (!fullDonor.email || !fullDonor.email.trim()) {
      _showEl(document.getElementById('email-missing-warning'));
      return;
    }

    await _checkExistingDonation(fullDonor);
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
    ['Birthdate',  donor.birthdate ? String(donor.birthdate).slice(0, 10) : 'Not on record'],
    ['Sex',        donor.sex        || 'Not on record'],
    ['Blood Type', donor.blood_type || 'Unknown'],
    ['Email',      donor.email      || '— missing —'],
    ['Contact',    donor.contact    || 'Not on record'],
  ];

  fields.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    if (label === 'Email' && (!donor.email || !donor.email.trim())) {
      dd.style.color      = '#c00';
      dd.style.fontWeight = '600';
    }
    list.appendChild(dt);
    list.appendChild(dd);
  });
}

// ─── Existing Donation Check ──────────────────────────────────────────────────

async function _checkExistingDonation(donor) {
  try {
    const donations = await getDonationsByDonor(donor.donor_id);

    _showEl(document.getElementById('donation-form-section'));

    if (donations && donations.length > 0) {
      // Already donated — store and jump straight to collection form
      _createdDonation = donations[donations.length - 1];
      _showEl(document.getElementById('donation-already-done'));
      _hideEl(document.getElementById('donation-form-fields'));
      _hideEl(document.getElementById('donation-submit-section'));

      // Build donationMap if not already built
      if (!_donationMap) {
        _donationMap = new Map();
        donations.forEach(d => {
          _donationMap.set(d.donor_id, d);
        });
      }

      await _checkExistingCollection(donor);
      return;
    }

    // No donation yet — show donation form
    _hideEl(document.getElementById('donation-already-done'));
    _showEl(document.getElementById('donation-form-fields'));
    _showEl(document.getElementById('donation-submit-section'));

  } catch (err) {
    showToast('Failed to check donation record. Please try again.', 'error');
  }
}

// ─── Existing Collection Check ────────────────────────────────────────────────

async function _checkExistingCollection(donor) {
  const collectionSection = document.getElementById('collection-form-section');
  _showEl(collectionSection);

  try {
    // Try to get collections — field roles get 403 caught silently
    const allCollections = await getAllCollections().catch(() => []);
    const existingCollection = allCollections.find(c => c.donor_id === donor.donor_id);

    if (existingCollection) {
      _hideEl(document.getElementById('collection-form-fields'));
      _hideEl(document.getElementById('collection-submit-section'));
      _showEl(document.getElementById('collection-already-done'));
      _showEl(document.getElementById('complete-section'));
      return;
    }

    // No collection yet — show form and pre-fill from screening
    _hideEl(document.getElementById('collection-already-done'));
    _showEl(document.getElementById('collection-form-fields'));
    _showEl(document.getElementById('collection-submit-section'));
    _prefillCollection(donor);

  } catch (_err) {
    // If we can't check, just show the form — backend will reject a duplicate
    _hideEl(document.getElementById('collection-already-done'));
    _showEl(document.getElementById('collection-form-fields'));
    _showEl(document.getElementById('collection-submit-section'));
    _prefillCollection(donor);
  }
}

function _prefillCollection(donor) {
  // Blood type: prefer blood_type_confirmed from screening, fall back to donor's type
  const screening = _screeningMap ? _screeningMap.get(donor.donor_id) : null;
  const confirmedType = (screening && screening.blood_type_confirmed)
    ? screening.blood_type_confirmed
    : donor.blood_type;

  const btSelect = document.getElementById('input-blood-type');
  if (btSelect && confirmedType) btSelect.value = confirmedType;

  // Default component: Whole Blood
  const compSelect = document.getElementById('input-component');
  if (compSelect) compSelect.value = 'Whole Blood';

  // Default volume: 450 mL
  const volInput = document.getElementById('input-volume-ml');
  if (volInput && !volInput.value) volInput.value = '450';
}

// ─── Donation Form ────────────────────────────────────────────────────────────

function _setupDonationForm() {
  const form = document.getElementById('donation-form');
  if (!form) return;
  form.addEventListener('submit', _handleDonationSubmit);

  const timeInput = document.getElementById('input-extraction-time');
  if (timeInput) {
    timeInput.addEventListener('input', () => {
      const val     = parseInt(timeInput.value, 10);
      const warning = document.getElementById('qns-warning');
      if (warning) {
        (!isNaN(val) && val > QNS_THRESHOLD) ? _showEl(warning) : _hideEl(warning);
      }
    });
  }
}

async function _handleDonationSubmit(e) {
  e.preventDefault();
  if (!_selectedDonor) return;

  if (!_selectedDonor.email || !_selectedDonor.email.trim()) {
    _showEl(document.getElementById('email-missing-warning'));
    _hideEl(document.getElementById('donation-form-section'));
    return;
  }

  const formError = document.getElementById('donation-form-error');
  if (formError) _hideEl(formError);
  _clearErrors(['error-extraction-time', 'error-phlebotomist']);

  const submitBtn = document.getElementById('donation-submit-btn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Recording…'; }

  try {
    // Resolve screening_id
    let screeningId = _screeningMap?.get(_selectedDonor.donor_id)?.screening_id || null;
    if (!screeningId) {
      try {
        const stored        = sessionStorage.getItem('field_screening_id');
        const storedDonorId = sessionStorage.getItem('field_screening_donor_id');
        if (stored && String(_selectedDonor.donor_id) === String(storedDonorId)) {
          screeningId = Number(stored);
        }
      } catch (_e) { /* ignore */ }
    }

    if (!screeningId) {
      if (formError) {
        formError.textContent = 'Could not find the screening record for this donor. Please go back to the Screening step.';
        _showEl(formError);
      }
      return;
    }

    const rawTime        = document.getElementById('input-extraction-time').value;
    const phlebotomistId = document.getElementById('input-phlebotomist')?.value;

    // Phlebotomist is required — backend now stores phlebotomist_id
    if (!phlebotomistId) {
      const errEl = document.getElementById('error-phlebotomist');
      if (errEl) {
        errEl.textContent = 'Select the phlebotomist who performed this extraction.';
        errEl.classList.remove('field-error-hidden');
      }
      return;
    }

    const data = {
      screening_id:    screeningId,
      // Enforce whole minutes — Math.round drops any decimal from copy-paste
      extraction_time: rawTime !== '' ? Math.round(parseFloat(rawTime)) : undefined,
      phlebotomist_id: Number(phlebotomistId),
    };

    const { valid, errors } = validateDonation(data);
    if (!valid) {
      _showFieldErrors(errors, { extraction_time: 'error-extraction-time' });
      return;
    }

    const donation = await createDonation(data);
    _createdDonation = donation;

    // Clear screening sessionStorage — consumed
    try {
      sessionStorage.removeItem('field_screening_id');
      sessionStorage.removeItem('field_screening_donor_id');
    } catch (_e) { /* ignore */ }

    showToast('Extraction recorded. Now record the collection below.', 'success');

    // Hide donation form, show collection form
    _hideEl(document.getElementById('donation-submit-section'));
    _hideEl(document.getElementById('qns-warning'));
    _showEl(document.getElementById('donation-recorded-notice'));

    _showEl(document.getElementById('collection-form-section'));
    _prefillCollection(_selectedDonor);

  } catch (err) {
    if (formError) {
      formError.textContent = err.status === 403
        ? 'You are not assigned to an active blood drive. Please contact your coordinator.'
        : (err.message || 'Failed to record extraction. Please try again.');
      _showEl(formError);
    }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Record Extraction'; }
  }
}

// ─── Collection Form ──────────────────────────────────────────────────────────

function _setupCollectionForm() {
  const form = document.getElementById('collection-form');
  if (!form) return;
  form.addEventListener('submit', _handleCollectionSubmit);
}

async function _handleCollectionSubmit(e) {
  e.preventDefault();
  if (!_selectedDonor) return;

  const formError = document.getElementById('collection-form-error');
  if (formError) _hideEl(formError);
  _clearErrors(['error-blood-type', 'error-component', 'error-volume-ml']);

  const submitBtn = document.getElementById('collection-submit-btn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Recording…'; }

  try {
    // Resolve donation_id
    let donationId = _createdDonation?.donation_id || null;
    if (!donationId && _donationMap) {
      donationId = _donationMap.get(_selectedDonor.donor_id)?.donation_id || null;
    }

    if (!donationId) {
      if (formError) {
        formError.textContent = 'Could not find the extraction record. Please complete the extraction step above first.';
        _showEl(formError);
      }
      return;
    }

    // Branch is resolved server-side:
    // - Staff: req.user.branch_id from JWT
    // - Volunteer/Phlebotomist: drive's branch_id via bloodDriveMiddleware
    const data = {
      donation_id: donationId,
      blood_type:  document.getElementById('input-blood-type').value  || undefined,
      component:   document.getElementById('input-component').value   || undefined,
      volume_ml:   document.getElementById('input-volume-ml').value !== ''
        ? parseInt(document.getElementById('input-volume-ml').value, 10)
        : undefined,
    };

    const { valid, errors } = validateCollection(data);
    if (!valid) {
      _showFieldErrors(errors, {
        blood_type: 'error-blood-type',
        component:  'error-component',
        volume_ml:  'error-volume-ml',
      });
      return;
    }

    await createCollection(data);

    showToast('Blood collection recorded. Workflow complete.', 'success');
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
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Record Collection'; }
  }
}

// ─── Error Helpers ────────────────────────────────────────────────────────────

function _showFieldErrors(errors, idMap) {
  Object.entries(errors).forEach(([field, msg]) => {
    const id = idMap[field];
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      el.textContent = msg;
      el.classList.remove('field-error-hidden');
    }
  });
}

function _clearErrors(ids) {
  ids.forEach(id => {
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