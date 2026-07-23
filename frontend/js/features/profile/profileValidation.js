/**
 * profileValidation.js — Client-side validation for the Profile feature.
 *
 * Mirrors backend authValidator.js / uploadMiddleware.js rules so errors
 * surface before the round-trip. Backend always validates too — this is
 * a UX layer, not a security layer.
 *
 * No DOM, no API calls.
 * Migrated from features/settings/settingsValidation.js.
 */

/**
 * Validate the change-password form fields.
 *
 * @param {object} data
 * @param {string} data.currentPassword
 * @param {string} data.newPassword
 * @param {string} data.confirmPassword — frontend-only confirmation field
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateChangePassword({ currentPassword, newPassword, confirmPassword }) {
  const errors = {};

  if (!currentPassword) {
    errors.currentPassword = 'Current password is required.';
  }

  if (!newPassword) {
    errors.newPassword = 'New password is required.';
  } else if (newPassword.length < 8) {
    errors.newPassword = 'New password must be at least 8 characters.';
  } else if (newPassword === currentPassword) {
    errors.newPassword = 'New password must be different from your current password.';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your new password.';
  } else if (newPassword && confirmPassword !== newPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validate a profile photo file before upload.
 * Matches uploadMiddleware.js's fileFilter + 5MB limit exactly.
 *
 * @param {File|null} file
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateProfilePhoto(file) {
  if (!file) {
    return { valid: false, error: 'Please select a file to upload.' };
  }

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and PDF files are allowed.' };
  }

  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: 'File must be 5MB or smaller.' };
  }

  return { valid: true, error: null };
}

/**
 * Validate the Volunteer/Phlebotomist address/contact edit form.
 * Mirrors fieldRegistrationValidation.js's address rules — province,
 * city/municipality, and barangay stay required for UX consistency with
 * registration, even though registrationValidator.js (backend) doesn't
 * technically enforce them. Street stays optional, light length check
 * only. Returns [{ field, message }] — field values are DOM input IDs,
 * same convention as fieldRegistrationValidation.js, so the caller can
 * route each error to its own inline "-error" element.
 */
export function validateAddressUpdate(data) {
  const errors = [];
  const push = (field, message) => errors.push({ field, message });

  const {
    contact, address_street, address_province, address_municipality,
    address_brgy, zip_code, emergency_contact_phone,
  } = data;

  if (contact && !/^\d{7,15}$/.test(contact)) {
    push('input-contact', 'Contact number must be 7 to 15 digits.');
  }

  if (!address_province) push('input-address-province', 'Province is required.');
  if (!address_municipality) push('input-address-city', 'City/Municipality is required.');
  if (!address_brgy) push('input-address-barangay', 'Barangay is required.');
  if (address_street && address_street.trim().length > 200) {
    push('input-address-street', 'Street address is too long.');
  }

  if (zip_code && !/^\d{4,10}$/.test(zip_code)) {
    push('input-zip-code', 'ZIP code must be 4 to 10 digits.');
  }

  if (emergency_contact_phone && !/^\d{7,15}$/.test(emergency_contact_phone)) {
    push('input-emergency-contact', 'Emergency contact phone must be 7 to 15 digits.');
  }

  return errors;
}