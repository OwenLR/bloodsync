/**
 * feedback.js — DOM feedback helpers for BloodSync web app.
 *
 * Responsibilities:
 * - showError()     — display an error message in a target element
 * - showSuccess()   — display a success message in a target element
 * - clearFeedback() — hide and clear a feedback element
 *
 * These are intentionally simple — they target a single element by ID
 * and set its text. For richer feedback (dismissable banners, auto-hide),
 * use components/toast.js instead.
 *
 * JS targets IDs — CSS targets classes.
 * The element must exist in the DOM before calling these functions.
 */

/**
 * Display an error message inside a target element.
 *
 * @param {string} elementId - ID of the error container element
 * @param {string} message
 */
export function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent    = message;
  el.style.display  = 'block';
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

  el.textContent    = message;
  el.style.display  = 'block';
}

/**
 * Clear and hide a feedback element.
 *
 * @param {string} elementId
 */
export function clearFeedback(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent    = '';
  el.style.display  = 'none';
}