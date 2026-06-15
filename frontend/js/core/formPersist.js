/**
 * formPersist.js — Form data persistence utility for BloodSync web app.
 *
 * Responsibilities:
 * - saveForm()    — save all form field values to sessionStorage
 * - restoreForm() — restore saved values back into form fields
 * - clearForm()   — remove saved form data from sessionStorage
 *
 * Lives in core/ — not components/ — because it has no DOM rendering
 * responsibility. It is a client-state persistence utility, the same
 * category as auth.js (in-memory session state) but for form drafts
 * (sessionStorage-backed).
 *
 * Prevents data loss when a form submission fails — the user's input
 * is preserved so they don't have to retype a long form.
 *
 * Uses sessionStorage — data survives page reload within the same tab
 * but is cleared when the tab is closed. Never persists sensitive data
 * beyond the session.
 *
 * Does NOT:
 * - Submit forms
 * - Validate inputs
 * - Know anything about business logic
 *
 * Usage:
 *   import { saveForm, restoreForm, clearForm } from '../../core/formPersist.js';
 *   // from an entry file: import { ... } from '../core/formPersist.js';
 *
 *   // On page load — restore any previously saved data
 *   restoreForm('donor-form', 'draft:donor-form');
 *
 *   // On input change — auto-save
 *   document.getElementById('donor-form').addEventListener('input', () => {
 *     saveForm('donor-form', 'draft:donor-form');
 *   });
 *
 *   // On successful submit — clear saved data
 *   clearForm('draft:donor-form');
 *
 * Supported field types: text, email, tel, number, date, textarea, select
 * Not supported: file inputs (cannot persist FileList objects)
 */

// ---------------------------------------------------------------------------
// saveForm(formId, storageKey)
// ---------------------------------------------------------------------------

/**
 * Save all form field values to sessionStorage.
 *
 * @param {string} formId      — ID of the <form> element
 * @param {string} storageKey  — sessionStorage key to save under
 */
export function saveForm(formId, storageKey) {
  const form = document.getElementById(formId);
  if (!form) return;

  const data = {};

  const fields = form.querySelectorAll('input, textarea, select');
  fields.forEach(field => {
    if (!field.name || field.type === 'file') return;
    data[field.name] = field.value;
  });

  try {
    sessionStorage.setItem(storageKey, JSON.stringify(data));
  } catch {
    // sessionStorage quota exceeded — fail silently
  }
}

// ---------------------------------------------------------------------------
// restoreForm(formId, storageKey)
// ---------------------------------------------------------------------------

/**
 * Restore saved form field values from sessionStorage.
 *
 * @param {string} formId
 * @param {string} storageKey
 */
export function restoreForm(formId, storageKey) {
  const form = document.getElementById(formId);
  if (!form) return;

  let data;

  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return;
    data = JSON.parse(raw);
  } catch {
    return;
  }

  const fields = form.querySelectorAll('input, textarea, select');
  fields.forEach(field => {
    if (!field.name || field.type === 'file') return;
    if (data[field.name] !== undefined) {
      field.value = data[field.name];
    }
  });
}

// ---------------------------------------------------------------------------
// clearForm(storageKey)
// ---------------------------------------------------------------------------

/**
 * Remove saved form data from sessionStorage.
 * Call after a successful submission.
 *
 * @param {string} storageKey
 */
export function clearForm(storageKey) {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // fail silently
  }
}