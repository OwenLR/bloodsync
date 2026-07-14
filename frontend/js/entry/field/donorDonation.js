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
 *      - Component is fixed to "Whole Blood" — locked, not editable.
 *        Separation into PRBC/FFP/Platelets happens later, as its own step
 *        (Blood Separation feature), never at collection time.
 *      - Volume is fixed to 450 mL (WHOLE_BLOOD_VOLUME_ML) — locked, not
 *        editable. Mirrors backend's WHOLE_BLOOD_VOLUME_ML in
 *        constants/inventoryRulesConstant.js. The separation feature's
 *        SEPARATION_VOLUME_ML split only sums correctly to 450 against a
 *        unit actually collected at this exact volume.
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
import { EXTRACTION }           from '../../constants/medicalRules.js';
import { WHOLE_BLOOD_VOLUME_ML } from '../../constants/bloodTypes.js';
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
  getAllInterviews,
} from '../../features/fieldWorkflow/fieldWorkflowApi.js';
import {
  computeWalkInCycleStatus,
  buildLatestWalkInInterviewMap,
  buildLatestScreeningByInterviewMap,
  buildDonationByScreeningMap,
  buildCollectionByDonationMap, 
} from '../../features/fieldWorkflow/donorCycleStatus.js';
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
    const isFieldRole = _user.role_id === ROLES.VOLUNTEER || _user.role_id === ROLES.PHLEBOTOMIST;

    const [allDonors, allScreenings, allDonations, allInterviews, allCollectionsForCycle] = await Promise.all([
      getAllDonors(),
      getAllScreenings(),
      getAllDonations(),
      isFieldRole ? Promise.resolve([]) : getAllInterviews(),         // only needed for walk-in chain
      isFieldRole ? Promise.resolve([]) : getAllCollections().catch(() => []), // same
    ]);

    let eligibleDonors;

    if (isFieldRole) {
      // Drive-scoped — UNCHANGED from prior behavior.
      const donatedIds = new Set(allDonations.map(d => d.donor_id));

      _screeningMap = new Map();
      allScreenings.forEach(s => {
        if (s.screening_result !== 'Eligible') return;
        const existing = _screeningMap.get(s.donor_id);
        if (!existing || s.screening_id > existing.screening_id) {
          _screeningMap.set(s.donor_id, s);
        }
      });

      eligibleDonors = allDonors.filter(d =>
        _screeningMap.has(d.donor_id) && !donatedIds.has(d.donor_id)
      );
    } else {
      // Walk-in (Staff/Admin) — chain-aware. A donor appears here only
      // if their CURRENT walk-in cycle is exactly "screening Eligible,
      // no donation yet."
      const interviewMapByDonor  = buildLatestWalkInInterviewMap(allInterviews);
      const screeningByInterview = buildLatestScreeningByInterviewMap(allScreenings);
      const donationByScreening  = buildDonationByScreeningMap(allDonations);
      const collectionByDonation = buildCollectionByDonationMap(allCollectionsForCycle);

      _screeningMap = new Map(); // donor_id -> screening for the CURRENT cycle only

      eligibleDonors = allDonors.filter(d => {
        const interview = interviewMapByDonor.get(d.donor_id);
        if (!interview) return false;
        const screening = screeningByInterview.get(interview.interview_id) || null;
        if (!screening) return false;
        const donation = donationByScreening.get(screening.screening_id) || null;
        const collection = donation ? (collectionByDonation.get(donation.donation_id) || null) : null;
        const status = computeWalkInCycleStatus({ interview, screening, donation, collection });
        // Donor stays selectable on THIS page through both of its steps —
        // donation not yet recorded, OR donation done but collection isn't.
        if (status.state === 'proceed_donation' || status.state === 'proceed_collection') {
          _screeningMap.set(d.donor_id, screening);
          return true;
        }
        return false;
      });
    }

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

// REPLACE _checkExistingDonation with:

