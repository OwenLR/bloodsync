/**
 * modal.js — Modal dialog component for BloodSync web app.
 *
 * Responsibilities:
 * - openModal()    — open a modal with a title, body content, and action buttons
 * - closeModal()   — close the currently open modal
 * - confirmModal() — open a confirm/cancel dialog, returns a Promise<boolean>
 *
 * Does NOT:
 * - Fetch any data
 * - Know anything about business logic
 * - Submit forms directly
 *
 * Usage:
 *   import { openModal, closeModal, confirmModal } from '../components/modal.js';
 *
 *   // Informational modal
 *   openModal('Donor Details', contentElement);
 *
 *   // Confirm dialog
 *   const confirmed = await confirmModal('Cancel this blood drive?');
 *   if (confirmed) { ... }
 *
 * Requires <div id="modal-overlay"></div> in the HTML page,
 * or this file creates one automatically.
 */

const OVERLAY_ID = 'modal-overlay';

// Module-scope handler references — stored so closeModal can remove them cleanly.
// Without this, { once: true } on the backdrop only works if the user clicks the
// backdrop to close. If they use the close button or Escape instead, the listener
// is never consumed and stacks on the next openModal call.
let _backdropHandler = null;

// ---------------------------------------------------------------------------
// openModal(title, bodyContent, actions)
// ---------------------------------------------------------------------------

/**
 * Open a modal dialog.
 *
 * @param {string}      title       — modal heading text
 * @param {HTMLElement|string} body — content to display (element or HTML string)
 * @param {Array<{ label: string, onClick: function, className?: string }>} actions
 */
export function openModal(title, body, actions = []) {
  const overlay = getOrCreateOverlay();

  overlay.innerHTML = '';
  overlay.classList.add('modal-open');

  const dialog     = document.createElement('div');
  dialog.className = 'modal-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');

  // Header
  const header     = document.createElement('div');
  header.className = 'modal-header';

  const titleEl       = document.createElement('h2');
  titleEl.className   = 'modal-title';
  titleEl.textContent = title;

  const closeBtn       = document.createElement('button');
  closeBtn.className   = 'modal-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Close modal');
  closeBtn.addEventListener('click', closeModal);

  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  // Body
  const bodyEl     = document.createElement('div');
  bodyEl.className = 'modal-body';

  if (typeof body === 'string') {
    bodyEl.textContent = body;
  } else {
    bodyEl.appendChild(body);
  }

  // Footer
  const footer     = document.createElement('div');
  footer.className = 'modal-footer';

  actions.forEach(action => {
    const btn       = document.createElement('button');
    btn.className   = action.className || 'btn-secondary';
    btn.textContent = action.label;
    btn.addEventListener('click', action.onClick);
    footer.appendChild(btn);
  });

  dialog.appendChild(header);
  dialog.appendChild(bodyEl);
  if (actions.length) dialog.appendChild(footer);

  overlay.appendChild(dialog);

  // Close on overlay backdrop click — handler stored at module scope so
  // closeModal() can remove it explicitly regardless of how the modal was closed.
  if (_backdropHandler) overlay.removeEventListener('click', _backdropHandler);
  _backdropHandler = (e) => { if (e.target === overlay) closeModal(); };
  overlay.addEventListener('click', _backdropHandler);

  // Close on Escape key
  document.addEventListener('keydown', handleEscape, { once: true });
}

// ---------------------------------------------------------------------------
// closeModal()
// ---------------------------------------------------------------------------

export function closeModal() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) return;

  overlay.classList.remove('modal-open');
  overlay.innerHTML = '';
  document.removeEventListener('keydown', handleEscape);
  if (_backdropHandler) {
    overlay.removeEventListener('click', _backdropHandler);
    _backdropHandler = null;
  }
}

// ---------------------------------------------------------------------------
// confirmModal(message)
// Returns Promise<boolean> — true if confirmed, false if cancelled.
// ---------------------------------------------------------------------------

/**
 * @param {string}  message      — confirmation question
 * @param {string}  confirmLabel — confirm button label (default 'Confirm')
 * @param {string}  cancelLabel  — cancel button label (default 'Cancel')
 * @param {boolean} danger       — true styles the confirm button as btn-danger
 *                                 (destructive actions: dispose, reject, separate).
 *                                 false styles it as btn-primary (non-destructive
 *                                 confirmations: mark safe). Default true — matches
 *                                 every existing caller's prior behavior, so no
 *                                 caller breaks by omitting this param.
 * @returns {Promise<boolean>}
 */
export function confirmModal(
  message,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  danger       = true
) {
  return new Promise((resolve) => {
    const body       = document.createElement('p');
    body.textContent = message;

    openModal('Confirm Action', body, [
      {
        label:     cancelLabel,
        className: 'btn-secondary',
        onClick:   () => { closeModal(); resolve(false); },
      },
      {
        label:     confirmLabel,
        className: danger ? 'btn-danger' : 'btn-primary',
        onClick:   () => { closeModal(); resolve(true); },
      },
    ]);
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getOrCreateOverlay() {
  let overlay = document.getElementById(OVERLAY_ID);

  if (!overlay) {
    overlay           = document.createElement('div');
    overlay.id        = OVERLAY_ID;
    overlay.className = 'modal-overlay';
    document.body.appendChild(overlay);
  }

  return overlay;
}

function handleEscape(e) {
  if (e.key === 'Escape') closeModal();
}