/**
 * fieldRegistrationUI.js — DOM + event handlers for Volunteer/Phlebotomist
 * self-registration. Never calls apiFetch directly — goes through
 * fieldRegistrationApi.js. Address lookups go through psgcApi.js, geocoding
 * through fieldGeocodeApi.js — neither of those is our backend, so neither
 * goes through apiFetch either.
 *
 * CHANGED this session:
 * - Added nationality, education, occupation, emergency_contact_name to
 *   the collected form data — profileModel.js's createProfile() already
 *   accepted these columns, the form just never sent them. All four are
 *   optional, same "only append if present" treatment as address_street.
 *
 * CHANGED previous session:
 * - Address block: cascading Province -> City/Municipality -> Barangay
 *   dropdowns (psgcApi.js), Street stays free text. Selecting a barangay
 *   silently geocodes (fieldGeocodeApi.js) and fills hidden lat/lng
 *   inputs — never blocks the form if it fails.
 * - Inline field errors: validateFieldRegistrationForm now returns
 *   [{ field, message }]; each error is shown next to its own field via
 *   showError(`${field}-error`, message) instead of one global box.
 *   First invalid field is focused.
 * - Terms & Conditions: required checkbox + "View full terms" link that
 *   opens the full text in a modal (openModal from components/modal.js).
 * - Volunteer file input: removed from the DOM entirely when Volunteer is
 *   selected (not just hidden/optional) — re-added if the user goes Back
 *   and picks Phlebotomist instead, since Step 1 -> Step 2 -> Back ->
 *   Step 1 -> Step 2 is a normal path and the field must still work for
 *   Phlebotomist on a second pass.
 *
 * Two-step flow unchanged: Step 1 (#step-role-select) picks role, Step 2
 * (#step-form) is the shared form.
 *
 * id_number (Government/National ID) input stays removed — see
 * fieldRegistrationValidation.js header for context.
 *
 * Path: frontend/js/features/registration/fieldRegistrationUI.js
 */

import { registerFieldRole }                            from './fieldRegistrationApi.js';
import { validateFieldRegistrationForm, stripNonDigits } from './fieldRegistrationValidation.js';
import { getProvinces, getCitiesMunicipalities, getBarangays } from './psgcApi.js';
import { geocodeBarangay }                               from './fieldGeocodeApi.js';
import { lookupZip }                                      from './zipLookupApi.js';
import { showError, clearFeedback }                      from '../../components/feedback.js';
import { openModal, closeModal }                         from '../../components/modal.js';
import { showToast }                                     from '../../components/toast.js';
import { TERMS_AND_CONDITIONS, TERMS_SUMMARY }           from '../../constants/termsAndConditions.js';
import { ROUTES }                                        from '../../constants/routes.js';

const ERROR_ID      = 'register-error';
const BTN_ID        = 'btn-register';
const FILE_LABEL_ID = 'profile-img-label';
const FILE_FIELD_ID = 'field-profile-img'; // wrapper div, see fieldRole.html

const ROLE_SELECT_STEP_ID = 'step-role-select';
const FORM_STEP_ID        = 'step-form';

const ROLE_COPY = {
  volunteer: {
    heading:    'Register as Volunteer',
    subheading: 'Your account will be reviewed by an admin before you can sign in.',
  },
  phlebotomist: {
    heading:    'Register as Phlebotomist',
    subheading: 'Your account will be reviewed by an admin before you can sign in. A license document is required.',
    fileLabel:  'License document',
  },
};

let selectedRole = null;

// Address dropdown state — { code, name } selections, cleared on role
// switch and on each level's own change.
let selectedProvince = null;
let selectedCity     = null;
let geocodedLat       = null;
let geocodedLon       = null;
let zipWasAutoFilled  = false; // tracks whether the current zip value is ours, so a manual edit is never clobbered

export function initFieldRegisterForm() {
  document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => selectRole(card.dataset.role));
  });

  document.getElementById('btn-back-role').addEventListener('click', backToRoleSelect);

  const birthdateInput = document.getElementById('input-birthdate');
  birthdateInput.max = new Date().toISOString().slice(0, 10);

  document.getElementById(BTN_ID).addEventListener('click', handleSubmit);

  document.getElementById('privacy-notice-summary').textContent = TERMS_SUMMARY;

  document.getElementById('link-view-terms').addEventListener('click', (e) => {
    e.preventDefault();
    showTermsModal();
  });

  loadProvinces();
  attachAddressListeners();

  document.getElementById('input-zip-code').addEventListener('input', () => {
    zipWasAutoFilled = false; // any manual keystroke means "hands off" from here on
  });
}

// ---------------------------------------------------------------------------
// Step switching
// ---------------------------------------------------------------------------

function selectRole(role) {
  selectedRole = role;

  const copy = ROLE_COPY[role];
  document.getElementById('form-heading').textContent    = copy.heading;
  document.getElementById('form-subheading').textContent = copy.subheading;

  applyFileFieldForRole(role);

  document.getElementById(ROLE_SELECT_STEP_ID).style.display = 'none';
  document.getElementById(FORM_STEP_ID).style.display        = '';

  document.getElementById('input-first-name').focus();
}

