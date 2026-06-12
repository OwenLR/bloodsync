/**
 * utils.js — Shared utility functions for BloodSync web app.
 *
 * Pure functions only — no API calls, no DOM side effects, no imports
 * from other core files. Safe to import anywhere without circular dependencies.
 *
 * Responsibilities:
 * - Date/time formatting in Philippine Time (PHT)
 * - Blood type and component display helpers
 * - DOM feedback helpers (showError, showSuccess, clearFeedback)
 * - General purpose helpers (capitalize, truncate)
 */

// ---------------------------------------------------------------------------
// Date / Time — Philippine Time (Asia/Manila, UTC+8)
// ---------------------------------------------------------------------------

/**
 * Format an ISO datetime string into a readable PHT date + time.
 * e.g. "2025-10-01T08:00:00Z" → "Oct 1, 2025, 4:00 PM"
 *
 * @param {string|Date} value - ISO string or Date object
 * @returns {string}
 */
export function formatPHT(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (isNaN(date)) return '—';

  return date.toLocaleString('en-PH', {
    timeZone:    'Asia/Manila',
    year:        'numeric',
    month:       'short',
    day:         'numeric',
    hour:        'numeric',
    minute:      '2-digit',
    hour12:      true,
  });
}

/**
 * Format an ISO datetime string into a date-only PHT string.
 * e.g. "2025-10-01T08:00:00Z" → "Oct 1, 2025"
 *
 * @param {string|Date} value
 * @returns {string}
 */
export function formatDatePHT(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (isNaN(date)) return '—';

  return date.toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    year:     'numeric',
    month:    'short',
    day:      'numeric',
  });
}

/**
 * Format an ISO datetime string into a time-only PHT string.
 * e.g. "2025-10-01T08:00:00Z" → "4:00 PM"
 *
 * @param {string|Date} value
 * @returns {string}
 */
export function formatTimePHT(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (isNaN(date)) return '—';

  return date.toLocaleTimeString('en-PH', {
    timeZone: 'Asia/Manila',
    hour:     'numeric',
    minute:   '2-digit',
    hour12:   true,
  });
}

// ---------------------------------------------------------------------------
// Blood type / component display
// ---------------------------------------------------------------------------

/**
 * Format a blood type for display — returns as-is since values are already
 * display-ready (e.g. "O+", "AB-"). Returns '—' for empty values.
 *
 * @param {string} bloodType
 * @returns {string}
 */
export function formatBloodType(bloodType) {
  return bloodType || '—';
}

/**
 * Shorten a component name for compact display in tables.
 * e.g. "Packed Red Blood Cells" → "PRBC"
 *      "Fresh Frozen Plasma"    → "FFP"
 *      "Whole Blood"            → "Whole Blood"
 *      "Platelets"              → "Platelets"
 *
 * @param {string} component
 * @returns {string}
 */
export function abbreviateComponent(component) {
  const map = {
    'Packed Red Blood Cells': 'PRBC',
    'Fresh Frozen Plasma':    'FFP',
    'Whole Blood':            'Whole Blood',
    'Platelets':              'Platelets',
  };

  return map[component] || component || '—';
}

// ---------------------------------------------------------------------------
// DOM feedback helpers
// ---------------------------------------------------------------------------

/**
 * Display an error message inside a target element.
 * The element is shown; its text is set to the message.
 *
 * @param {string} elementId - ID of the error container element
 * @param {string} message
 */
export function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent = message;
  el.style.display = 'block';
}

/**
 * Display a success message inside a target element.
 *
 * @param {string} elementId - ID of the success container element
 * @param {string} message
 */
export function showSuccess(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent = message;
  el.style.display = 'block';
}

/**
 * Clear and hide a feedback element.
 *
 * @param {string} elementId
 */
export function clearFeedback(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent = '';
  el.style.display = 'none';
}

// ---------------------------------------------------------------------------
// General purpose
// ---------------------------------------------------------------------------

/**
 * Capitalize the first letter of a string.
 * e.g. "pending" → "Pending"
 *
 * @param {string} str
 * @returns {string}
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate a string to a max length, appending "..." if cut.
 * e.g. truncate("Hello World", 7) → "Hello W..."
 *
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}