async function _checkExistingDonation(donor) {
  const isFieldRole = _user.role_id === ROLES.VOLUNTEER || _user.role_id === ROLES.PHLEBOTOMIST;

  try {
    _showEl(document.getElementById('donation-form-section'));

    if (isFieldRole) {
      // Drive-scoped — UNCHANGED except for the index fix noted below.
      const donations = await getDonationsByDonor(donor.donor_id);

      if (donations && donations.length > 0) {
        // FIX: was donations[donations.length - 1] — DESC-ordered query,
        // so that index picked the OLDEST donation. index 0 is correct.
        _createdDonation = donations[0];
        _showEl(document.getElementById('donation-already-done'));
        _hideEl(document.getElementById('donation-form-fields'));
        _hideEl(document.getElementById('donation-submit-section'));

        if (!_donationMap) {
          _donationMap = new Map();
          donations.forEach(d => _donationMap.set(d.donor_id, d));
        }

        await _checkExistingCollection(donor, _createdDonation);
        return;
      }

      _hideEl(document.getElementById('donation-already-done'));
      _showEl(document.getElementById('donation-form-fields'));
      _showEl(document.getElementById('donation-submit-section'));
      return;
    }

    // Walk-in (Staff/Admin) — the donor only reaches this page's dropdown
    // when their current cycle is 'proceed_donation' (see
    // _initDonorDropdown), so this scoped-by-screening_id check is a
    // defensive guard against stale dropdown data, not the primary gate.
    const donations = await getDonationsByDonor(donor.donor_id);
    const currentScreening = _screeningMap ? _screeningMap.get(donor.donor_id) : null;
    const forThisScreening = currentScreening
      ? donations.find(d => d.screening_id === currentScreening.screening_id)
      : null;

    if (forThisScreening) {
      _createdDonation = forThisScreening;
      _showEl(document.getElementById('donation-already-done'));
      _hideEl(document.getElementById('donation-form-fields'));
      _hideEl(document.getElementById('donation-submit-section'));
      await _checkExistingCollection(donor, forThisScreening);
      return;
    }

    _hideEl(document.getElementById('donation-already-done'));
    _showEl(document.getElementById('donation-form-fields'));
    _showEl(document.getElementById('donation-submit-section'));

  } catch (err) {
    showToast('Failed to check donation record. Please try again.', 'error');
  }
}
// ─── Existing Collection Check ────────────────────────────────────────────────

