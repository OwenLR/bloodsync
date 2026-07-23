/**
 * fieldRegistrationValidation.js — Client-side validation for
 * Volunteer/Phlebotomist self-registration. Mirrors backend's
 * validateRegistration in registrationValidator.js for the fields the
 * backend itself checks — keep those in sync. Address fields, terms
 * acceptance are frontend-only concerns (backend doesn't validate
 * address format or terms — registrationService.js just passes
 * profileData straight through) so those rules live here only.
 *
 * CHANGED this session:
 * - Added nationality, education, occupation, emergency_contact_name —
 *   all optional, free text, light length-based sanity check only (same
 *   treatment as address_street). profileModel.js's createProfile()
 *   already accepted and inserted these columns; the form itself just
 *   never collected them. registrationValidator.js (backend) has no
 *   rule for any of the four, so this isn't mirroring anything there —
 *   same category as the existing address_street check.
 *
 * CHANGED previous session:
 * - Returns an array of { field, message } instead of plain strings, so
 *   fieldRegistrationUI.js can route each error to its own inline
 *   "-error" element instead of a single global error box.
 * - `field` values are the input element IDs (e.g. 'input-first-name'),
 *   not backend field names — fieldRegistrationUI.js appends '-error'
 *   directly to get the target element ID.
 * - Added address_province / address_municipality / address_brgy
 *   (required — dropdown-driven, so "valid" here just means "selected",
 *   no format validation needed) and address_street (optional, free
 *   text, light length-based sanity check only — backend has no rule
 *   for it, so this isn't mirroring anything, just basic sanity).
 * - Added terms acceptance (required checkbox).
 *
 * File constraints (file size/type) confirmed against uploadMiddleware.js.
 * ALLOWED_FILE_TYPES intentionally omits backend's 'image/jpg' entry —
 * browsers always send 'image/jpeg' as the MIME type for .jpg files
 * regardless of extension. 5MB limit matches multer's limits.fileSize.
 *
 * profile_img / id_number: Volunteer registration no longer collects a
 * document at all (removed from the DOM this session, not just optional)
 * — validateFieldRegistrationForm no longer checks profile_img for
 * 'volunteer'. Phlebotomist keeps the required-document rule.
 * id_number (Government/National ID) stays removed — profileModel.js's
 * createProfile() forces id_number to null regardless.
 *
 * Path: frontend/js/features/registration/fieldRegistrationValidation.js
 */

const VALID_SEX = ['Male', 'Female'];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

// role: 'volunteer' | 'phlebotomist'
// data field keys are backend field names (first_name, address_brgy, etc.);
// fieldIds maps each to its DOM input id, so returned errors can target
// the right inline "-error" element.
const FIELD_IDS = {
  first_name:              'input-first-name',
  last_name:               'input-last-name',
  email:                   'input-email',
  password:                'input-password',
  confirm_password:        'input-confirm-password',
  sex:                     'input-sex',
  contact:                 'input-contact',
  birthdate:               'input-birthdate',
  address_street:          'input-address-street',
  address_province:        'input-address-province',
  address_municipality:    'input-address-city',
  address_brgy:            'input-address-barangay',
  zip_code:                'input-zip-code',
  nationality:             'input-nationality',
  education:               'input-education',
  occupation:              'input-occupation',
  emergency_contact_name:  'input-emergency-name',
  emergency_contact_phone: 'input-emergency-contact',
  profile_img:             'input-profile-img',
  terms:                   'input-terms',
};

export function validateFieldRegistrationForm(data, confirmPassword, role) {
  const errors = [];
  const push = (field, message) => errors.push({ field: FIELD_IDS[field], message });

  const {
    first_name, last_name, email, password,
    sex, contact, birthdate,
    address_street, address_province, address_municipality, address_brgy,
    zip_code,
    nationality, education, occupation,
    emergency_contact_name, emergency_contact_phone,
    profile_img,
    terms_accepted,
  } = data;

  if (!first_name || first_name.trim() === '') push('first_name', 'First name is required.');
  if (!last_name || last_name.trim() === '')   push('last_name', 'Last name is required.');

  if (!email || email.trim() === '') {
    push('email', 'Email is required.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    push('email', 'Enter a valid email address.');
  }

  if (!password) {
    push('password', 'Password is required.');
  } else if (password.length < 8) {
    push('password', 'Password must be at least 8 characters.');
  }

  if (password && password !== confirmPassword) {
    push('confirm_password', 'Passwords do not match.');
  }

  if (sex && !VALID_SEX.includes(sex)) {
    push('sex', 'Sex must be Male or Female.');
  }

  if (contact && !/^\d{7,15}$/.test(contact)) {
    push('contact', 'Contact number must be 7 to 15 digits.');
  }

  if (birthdate) {
    const date = new Date(birthdate);
    if (isNaN(date.getTime())) {
      push('birthdate', 'Birthdate is invalid.');
    } else if (date > new Date()) {
      push('birthdate', 'Birthdate cannot be in the future.');
    }
  }

  // Address — province/city/barangay are dropdown-driven and required so
  // the geocode step (fieldGeocodeApi.js) always has something to work
  // with. Street stays free text and optional, per product decision.
  if (!address_province) push('address_province', 'Province is required.');
  if (!address_municipality) push('address_municipality', 'City/Municipality is required.');
  if (!address_brgy) push('address_brgy', 'Barangay is required.');
  if (address_street && address_street.trim().length > 200) {
    push('address_street', 'Street address is too long.');
  }

  if (zip_code && !/^\d{4,10}$/.test(zip_code)) {
    push('zip_code', 'ZIP code must be 4 to 10 digits.');
  }

  // Optional, free text — same light length-based sanity check as
  // address_street. Backend has no format rule for any of these three.
  if (nationality && nationality.trim().length > 100) {
    push('nationality', 'Nationality is too long.');
  }
  if (education && education.trim().length > 150) {
    push('education', 'Education is too long.');
  }
  if (occupation && occupation.trim().length > 150) {
    push('occupation', 'Occupation is too long.');
  }
  if (emergency_contact_name && emergency_contact_name.trim().length > 150) {
    push('emergency_contact_name', 'Emergency contact name is too long.');
  }

  if (emergency_contact_phone && !/^\d{7,15}$/.test(emergency_contact_phone)) {
    push('emergency_contact_phone', 'Emergency contact phone must be 7 to 15 digits.');
  }

  if (role === 'phlebotomist' && !profile_img) {
    push('profile_img', 'A license/certification document is required for Phlebotomist registration.');
  }

  if (profile_img) {
    if (!ALLOWED_FILE_TYPES.includes(profile_img.type)) {
      push('profile_img', 'Document must be a JPEG, PNG, or PDF file.');
    } else if (profile_img.size > MAX_FILE_SIZE_BYTES) {
      push('profile_img', 'Document must be 5MB or smaller.');
    }
  }

  if (!terms_accepted) {
    push('terms', 'You must agree to the Terms and Conditions to register.');
  }

  return errors;
}

export function stripNonDigits(value) {
  return (value || '').replace(/\D/g, '');
}