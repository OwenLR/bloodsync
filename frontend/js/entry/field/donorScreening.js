/**
 * donorScreening.js — Entry file for /pages/field/donorScreening.html
 *
 * Step 3 of the field donor workflow.
 *
 * Roles: Volunteer, Phlebotomist, Admin, PRC Staff
 *
 * Donor selector: shows only donors with a completed interview but no
 * screening yet. Built by cross-referencing interviews vs screenings.
 * Backend scopes GET /api/donor-interviews to the active drive for field
 * roles, so the cross-reference is automatically drive-scoped.
 *
 * Auto-computed fields (not manually selected):
 *   hemoglobin_status — "Allowed" if hemoglobin is within range for donor sex,
 *                       "Not Allowed" otherwise
 *   screening_result  — "Eligible" if hemoglobin_status is Allowed,
 *                       "Deferred" otherwise
 *   Blood type is required — confirmed at screening, not optional
 *
 * Hemoglobin ranges (backend also enforces):
 *   Male:   13.0 – 20.0 g/dL
 *   Female: 12.5 – 20.0 g/dL
 *
 * SessionStorage:
 *   Reads:  field_interview_donor_id (pre-selects donor from interview page)
 *   Reads:  field_interview_id (resolves interview_id if not in interviewMap)
 *   Writes: field_screening_id, field_screening_donor_id (for donation page)
 *   Clears: field_interview_id, field_interview_donor_id after success
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
  getAllInterviews,
  getAllScreenings,
  getScreeningsByDonor,
  createScreening,
} from '../../features/fieldWorkflow/fieldWorkflowApi.js';
import { validateScreening }   from '../../features/fieldWorkflow/fieldWorkflowValidation.js';
import { initSearchableDropdown } from '../../components/searchableDropdown.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _user              = null;
let _selectedDonor     = null;
let _selectedInterview = null;   // interview record for the selected donor
let _dropdown          = null;
let _interviewMap      = null;   // donor_id → interview record (built at load time)

// ─── Hemoglobin thresholds ────────────────────────────────────────────────────

const HGB_MAX    = 20.0;
const HGB_MIN_M  = 13.0;   // Male minimum
const HGB_MIN_F  = 12.5;   // Female minimum

function _getHgbMin(sex) {
  return (sex || '').trim() === 'Female' ? HGB_MIN_F : HGB_MIN_M;
}

/**
 * Compute hemoglobin_status from value + donor sex.
 * Returns 'Allowed' | 'Not Allowed'
 */
function _computeHgbStatus(hgb, sex) {
  const min = _getHgbMin(sex);
  return (hgb >= min && hgb <= HGB_MAX) ? 'Allowed' : 'Not Allowed';
}

/**
 * Compute screening_result from hemoglobin_status.
 * Returns 'Eligible' | 'Deferred'
 */
