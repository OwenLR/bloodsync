/**
 * bloodRequestValidation.js — client-side validation only.
 * No API calls, no DOM. Mirrors backend rules where relevant:
 * - File type/size mirrors uploadMiddleware.js (multer fileFilter + limits)
 * - request_form now required per bloodRequestValidator.js's
 *   validateRequestFormFile (added when this step was built)
 * - patient_age is now required server-side too (bloodRequestValidator.js) —
 *   the form collects birthdate and computes age client-side, since the
 *   backend column is patient_age (int), not a birthdate field. Birthdate
 *   itself is never sent or stored — only the computed age at submission time.
 */

const ALLOWED_FILE_TYPES  = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // mirrors uploadMiddleware.js limits.fileSize

/**
 * Computes whole-years age from a YYYY-MM-DD birthdate string, same
 * calendar-based method used elsewhere in the app for donor age (accounts
 * for whether the birthday has occurred yet this year, not just year diff).
 * @param {string} birthdateStr - YYYY-MM-DD
 * @returns {number}
 */
export function computeAgeFromBirthdate(birthdateStr) {
  const birthDate = new Date(`${birthdateStr}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * @param {object} fields
 * @param {object|null} fields.hospital        — selected hospital object or null
 * @param {string}      fields.patientName
 * @param {string}      fields.patientBirthdate — YYYY-MM-DD, from a <input type="date">
 * @param {string}      fields.urgencyLevel
 * @param {File|null}   fields.file
 * @returns {object} errors keyed by field name — empty object means valid
 */
export function validateSubmitForm({ hospital, patientName, patientBirthdate, urgencyLevel, file }) {
  const errors = {};

  if (!hospital) errors.hospital = 'Please select a hospital from the list.';

  if (!patientName || !patientName.trim()) {
    errors.patientName = 'Patient name is required.';
  }

  if (!patientBirthdate) {
    errors.patientBirthdate = 'Patient birthdate is required.';
  } else {
    const birthDate = new Date(`${patientBirthdate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(birthDate.getTime())) {
      errors.patientBirthdate = 'Please enter a valid date.';
    } else if (birthDate > today) {
      errors.patientBirthdate = 'Birthdate cannot be in the future.';
    }
  }

  if (!urgencyLevel) {
    errors.urgencyLevel = 'Please select an urgency level.';
  }

  if (!file) {
    errors.file = 'A request form document is required.';
  } else if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    errors.file = 'Only JPEG, PNG, or PDF files are allowed.';
  } else if (file.size > MAX_FILE_SIZE_BYTES) {
    errors.file = 'File must be 5MB or smaller.';
  }

  return errors;
}