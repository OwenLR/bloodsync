/**
 * profileFieldUI.js — Volunteer/Phlebotomist Profile page.
 *
 * Redesigned this session to match profileUI.js's profile-page treatment:
 * large avatar with pencil-overlay upload (reuses profileUI.js's
 * initAvatarUpload against the Vol/Phleb endpoint), status badge, and
 * the Contact & Address card collapsed behind an Edit affordance
 * (components/editToggle.js) instead of always-open form fields.
 */

import { getMyVolunteerProfile, updateVolunteerPhoto, updateVolunteerAddress } from './profileApi.js';
import { validateAddressUpdate }                                              from './profileValidation.js';
import { renderAvatar, initAvatarUpload }                                     from './profileUI.js';
import { getProvinces, getCitiesMunicipalities, getBarangays }                from '../registration/psgcApi.js';
import { geocodeBarangay }                                                     from '../registration/fieldGeocodeApi.js';
import { showToast }                                                            from '../../components/toast.js';
import { initEditToggle }                                                      from '../../components/editToggle.js';

let selectedProvince = null;
let selectedCity     = null;
let geocodedLat       = null;
let geocodedLon       = null;

const STATUS_BADGE_CLASS = {
  Active:   'status-badge--active',
  Inactive: 'status-badge--inactive',
  Pending:  'status-badge--pending',
  Declined: 'status-badge--declined',
};

// ---------------------------------------------------------------------------
// Read-only sections
// ---------------------------------------------------------------------------

export async function loadAndRenderProfile() {
  try {
    const profile = await getMyVolunteerProfile();
    renderProfile(profile);
    return profile;
  } catch (err) {
    showToast(err.message || 'Could not load your profile.', 'error');
    return null;
  }
}

