/**
 * settingsValidation.js — Client-side validation for the Settings feature.
 *
 * Mirrors backend authValidator.js rules so errors surface before the round-trip.
 * Backend always validates too — this is a UX layer, not a security layer.
 *
 * No DOM, no API calls.
 */

/**
 * Validate the change-password form fields.
 *
 * @param {object} data
 * @param {string} data.currentPassword
 * @param {string} data.newPassword
 * @param {string} data.confirmPassword  — frontend-only confirmation field
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