async function _checkExistingCollection(donor, donationRecord) {
  const collectionSection = document.getElementById('collection-form-section');
  _showEl(collectionSection);

  const donationId = donationRecord ? donationRecord.donation_id : null;

  try {
    // Try to get collections — field roles get 403 caught silently
    const allCollections = await getAllCollections().catch(() => []);
    // FIX: was matching by donor_id alone, which could match a collection
    // from an EARLIER, already-completed donation cycle for a returning
    // donor. bloodCollectionModel.js's getAllCollections() confirms
    // donation_id is returned — scope to the specific donation currently
    // in view instead. Falls back to donor_id matching only if a
    // donation record somehow wasn't passed in (defensive, shouldn't
    // normally happen given how this function is called).
    const existingCollection = donationId
      ? allCollections.find(c => c.donation_id === donationId)
      : allCollections.find(c => c.donor_id === donor.donor_id);

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
  // Blood type is no longer selected/edited here — it's already visible in
  // the donor-info-panel above (from the donor record, synced from
  // screening), and the backend resolves the actual value used on the
  // collection record from the donation's screening (blood_type_confirmed),
  // never from client input.

  // Component is always Whole Blood at donation time — separation into
  // PRBC/FFP/Platelets happens later, as its own dedicated step (Blood
  // Separation feature), never here. Locked in HTML (disabled) — this just
  // reaffirms the value defensively.
  const compSelect = document.getElementById('input-component');
  if (compSelect) {
    compSelect.value = 'Whole Blood';
    compSelect.disabled = true;
  }

  // Whole Blood collection volume is a fixed 450 mL per standard donation
  // protocol — locked in HTML (disabled). Backend's SEPARATION_VOLUME_ML
  // constants (bloodUnitService.js) only sum correctly to 450 against a
  // unit that was actually collected at exactly this volume.
  const volInput = document.getElementById('input-volume-ml');
  if (volInput) {
    volInput.value = String(WHOLE_BLOOD_VOLUME_ML);
    volInput.disabled = true;
  }
}

// ─── Donation Form ────────────────────────────────────────────────────────────

function _setupDonationForm() {
  const form = document.getElementById('donation-form');
  if (!form) return;
  form.addEventListener('submit', _handleDonationSubmit);

  const minutesInput = document.getElementById('input-extraction-minutes');
  const secondsInput = document.getElementById('input-extraction-seconds');

  const updateQnsWarning = () => {
    const warning = document.getElementById('qns-warning');
    if (!warning) return;

    const totalSeconds = _readExtractionTotalSeconds();
    (totalSeconds !== null && totalSeconds > EXTRACTION.MAX_DURATION_MINUTES * 60)
      ? _showEl(warning)
      : _hideEl(warning);
  };

  if (minutesInput) minutesInput.addEventListener('input', updateQnsWarning);
  if (secondsInput) secondsInput.addEventListener('input', updateQnsWarning);
}

/**
 * Combines the minutes + seconds inputs into total seconds.
 * Returns null if minutes is empty/invalid — mirrors the "required" check
 * validateDonation() does, but this helper is also used for the live QNS
 * preview, so it stays lenient about seconds being blank (treated as 0).
 */
function _readExtractionTotalSeconds() {
  const minutesRaw = document.getElementById('input-extraction-minutes')?.value;
  const secondsRaw = document.getElementById('input-extraction-seconds')?.value;

  if (minutesRaw === undefined || minutesRaw === '') return null;

  const minutes = parseInt(minutesRaw, 10);
  const seconds = (secondsRaw === undefined || secondsRaw === '') ? 0 : parseInt(secondsRaw, 10);

  if (isNaN(minutes) || isNaN(seconds)) return null;

  return (minutes * 60) + seconds;
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

    const minutesRaw      = document.getElementById('input-extraction-minutes')?.value;
    const secondsRaw      = document.getElementById('input-extraction-seconds')?.value;
    const phlebotomistId  = document.getElementById('input-phlebotomist')?.value;

    // Phlebotomist is required — backend now stores phlebotomist_id
    if (!phlebotomistId) {
      const errEl = document.getElementById('error-phlebotomist');
      if (errEl) {
        errEl.textContent = 'Select the phlebotomist who performed this extraction.';
        errEl.classList.remove('field-error-hidden');
      }
      return;
    }

    // validateDonation() takes the raw minutes/seconds pair — see
    // fieldWorkflowValidation.js for the range/zero checks.
    const validationData = {
      screening_id:             screeningId,
      extraction_time_minutes:  minutesRaw,
      extraction_time_seconds:  secondsRaw,
    };

    const { valid, errors } = validateDonation(validationData);
    if (!valid) {
      _showFieldErrors(errors, { extraction_time: 'error-extraction-time' });
      return;
    }

    // Combine into total seconds — the single value the backend actually
    // stores (donations.extraction_time_seconds).
    const totalSeconds = _readExtractionTotalSeconds();

    const data = {
      screening_id:             screeningId,
      extraction_time_seconds:  totalSeconds,
      phlebotomist_id:          Number(phlebotomistId),
    };

    const donation = await createDonation(data);
    _createdDonation = donation;

    // Persist alongside the in-memory reference — same pattern as every
    // other step boundary in this workflow (interview->screening,
    // screening->donation both do this via sessionStorage). Donation->
    // collection is the one transition that stayed purely in-memory
    // since it's same-page, but that made it the only step vulnerable to
    // losing its reference if _createdDonation ever gets reset before
    // the collection form is submitted.
    try {
      sessionStorage.setItem('field_donation_id', donation.donation_id);
      sessionStorage.setItem('field_donation_donor_id', _selectedDonor.donor_id);
    } catch (_e) { /* ignore */ }

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
  _clearErrors(['error-component', 'error-volume-ml']);

  const submitBtn = document.getElementById('collection-submit-btn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Recording…'; }

  try {
    // Resolve donation_id
    let donationId = _createdDonation?.donation_id || null;
    if (!donationId && _donationMap) {
      donationId = _donationMap.get(_selectedDonor.donor_id)?.donation_id || null;
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
        formError.textContent = 'Could not find the extraction record. Please complete the extraction step above first.';
        _showEl(formError);
      }
      return;
    }

    // Branch, blood_type, component, and volume are all fixed/resolved
    // server-side or client-locked, never read from operator-editable input:
    // - branch_id: Staff → req.user.branch_id from JWT; Volunteer/Phlebotomist
    //   → drive's branch_id via bloodDriveMiddleware
    // - blood_type: from the donation's own screening record
    //   (blood_type_confirmed) — never sent by the client
    // - component: always 'Whole Blood' at collection time — see
    //   _prefillCollection() above
    // - volume_ml: always WHOLE_BLOOD_VOLUME_ML (450) — see
    //   _prefillCollection() above and constants/bloodTypes.js
    const data = {
      donation_id: donationId,
      component:   'Whole Blood',
      volume_ml:   WHOLE_BLOOD_VOLUME_ML,
    };

    const { valid, errors } = validateCollection(data);
    if (!valid) {
      _showFieldErrors(errors, {
        component:  'error-component',
        volume_ml:  'error-volume-ml',
      });
      return;
    }

    await createCollection(data);

    try {
      sessionStorage.removeItem('field_donation_id');
      sessionStorage.removeItem('field_donation_donor_id');
    } catch (_e) { /* ignore */ }

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