function renderProfile(profile) {
  setText('profile-name', `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '—');
  setText('profile-email', profile.email || '—');
  setText('profile-role-label', profile.role_name || '—');
  setText('profile-birthdate', formatDate(profile.birthdate));
  setText('profile-sex', profile.sex || '—');
  setText('profile-nationality', profile.nationality || '—');
  setText('profile-education', profile.education || '—');
  setText('profile-occupation', profile.occupation || '—');
  setText('profile-id-type', profile.id_type || '—'); // Phlebotomist's page only

  const statusBadge = document.getElementById('profile-status-badge');
  if (statusBadge) {
    statusBadge.textContent = profile.status || '—';
    statusBadge.className = 'status-badge ' + (STATUS_BADGE_CLASS[profile.status] || 'status-badge--inactive');
  }

  renderAddressView(profile);
  renderAvatar(profile);
}

function renderAddressView(profile) {
  setText('view-contact', profile.contact || '—');
  setText('view-zip', profile.zip_code || '—');
  setText('view-address', formatAddress(profile));
  setText('view-emergency-name', profile.emergency_contact_name || '—');
  setText('view-emergency-phone', profile.emergency_contact_phone || '—');
}

function formatAddress(profile) {
  const parts = [profile.address_street, profile.address_brgy, profile.address_municipality, profile.address_province].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatDate(isoOrDateString) {
  if (!isoOrDateString) return '—';
  return String(isoOrDateString).slice(0, 10);
}

// ---------------------------------------------------------------------------
// Photo/document upload — reuses profileUI.js's pencil-on-avatar pattern
// ---------------------------------------------------------------------------

export function initVolunteerAvatarUpload() {
  initAvatarUpload(updateVolunteerPhoto);
}

// ---------------------------------------------------------------------------
// Contact + Address + Emergency Contact edit
// ---------------------------------------------------------------------------

export async function initAddressForm(profile) {
  const form = document.getElementById('address-form');
  if (!form) return;

  const { setViewMode } = initEditToggle('address-card');

  attachAddressListeners();
  await loadProvinces();
  await prefillAddress(profile);

  form.addEventListener('submit', (e) => handleAddressSubmit(e, setViewMode));
}

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
    populateSelect(citySelect, cities);
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
    populateSelect(barangaySelect, barangays);
  } catch {
    showToast('Could not load barangays. Please try again.', 'error');
  } finally {
    barangaySelect.disabled = false;
  }
}

async function onBarangayChange(e) {
  if (!e.target.value) { clearGeocode(); return; }

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

async function prefillAddress(profile) {
  setValue('input-contact', profile.contact);
  setValue('input-address-street', profile.address_street);
  setValue('input-zip-code', profile.zip_code);
  setValue('input-emergency-name', profile.emergency_contact_name);
  setValue('input-emergency-contact', profile.emergency_contact_phone);

  if (!profile.address_province) return;

  try {
    const provinceSelect = document.getElementById('input-address-province');
    const provinceMatch  = findOptionByName(provinceSelect, profile.address_province);
    if (!provinceMatch) return;

    provinceSelect.value = provinceMatch.value;
    selectedProvince = { code: provinceMatch.value, name: provinceMatch.textContent };

    const citySelect = document.getElementById('input-address-city');
    citySelect.disabled = true;
    const cities = await getCitiesMunicipalities(selectedProvince.code);
    populateSelect(citySelect, cities);
    citySelect.disabled = false;

    if (!profile.address_municipality) return;
    const cityMatch = findOptionByName(citySelect, profile.address_municipality);
    if (!cityMatch) return;

    citySelect.value = cityMatch.value;
    selectedCity = { code: cityMatch.value, name: cityMatch.textContent };

    const barangaySelect = document.getElementById('input-address-barangay');
    barangaySelect.disabled = true;
    const barangays = await getBarangays(selectedCity.code);
    populateSelect(barangaySelect, barangays);
    barangaySelect.disabled = false;

    if (!profile.address_brgy) return;
    const brgyMatch = findOptionByName(barangaySelect, profile.address_brgy);
    if (!brgyMatch) return;

    barangaySelect.value = brgyMatch.value;

    const coords = await geocodeBarangay({
      barangay: brgyMatch.textContent,
      city:     selectedCity.name,
      province: selectedProvince.name,
    });
    if (coords) {
      geocodedLat = coords.latitude;
      geocodedLon = coords.longitude;
    }
  } catch {
    showToast('Could not load your saved address into the form. You can still re-select it manually.', 'error');
  }
}

function findOptionByName(selectEl, name) {
  const target = (name || '').trim().toLowerCase();
  if (!target) return null;
  return Array.from(selectEl.options).find(o => o.textContent.trim().toLowerCase() === target) || null;
}

function populateSelect(selectEl, items) {
  const placeholder = selectEl.options[0];
  selectEl.innerHTML = '';
  selectEl.appendChild(placeholder);
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.code;
    opt.textContent = item.name;
    selectEl.appendChild(opt);
  });
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

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

function clearAddressFieldErrors() {
  document.querySelectorAll('#address-form .field-error').forEach(el => {
    el.textContent = '';
    el.classList.add('field-error-hidden');
  });
}

function showAddressFieldError(fieldId, message) {
  const el = document.getElementById(`${fieldId}-error`);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('field-error-hidden');
}

function setButtonLoading(btn, loadingText) {
  btn.disabled = true;
  btn.dataset.originalText = btn.textContent;
  btn.textContent = loadingText;
}

function restoreButton(btn) {
  btn.disabled = false;
  btn.textContent = btn.dataset.originalText || 'Save';
}

function stripDigits(value) {
  return (value || '').replace(/\D/g, '');
}

async function handleAddressSubmit(e, setViewMode) {
  e.preventDefault();
  clearAddressFieldErrors();

  const barangaySelect = document.getElementById('input-address-barangay');

  const data = {
    contact:                stripDigits(document.getElementById('input-contact').value),
    address_street:         document.getElementById('input-address-street').value.trim(),
    address_province:       selectedProvince ? selectedProvince.name : '',
    address_municipality:   selectedCity ? selectedCity.name : '',
    address_brgy:           barangaySelect.value ? (barangaySelect.selectedOptions[0]?.textContent || '') : '',
    zip_code:                stripDigits(document.getElementById('input-zip-code').value),
    emergency_contact_name:  document.getElementById('input-emergency-name').value.trim(),
    emergency_contact_phone: stripDigits(document.getElementById('input-emergency-contact').value),
  };

  const errors = validateAddressUpdate(data);
  if (errors.length > 0) {
    errors.forEach(({ field, message }) => showAddressFieldError(field, message));
    const firstField = document.getElementById(errors[0].field);
    if (firstField) firstField.focus();
    return;
  }

  const submitBtn = document.getElementById('btn-save-address');
  setButtonLoading(submitBtn, 'Saving…');

  try {
    const payload = {
      ...data,
      ...(geocodedLat != null ? { latitude: geocodedLat } : {}),
      ...(geocodedLon != null ? { longitude: geocodedLon } : {}),
    };

    const { res, body } = await updateVolunteerAddress(payload);

    if (!res.ok || !body.success) {
      showToast(body.message || 'Could not save your changes. Please try again.', 'error');
      return;
    }

    renderAddressView(body.data);
    showToast('Contact and address updated successfully.', 'success');
    setViewMode();
  } catch {
    showToast('An unexpected error occurred. Please try again.', 'error');
  } finally {
    restoreButton(submitBtn);
  }
}