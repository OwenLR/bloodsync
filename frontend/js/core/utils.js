/**
 * utils.js — Pure utility functions for BloodSync web app.
 *
 * Pure functions only — no DOM side effects, no API calls,
 * no imports from other core files.
 * Safe to import anywhere without circular dependencies.
 *
 * DOM feedback helpers (showError, showSuccess, clearFeedback)
 * live in components/feedback.js — not here.
 *
 * Responsibilities:
 * - Date/time formatting in Philippine Time (PHT)
 * - Blood type and component display helpers
 * - General purpose string helpers
 */

// ---------------------------------------------------------------------------
// Date / Time — Philippine Time (Asia/Manila, UTC+8)
// ---------------------------------------------------------------------------

/**
 * Format an ISO datetime string into a readable PHT date + time.
 * e.g. "2025-10-01T08:00:00Z" → "Oct 1, 2025, 4:00 PM"
 */
export function formatPHT(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date)) return '—';

  return date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year:     'numeric',
    month:    'short',
    day:      'numeric',
    hour:     'numeric',
    minute:   '2-digit',
    hour12:   true,
  });
}

/**
 * Format an ISO datetime string into a date-only PHT string.
 * e.g. "2025-10-01T08:00:00Z" → "Oct 1, 2025"
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
 * Returns the blood type as-is, or '—' for empty values.
 */
export function formatBloodType(bloodType) {
  return bloodType || '—';
}

/**
 * Shorten a component name for compact display in tables.
 * e.g. "Packed Red Blood Cells" → "PRBC"
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
// General purpose
// ---------------------------------------------------------------------------

/**
 * Capitalize the first letter of a string.
 * e.g. "pending" → "Pending"
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate a string to a max length, appending "..." if cut.
 * e.g. truncate("Hello World", 7) → "Hello W..."
 */
export function truncate(str, maxLength) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}