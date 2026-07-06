/**
 * bloodRequestValidation.js — client-side validation only.
 * No API calls, no DOM. Mirrors backend rules where relevant:
 * - File type/size mirrors uploadMiddleware.js (multer fileFilter + limits)
 * - request_form now required per bloodRequestValidator.js's
 *   validateRequestFormFile (added when this step was built)
 */

const ALLOWED_FILE_TYPES  = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // mirrors uploadMiddleware.js limits.fileSize

/**
 * @param {object} fields
 * @param {object|null} fields.hospital      — selected hospital object or null
 * @param {string}      fields.patientName
 * @param {string}      fields.urgencyLevel
 * @param {File|null}   fields.file
 * @returns {object} errors keyed by field name — empty object means valid
 */
export function validateSubmitForm({ hospital, patientName, urgencyLevel, file }) {
  const errors = {};

  if (!hospital) errors.hospital = 'Please select a hospital from the list.';

  if (!patientName || !patientName.trim()) {
    errors.patientName = 'Patient name is required.';
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