function backToRoleSelect() {
  selectedRole = null;
  clearFeedback(ERROR_ID);

  document.getElementById(FORM_STEP_ID).style.display        = 'none';
  document.getElementById(ROLE_SELECT_STEP_ID).style.display = '';
  // Form values are intentionally left intact — coming back after
  // "Change role" shouldn't force retyping everything.
}

// Volunteer: file input removed from the DOM entirely (not just hidden).
// Phlebotomist: field re-created if it isn't already present (covers the
// Back -> pick Phlebotomist path after a prior Volunteer selection).
function applyFileFieldForRole(role) {
  const existingField = document.getElementById(FILE_FIELD_ID);

  if (role === 'volunteer') {
    if (existingField) existingField.remove();
    return;
  }

  // phlebotomist
  if (existingField) {
    document.getElementById(FILE_LABEL_ID).textContent = ROLE_COPY.phlebotomist.fileLabel;
    return;
  }

  const field = document.createElement('div');
  field.className = 'field';
  field.id = FILE_FIELD_ID;

  const label = document.createElement('label');
  label.id = FILE_LABEL_ID;
  label.setAttribute('for', 'input-profile-img');
  label.textContent = ROLE_COPY.phlebotomist.fileLabel;

  const input = document.createElement('input');
  input.id = 'input-profile-img';
  input.type = 'file';
  input.accept = '.jpg,.jpeg,.png,.pdf';

  const errorEl = document.createElement('p');
  errorEl.id = 'input-profile-img-error';
  errorEl.className = 'field-error';

  field.appendChild(label);
  field.appendChild(input);
  field.appendChild(errorEl);

  document.getElementById('btn-register').insertAdjacentElement('beforebegin', field);
}

// ---------------------------------------------------------------------------
// Address dropdowns
// ---------------------------------------------------------------------------

async function loadProvinces() {
  const select = document.getElementById('input-address-province');
  try {
    const provinces = await getProvinces();
    provinces.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.code;
      opt.textContent = p.name;
      select.appendChild(opt);
    });
  } catch {
    showToast('Could not load provinces. Please refresh.', 'error');
  }
}

function attachAddressListeners() {
  document.getElementById('input-address-province').addEventListener('change', onProvinceChange);
  document.getElementById('input-address-city').addEventListener('change', onCityChange);
  document.getElementById('input-address-barangay').addEventListener('change', onBarangayChange);
}

async function onProvinceChange(e) {
  const code = e.target.value;
  const citySelect     = document.getElementById('input-address-city');
  const barangaySelect = document.getElementById('input-address-barangay');

  resetSelect(citySelect, 'City / Municipality');
  resetSelect(barangaySelect, 'Barangay');
  clearGeocode();

  if (!code) { selectedProvince = null; return; }

  selectedProvince = { code, name: e.target.selectedOptions[0]?.textContent || '' };
  selectedCity = null;

  citySelect.disabled = true;
  try {
    const cities = await getCitiesMunicipalities(code);
    cities.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = c.name;
      citySelect.appendChild(opt);
    });
  } catch {
    showToast('Could not load cities/municipalities. Please try again.', 'error');
  } finally {
    citySelect.disabled = false;
  }
}

async function onCityChange(e) {
  const code = e.target.value;
  const barangaySelect = document.getElementById('input-address-barangay');

  resetSelect(barangaySelect, 'Barangay');
  clearGeocode();

  if (!code) { selectedCity = null; return; }

  selectedCity = { code, name: e.target.selectedOptions[0]?.textContent || '' };

  barangaySelect.disabled = true;
  try {
    const barangays = await getBarangays(code);
    barangays.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.code;
      opt.textContent = b.name;
      barangaySelect.appendChild(opt);
    });
  } catch {
    showToast('Could not load barangays. Please try again.', 'error');
  } finally {
    barangaySelect.disabled = false;
  }

  autoFillZip();
}

// Best-effort ZIP pre-fill, fired once a city/municipality is chosen —
// never overwrites a value the user typed themselves. See zipLookupApi.js
// / postalCodeService.js for the data source and its known limitations
// (unreliable inside Metro Manila — this project's actual userbase is
// PRC Batangas Chapter, where the underlying data is a clean 1:1 match,
// verified against the real package data before this was built).
async function autoFillZip() {
  if (!selectedCity) return;

  const zipInput = document.getElementById('input-zip-code');
  if (zipInput.value.trim() && !zipWasAutoFilled) return; // respect a manual entry

  const result = await lookupZip({
    province:     selectedProvince ? selectedProvince.name : '',
    municipality: selectedCity.name,
  });

  if (result && result.post_code) {
    zipInput.value = result.post_code;
    zipWasAutoFilled = true;
  }
}

// Silent-on-select: fires the geocode as soon as a barangay is picked, no
// visible loading state, no blocking. Sets hidden lat/lng inputs only.
// Failure is invisible to the user — registration still works without
// coordinates, same as the rest of the app's geolocation fallbacks.
async function onBarangayChange(e) {
  if (!e.target.value) return;

  const barangayName = e.target.selectedOptions[0]?.textContent || '';
  if (!selectedProvince || !selectedCity || !barangayName) return;

  const coords = await geocodeBarangay({
    barangay: barangayName,
    city:     selectedCity.name,
    province: selectedProvince.name,
  });

  if (coords) {
    geocodedLat = coords.latitude;
    geocodedLon = coords.longitude;
  } else {
    clearGeocode();
  }
}