function _computeResult(hgbStatus) {
  return hgbStatus === 'Allowed' ? 'Eligible' : 'Deferred';
}

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
    // Load all three in parallel
    const [allDonors, allInterviews, allScreenings] = await Promise.all([
      getAllDonors(),
      getAllInterviews(),
      getAllScreenings(),
    ]);

    // Set of donor_ids that already have a screening in this context
    const screenedIds = new Set(allScreenings.map(s => s.donor_id));

    // Map donor_id → most recent interview record
    _interviewMap = new Map();
    allInterviews.forEach(iv => {
      const existing = _interviewMap.get(iv.donor_id);
      if (!existing || iv.interview_id > existing.interview_id) {
        _interviewMap.set(iv.donor_id, iv);
      }
    });

    // Eligible: has interview, not yet screened
    const eligibleDonors = allDonors.filter(d =>
      _interviewMap.has(d.donor_id) && !screenedIds.has(d.donor_id)
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
        ? 'Click to browse interviewed donors in this drive…'
        : 'Click to browse or type to filter donors…',
      emptyMessage: 'No donors available for screening. All interviewed donors may already have a screening record.',
    });

    // Pre-select donor passed from interview page
    try {
      const storedId = sessionStorage.getItem('field_interview_donor_id');
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
  _selectedDonor     = null;
  _selectedInterview = null;

  _hideEl(document.getElementById('donor-info-panel'));
  _hideEl(document.getElementById('screening-form-section'));
  _hideEl(document.getElementById('proceed-section'));
  _clearResultPreview();

  try {
    const fullDonor    = await getDonorById(donor.donor_id);
    _selectedDonor     = fullDonor;
    _selectedInterview = _interviewMap ? _interviewMap.get(donor.donor_id) : null;

    _renderDonorInfo(fullDonor);
    _showEl(document.getElementById('donor-info-panel'));

    await _checkExistingScreening(fullDonor);
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

// ─── Existing Screening Check ─────────────────────────────────────────────────

async function _checkExistingScreening(donor) {
  try {
    const screenings = await getScreeningsByDonor(donor.donor_id);

    _showEl(document.getElementById('screening-form-section'));

    if (screenings && screenings.length > 0) {
      // Already screened — hide form fields, show already-done message + proceed
      _showEl(document.getElementById('screening-already-done'));
      _hideEl(document.getElementById('screening-form-fields'));
      _hideEl(document.getElementById('screening-submit-section'));

      const latest = screenings[screenings.length - 1];
      _showProceedSection(latest.screening_result);
      return;
    }

    // No existing screening — show form, set hemoglobin hint
    _hideEl(document.getElementById('screening-already-done'));
    _showEl(document.getElementById('screening-form-fields'));
    _showEl(document.getElementById('screening-submit-section'));
    _setHemoglobinHint(donor.sex);

    // Pre-fill blood type from registration if known
    const btSelect = document.getElementById('input-blood-type-confirmed');
    if (btSelect && donor.blood_type) {
      btSelect.value = donor.blood_type;
    }

  } catch (err) {
    showToast('Failed to check existing screening. Please try again.', 'error');
  }
}

// ─── Hemoglobin hint + live result preview ────────────────────────────────────

function _setHemoglobinHint(sex) {
  const hint = document.getElementById('hemoglobin-hint');
  if (!hint) return;
  const min = _getHgbMin(sex);
  hint.textContent = `Required range: ${min} – ${HGB_MAX} g/dL. Values outside this range will result in Deferred.`;
}

function _updateResultPreview() {
  if (!_selectedDonor) return;

  const hgbInput = document.getElementById('input-hemoglobin');
  const preview  = document.getElementById('screening-result-preview');
  const previewText = document.getElementById('screening-result-preview-text');
  if (!hgbInput || !preview || !previewText) return;

  const raw = hgbInput.value;
  if (raw === '' || isNaN(parseFloat(raw))) {
    _clearResultPreview();
    return;
  }

  const hgb       = parseFloat(raw);
  const hgbStatus = _computeHgbStatus(hgb, _selectedDonor.sex);
  const result    = _computeResult(hgbStatus);

  previewText.textContent = result === 'Eligible'
    ? `✓ Hemoglobin ${hgb} g/dL - Allowed. Screening result: Eligible.`
    : `✗ Hemoglobin ${hgb} g/dL - outside accepted range (${_getHgbMin(_selectedDonor.sex)}–${HGB_MAX} g/dL). Screening result: Deferred.`;

  preview.style.background = result === 'Eligible' ? '#e6f4ea' : '#fff8e1';
  preview.style.borderColor = result === 'Eligible' ? '#a5d6a7' : '#ffe082';
  previewText.style.color   = result === 'Eligible' ? '#2e7d32' : '#7b5800';

  _showEl(preview);
}

function _clearResultPreview() {
  const preview = document.getElementById('screening-result-preview');
  if (preview) _hideEl(preview);
}

// ─── Form Setup ───────────────────────────────────────────────────────────────

function _setupForm() {
  const form = document.getElementById('screening-form');
  if (!form) return;
  form.addEventListener('submit', _handleSubmit);

  // Live result preview as hemoglobin is typed
  const hgbInput = document.getElementById('input-hemoglobin');
  if (hgbInput) {
    hgbInput.addEventListener('input', _updateResultPreview);
  }
}

async function _handleSubmit(e) {
  e.preventDefault();
  if (!_selectedDonor) return;

  _clearAllErrors();
  const formError = document.getElementById('screening-form-error');
  if (formError) _hideEl(formError);

  const submitBtn = document.getElementById('screening-submit-btn');
  if (submitBtn) {
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Saving…';
  }

  try {
    // Resolve interview_id
    let interviewId = _selectedInterview ? _selectedInterview.interview_id : null;
    if (!interviewId) {
      try {
        const stored   = sessionStorage.getItem('field_interview_id');
        const storedDonorId = sessionStorage.getItem('field_interview_donor_id');
        if (stored && String(_selectedDonor.donor_id) === String(storedDonorId)) {
          interviewId = Number(stored);
        }
      } catch (_e) { /* ignore */ }
    }

    if (!interviewId) {
      if (formError) {
        formError.textContent = 'Could not find the interview record for this donor. Please go back to the Interview step.';
        _showEl(formError);
      }
      return;
    }

    const rawHgb    = document.getElementById('input-hemoglobin').value;
    const rawWeight = document.getElementById('input-weight').value;
    const rawPulse  = document.getElementById('input-pulse-rate').value;
    const hgb       = rawHgb !== '' ? parseFloat(rawHgb) : undefined;

    // Auto-compute status and result — not manually selected by user
    const hgbStatus = hgb !== undefined ? _computeHgbStatus(hgb, _selectedDonor.sex) : undefined;
    const result    = hgbStatus ? _computeResult(hgbStatus) : undefined;

    const data = {
      interview_id:         interviewId,
      hemoglobin:           hgb,
      hemoglobin_status:    hgbStatus,
      screening_result:     result,
      weight:               rawWeight !== '' ? parseFloat(rawWeight)   : undefined,
      pulse_rate:           rawPulse  !== '' ? parseInt(rawPulse, 10)  : undefined,
      blood_pressure:       document.getElementById('input-blood-pressure').value.trim()       || undefined,
      blood_type_confirmed: document.getElementById('input-blood-type-confirmed').value        || undefined,
    };

    const { valid, errors } = validateScreening(data);
    if (!valid) {
      _showFieldErrors(errors);
      return;
    }

    const screening = await createScreening(data);

    // Clear interview sessionStorage — consumed by this step
    try {
      sessionStorage.removeItem('field_interview_id');
      sessionStorage.removeItem('field_interview_donor_id');
    } catch (_e) { /* ignore */ }

    // Write screening sessionStorage for donation page
    try {
      sessionStorage.setItem('field_screening_id',       screening.screening_id);
      sessionStorage.setItem('field_screening_donor_id', _selectedDonor.donor_id);
    } catch (_e) { /* ignore */ }

    showToast('Screening record saved.', 'success');
    _hideEl(document.getElementById('screening-submit-section'));
    _clearResultPreview();
    _showProceedSection(data.screening_result);

  } catch (err) {
    if (formError) {
      formError.textContent = err.status === 403
        ? 'You are not assigned to an active blood drive. Please contact your coordinator.'
        : (err.message || 'Failed to save screening record. Please try again.');
      _showEl(formError);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Save Screening Record';
    }
  }
}

// ─── Proceed Section ──────────────────────────────────────────────────────────

function _showProceedSection(screeningResult) {
  const section  = document.getElementById('proceed-section');
  const title    = document.getElementById('proceed-title');
  const body     = document.getElementById('proceed-body');
  const nextLink = document.getElementById('proceed-link');
  const backLink = document.getElementById('proceed-back');

  _showEl(section);

  if (screeningResult === 'Eligible') {
    if (title) title.textContent = 'Screening Complete - Eligible';
    if (body)  body.textContent  = 'Donor passed the hemoglobin test and is eligible to proceed to donation.';
    if (nextLink) _showEl(nextLink);
    if (backLink) _hideEl(backLink);
  } else {
    if (title) title.textContent = 'Screening Complete - Deferred';
    if (body)  body.textContent  = 'Donor did not meet the hemoglobin requirement and has been deferred. A deferral record has been saved automatically.';
    if (nextLink) _hideEl(nextLink);
    if (backLink) _showEl(backLink);
  }
}

// ─── Error Helpers ────────────────────────────────────────────────────────────

function _showFieldErrors(errors) {
  const map = {
    hemoglobin:           'error-hemoglobin',
    screening_result:     null,   // auto-computed, no dedicated field to show error on
    hemoglobin_status:    null,   // auto-computed
    blood_type_confirmed: 'error-blood-type-confirmed',
    weight:               'error-weight',
    pulse_rate:           'error-pulse-rate',
    blood_pressure:       'error-blood-pressure',
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
  ['error-hemoglobin', 'error-blood-type-confirmed',
   'error-weight', 'error-pulse-rate', 'error-blood-pressure'].forEach(id => {
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