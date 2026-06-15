/**
 * toast.js — Toast notification component for BloodSync web app.
 *
 * Responsibilities:
 * - showToast()  — display a dismissable toast message
 * - Auto-dismiss after a configurable duration
 * - Stack multiple toasts without overlap
 *
 * Does NOT:
 * - Fetch any data
 * - Know anything about business logic
 *
 * Usage:
 *   import { showToast } from '../components/toast.js';
 *   showToast('Donor registered successfully.', 'success');
 *   showToast('Failed to load data.', 'error');
 *   showToast('Drive has been cancelled.', 'warning');
 *
 * Requires a <div id="toast-container"></div> in the HTML page,
 * or this file will create one automatically.
 *
 * Types: 'success' | 'error' | 'warning' | 'info'
 */

const DURATION_MS   = 4000;
const CONTAINER_ID  = 'toast-container';

// ---------------------------------------------------------------------------
// showToast(message, type, duration)
// ---------------------------------------------------------------------------

/**
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration — ms before auto-dismiss (default 4000)
 */
export function showToast(message, type = 'info', duration = DURATION_MS) {
  const container = getOrCreateContainer();

  const toast       = document.createElement('div');
  toast.className   = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');

  const text       = document.createElement('span');
  text.className   = 'toast-message';
  text.textContent = message;

  const closeBtn       = document.createElement('button');
  closeBtn.className   = 'toast-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Dismiss');
  closeBtn.addEventListener('click', () => dismissToast(toast));

  toast.appendChild(text);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  // Auto-dismiss
  setTimeout(() => dismissToast(toast), duration);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function dismissToast(toast) {
  if (!toast.parentNode) return;
  toast.classList.add('toast-hiding');

  // Remove after CSS transition completes
  toast.addEventListener('animationend', () => toast.remove(), { once: true });

  // Fallback removal if animationend never fires
  setTimeout(() => toast.remove(), 400);
}

function getOrCreateContainer() {
  let container = document.getElementById(CONTAINER_ID);

  if (!container) {
    container           = document.createElement('div');
    container.id        = CONTAINER_ID;
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  return container;
}