function resetSelect(selectEl, placeholderLabel) {
  selectEl.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = `Select ${placeholderLabel}…`;
  selectEl.appendChild(placeholder);
}

function clearGeocode() {
  geocodedLat = null;
  geocodedLon = null;
}

// ---------------------------------------------------------------------------
// Terms & Conditions modal
// ---------------------------------------------------------------------------

function showTermsModal() {
  const container = document.createElement('div');
  container.className = 'terms-modal-content';

  TERMS_AND_CONDITIONS.forEach(section => {
    const h = document.createElement('h3');
    h.textContent = section.heading;

    const p = document.createElement('p');
    p.textContent = section.body;

    container.appendChild(h);
    container.appendChild(p);
  });

  openModal('Terms and Conditions', container, [
    { label: 'Close', className: 'btn-secondary', onClick: closeModal },
  ]);
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

function clearAllFieldErrors() {
  document.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; el.style.display = 'none'; });
}

async function handleSubmit() {
  clearFeedback(ERROR_ID);
  clearAllFieldErrors();

  const first_name              = document.getElementById('input-first-name').value.trim();
  const last_name               = document.getElementById('input-last-name').value.trim();
  const email                   = document.getElementById('input-email').value.trim();
  const password                = document.getElementById('input-password').value;
  const confirmPassword         = document.getElementById('input-confirm-password').value;
  const sex                     = document.getElementById('input-sex').value;
  const contact                 = stripNonDigits(document.getElementById('input-contact').value);
  const birthdate                = document.getElementById('input-birthdate').value;
  const address_street          = document.getElementById('input-address-street').value.trim();
  const address_province        = selectedProvince ? selectedProvince.name : '';
  const address_municipality    = selectedCity ? selectedCity.name : '';
  const barangaySelect          = document.getElementById('input-address-barangay');
  const address_brgy            = barangaySelect.value ? (barangaySelect.selectedOptions[0]?.textContent || '') : '';
  const zip_code                = stripNonDigits(document.getElementById('input-zip-code').value);
  const nationality              = document.getElementById('input-nationality').value.trim();
  const education                = document.getElementById('input-education').value.trim();
  const occupation                = document.getElementById('input-occupation').value.trim();
  const emergency_contact_name  = document.getElementById('input-emergency-name').value.trim();
  const emergency_contact_phone = stripNonDigits(document.getElementById('input-emergency-contact').value);
  const fileInput                = document.getElementById('input-profile-img');
  const profile_img              = fileInput ? (fileInput.files[0] || null) : null;
  const terms_accepted          = document.getElementById('input-terms').checked;

  const data = {
    first_name, last_name, email, password,
    ...(sex ? { sex } : {}),
    ...(contact ? { contact } : {}),
    ...(birthdate ? { birthdate } : {}),
    ...(address_street ? { address_street } : {}),
    address_province, address_municipality, address_brgy,
    ...(zip_code ? { zip_code } : {}),
    ...(nationality ? { nationality } : {}),
    ...(education ? { education } : {}),
    ...(occupation ? { occupation } : {}),
    ...(emergency_contact_name ? { emergency_contact_name } : {}),
    ...(emergency_contact_phone ? { emergency_contact_phone } : {}),
    ...(profile_img ? { profile_img } : {}),
    ...(geocodedLat != null ? { latitude: geocodedLat } : {}),
    ...(geocodedLon != null ? { longitude: geocodedLon } : {}),
    terms_accepted,
  };

  const errors = validateFieldRegistrationForm(data, confirmPassword, selectedRole);
  if (errors.length > 0) {
    errors.forEach(({ field, message }) => {
      if (field) showError(`${field}-error`, message);
    });
    const firstField = document.getElementById(errors[0].field);
    if (firstField) firstField.focus();
    return;
  }

  const btn = document.getElementById(BTN_ID);
  btn.disabled    = true;
  btn.textContent = 'Submitting…';

  const payload = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (key === 'profile_img' || key === 'terms_accepted') return;
    payload.append(key, value);
  });
  if (profile_img) payload.append('profile_img', profile_img);

  try {
    await registerFieldRole(selectedRole, payload);
    showPendingModal();
  } catch (err) {
    showError(ERROR_ID, err.message || 'Registration failed. Please try again.');
    btn.disabled    = false;
    btn.textContent = 'Submit registration';
  }
}

function showPendingModal() {
  const body       = document.createElement('p');
  body.textContent =
    'Your registration is being processed. An admin will review your ' +
    'submitted information before your account is activated. You will ' +
    'be notified by email once a decision has been made.';

  openModal('Registration Submitted', body, [
    {
      label:     'Back to Sign In',
      className: 'btn-primary',
      onClick:   () => { window.location.href = ROUTES.LOGIN; },
    },
  ]);
}