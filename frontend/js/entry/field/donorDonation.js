/**
 * donorDonation.js — Entry file for /pages/field/donorDonation.html
 *
 * Step 4 of the field donor workflow.
 *
 * Roles: Volunteer, Phlebotomist, Admin, PRC Staff
 *
 * Donor selector: shows only donors with an Eligible screening but no
 * donation yet. Built by cross-referencing screenings vs donations.
 * Backend scopes GET /api/screenings to the active drive for field roles.
 *
 * Key rules:
 * - Donor email is required before submit — backend sends post-extraction
 *   email. If missing, block submit and show prompt to update on Registration page.
 * - extraction_time > 15 min → show QNS warning, still allow submit.
 *   Backend sets is_qns: true automatically.
 * - POST body: only screening_id + extraction_time. Nothing else.
 * - Phlebotomist recorded server-side from JWT (conducted_by = req.user.user_id).
 *   Frontend shows the logged-in user's name as a read-only display only.
 *
 * SessionStorage:
 *   Reads:  field_screening_donor_id (pre-selects donor from screening page)
 *   Reads:  field_screening_id (resolves screening_id if not in screeningMap)
 *   Writes: field_donation_id, field_donation_donor_id (for collection page)
 *   Clears: field_screening_id, field_screening_donor_id after success
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
  getAllScreenings,
  getAllDonations,
  getDonationsByDonor,
  createDonation,
} from '../../features/fieldWorkflow/fieldWorkflowApi.js';
import { validateDonation }    from '../../features/fieldWorkflow/fieldWorkflowValidation.js';
import { initSearchableDropdown } from '../../components/searchableDropdown.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _user          = null;
let _selectedDonor = null;
let _screeningMap  = null;   // donor_id → most recent Eligible screening record
let _dropdown      = null;

const QNS_THRESHOLD = 15;   // minutes — backend also enforces this

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

  // Show logged-in user as "Performed By" — display only, not submitted
  const performedBy = document.getElementById('performed-by');
  if (performedBy) {
    performedBy.textContent = `${_user.first_name} ${_user.last_name}`;
  }

  await _initDonorDropdown();
  _setupForm();
}

// ─── Donor Selector ───────────────────────────────────────────────────────────

async function _initDonorDropdown() {
  const errorEl = document.getElementById('donor-load-error');

  try {
    // Load all three in parallel
    const [allDonors, allScreenings, allDonations] = await Promise.all([
      getAllDonors(),
      getAllScreenings(),
      getAllDonations(),
    ]);

    // Set of donor_ids that already have a donation in this context
    const donatedIds = new Set(allDonations.map(d => d.donor_id));

    // Map donor_id → most recent Eligible screening record
    // Only Eligible screenings can proceed to donation
    _screeningMap = new Map();
    allScreenings.forEach(s => {
      if (s.screening_result !== 'Eligible') return;
      const existing = _screeningMap.get(s.donor_id);
      if (!existing || s.screening_id > existing.screening_id) {
        _screeningMap.set(s.donor_id, s);
      }
    });

    // Eligible: has an Eligible screening, no donation yet
    const eligibleDonors = allDonors.filter(d =>
      _screeningMap.has(d.donor_id) && !donatedIds.has(d.donor_id)
    );

    const isFieldRole = _user.role_id === ROLES.VOLUNTEER || _user.role_id === ROLES.PHLEBOTOMIST;

    _dropdown = initSearchableDropdown({
      inputId:      'donor-select-input',
      listId:       'donor-select-list',
      items:         eligibleDonors,
      displayFn:    (d) => `${d.last_name}, ${d.first_name}`,
      subDisplayFn: (d) => [d.blood_type, d.sex, d.birthdate].filter(Boolean).join(' · '),
      filterFn:     (d, q) =>
        `${d.first_name} ${d.last_name}`.toLowerCase().includes(q) ||
        (d.id_number || '').toLowerCase().includes(q),
      onSelect:     _handleDonorSelected,
      placeholder:  isFieldRole
        ? 'Click to browse eligible donors in this drive…'
        : 'Click to browse or type to filter donors…',
      emptyMessage: 'No donors available for extraction. All eligible donors may already have a donation recorded.',
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
  _selectedDonor = null;

  _hideEl(document.getElementById('donor-info-panel'));
  _hideEl(document.getElementById('email-missing-warning'));
  _hideEl(document.getElementById('donation-form-section'));
  _hideEl(document.getElementById('proceed-section'));

  try {
    const fullDonor = await getDonorById(donor.donor_id);
    _selectedDonor  = fullDonor;

    _renderDonorInfo(fullDonor);
    _showEl(document.getElementById('donor-info-panel'));

    // Email guard — must be checked before showing the form
    if (!fullDonor.email || !fullDonor.email.trim()) {
      _showEl(document.getElementById('email-missing-warning'));
      return;   // Do not show the form — cannot proceed without email
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
    ['Birthdate',  donor.birthdate  || 'Not on record'],
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
    // Highlight missing email
    if (label === 'Email' && (!donor.email || !donor.email.trim())) {
      dd.style.color = '#c00';
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
      // Already donated — show already-done message and proceed
      _showEl(document.getElementById('donation-already-done'));
      _hideEl(document.getElementById('donation-form-fields'));
      _hideEl(document.getElementById('donation-submit-section'));
      _showEl(document.getElementById('proceed-section'));
      return;
    }

    // No existing donation — show form
    _hideEl(document.getElementById('donation-already-done'));
    _showEl(document.getElementById('donation-form-fields'));
    _showEl(document.getElementById('donation-submit-section'));

  } catch (err) {
    showToast('Failed to check existing donation. Please try again.', 'error');
  }
}

// ─── Form Setup ───────────────────────────────────────────────────────────────

function _setupForm() {
  const form = document.getElementById('donation-form');
  if (!form) return;
  form.addEventListener('submit', _handleSubmit);

  // Live QNS warning as extraction time is typed
  const timeInput = document.getElementById('input-extraction-time');
  if (timeInput) {
    timeInput.addEventListener('input', () => {
      const val     = parseInt(timeInput.value, 10);
      const warning = document.getElementById('qns-warning');
      if (warning) {
        !isNaN(val) && val > QNS_THRESHOLD ? _showEl(warning) : _hideEl(warning);
      }
    });
  }
}

async function _handleSubmit(e) {
  e.preventDefault();
  if (!_selectedDonor) return;

  // Double-check email guard — in case donor data changed
  if (!_selectedDonor.email || !_selectedDonor.email.trim()) {
    _showEl(document.getElementById('email-missing-warning'));
    _hideEl(document.getElementById('donation-form-section'));
    return;
  }

  const formError = document.getElementById('donation-form-error');
  if (formError) _hideEl(formError);

  _clearAllErrors();

  const submitBtn = document.getElementById('donation-submit-btn');
  if (submitBtn) {
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Recording…';
  }

  try {
    // Resolve screening_id from screeningMap or sessionStorage
    let screeningId = null;
    if (_screeningMap && _screeningMap.has(_selectedDonor.donor_id)) {
      screeningId = _screeningMap.get(_selectedDonor.donor_id).screening_id;
    }
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

    const rawTime = document.getElementById('input-extraction-time').value;

    const data = {
      screening_id:    screeningId,
      extraction_time: rawTime !== '' ? parseInt(rawTime, 10) : undefined,
    };

    const { valid, errors } = validateDonation(data);
    if (!valid) {
      _showFieldErrors(errors);
      return;
    }

    const donation = await createDonation(data);

    // Clear screening sessionStorage — consumed
    try {
      sessionStorage.removeItem('field_screening_id');
      sessionStorage.removeItem('field_screening_donor_id');
    } catch (_e) { /* ignore */ }

    // Write donation sessionStorage for collection page
    try {
      sessionStorage.setItem('field_donation_id',       donation.donation_id);
      sessionStorage.setItem('field_donation_donor_id', _selectedDonor.donor_id);
    } catch (_e) { /* ignore */ }

    showToast('Extraction recorded successfully.', 'success');
    _hideEl(document.getElementById('donation-submit-section'));
    _hideEl(document.getElementById('qns-warning'));
    _showEl(document.getElementById('proceed-section'));

  } catch (err) {
    if (formError) {
      formError.textContent = err.status === 403
        ? 'You are not assigned to an active blood drive. Please contact your coordinator.'
        : (err.message || 'Failed to record extraction. Please try again.');
      _showEl(formError);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Record Extraction';
    }
  }
}

// ─── Error Helpers ────────────────────────────────────────────────────────────

function _showFieldErrors(errors) {
  const map = {
    extraction_time: 'error-extraction-time',
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
  ['error-extraction-time'].forEach(id => {
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