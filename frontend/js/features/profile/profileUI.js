/**
 * profileUI.js — Shared across Admin / PRC Staff / Requestor Profile
 * pages, plus two pieces reused by profileFieldUI.js (Vol/Phleb):
 * initAvatarUpload() and renderAvatar().
 *
 * Redesigned this session: identity block is now a profile header
 * (large avatar, name, role/branch badges) instead of a plain label/
 * value list. Profile photo upload moved onto a pencil-icon button
 * overlaid on the avatar (click -> pick file -> uploads immediately) —
 * no separate upload form/button. Password change is collapsed behind
 * an Edit affordance (components/editToggle.js) so the page reads as a
 * profile on display, not a form that's permanently open.
 *
 * Also added this session: show/hide toggle on each password input in
 * the edit form ([data-toggle-password] buttons), and a labeled masked
 * row ("Current Password" + dots) in the view state instead of a bare
 * <p>.
 */

import { changePassword, updateStaffPhoto } from './profileApi.js';
import { validateChangePassword, validateProfilePhoto } from './profileValidation.js';
import { showToast } from '../../components/toast.js';
import { initEditToggle } from '../../components/editToggle.js';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

// ---------------------------------------------------------------------------
// Identity header — Admin / PRC Staff / Requestor
// ---------------------------------------------------------------------------

export function renderIdentity(user, roleLabel) {
  setText('profile-name', buildDisplayName(user));
  setText('profile-email', user.email || '—');
  setText('profile-role-label', roleLabel);

  const branchEl = document.getElementById('profile-branch');
  if (branchEl) setText('profile-branch', user.branch_name || '—');

  renderAvatar(user);
}

/**
 * Renders the avatar from any object with { profile_img, first_name,
 * last_name } — used for the initial identity render (user object) and
 * again after a successful upload (API response's saved row), so the
 * same rendering logic always drives what's on screen.
 */
export function renderAvatar(source) {
  const img         = document.getElementById('profile-avatar');
  const placeholder = document.getElementById('profile-avatar-placeholder');
  const docLink      = document.getElementById('profile-avatar-doc-link');
  if (!img && !placeholder) return;

  const isImage = source.profile_img && IMAGE_EXTENSIONS.some(ext => source.profile_img.toLowerCase().includes(ext));

  if (isImage) {
    if (img) { img.src = source.profile_img; img.classList.remove('hidden'); }
    if (placeholder) placeholder.classList.add('hidden');
    if (docLink) docLink.classList.add('hidden');
  } else if (source.profile_img) {
    // Non-image document on file (PDF) — no thumbnail, show a link instead.
    if (img) img.classList.add('hidden');
    if (placeholder) {
      placeholder.textContent = '\u{1F4C4}'; // document glyph
      placeholder.classList.remove('hidden');
    }
    if (docLink) {
      docLink.href = source.profile_img;
      docLink.classList.remove('hidden');
    }
  } else {
    if (img) img.classList.add('hidden');
    if (docLink) docLink.classList.add('hidden');
    if (placeholder) {
      placeholder.textContent = initials(source.first_name, source.last_name);
      placeholder.classList.remove('hidden');
    }
  }
}

function initials(firstName, lastName) {
  const a = (firstName || '').charAt(0);
  const b = (lastName || '').charAt(0);
  return (a + b).toUpperCase() || '?';
}

function buildDisplayName(user) {
  if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
  return user.email || 'User';
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ---------------------------------------------------------------------------
// Avatar upload — pencil button overlaid on the avatar. Shared by PRC
// Staff (this file) and Volunteer/Phlebotomist (profileFieldUI.js
// imports initAvatarUpload directly). Selecting a file uploads
// immediately — no separate "Upload" button.
// ---------------------------------------------------------------------------

export function initAvatarUpload(uploadFn) {
  const trigger     = document.getElementById('profile-avatar-edit-btn');
  const fileInput   = document.getElementById('profile-img-input');
  const spinner     = document.getElementById('profile-avatar-spinner');
  const errorEl     = document.getElementById('error-photo-form');
  const img         = document.getElementById('profile-avatar');
  const placeholder = document.getElementById('profile-avatar-placeholder');

  if (!trigger || !fileInput) return;

  trigger.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('field-error-hidden'); }
    if (!file) return;

    const { valid, error } = validateProfilePhoto(file);
    if (!valid) {
      if (errorEl) { errorEl.textContent = error; errorEl.classList.remove('field-error-hidden'); }
      fileInput.value = '';
      return;
    }

    // Instant local preview for images so the change feels immediate.
    if (file.type.startsWith('image/') && img) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        img.src = ev.target.result;
        img.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');
      };
      reader.readAsDataURL(file);
    }

    spinner?.classList.remove('hidden');
    trigger.disabled = true;

    try {
      const { res, body } = await uploadFn(file);

      if (!res.ok || !body.success) {
        const msg = res.status === 500
          ? 'An unexpected error occurred. Please try again or contact support if the problem persists.'
          : (body.message || 'Photo could not be uploaded. Please try again.');
        if (errorEl) { errorEl.textContent = msg; errorEl.classList.remove('field-error-hidden'); }
        return;
      }

      // Re-render from the server's saved value — covers the PDF case,
      // which doesn't get the instant <img> preview above.
      if (body.data) renderAvatar(body.data);
      showToast('Photo updated successfully.', 'success');

    } catch {
      if (errorEl) {
        errorEl.textContent = 'An unexpected error occurred. Please try again or contact support if the problem persists.';
        errorEl.classList.remove('field-error-hidden');
      }
    } finally {
      spinner?.classList.add('hidden');
      trigger.disabled = false;
      fileInput.value = '';
    }
  });
}

/** Convenience wrapper for PRC Staff's photo endpoint. */
export function initStaffAvatarUpload() {
  initAvatarUpload(updateStaffPhoto);
}

// ---------------------------------------------------------------------------
// Password card — identical fields/endpoint for all 5 roles. Collapsed
// behind an Edit trigger (components/editToggle.js).
// ---------------------------------------------------------------------------

function setFieldError(fieldId, message) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('field-error-hidden');
}

function clearFieldError(fieldId) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.textContent = '';
  el.classList.add('field-error-hidden');
}

function clearAllPasswordErrors() {
  clearFieldError('error-current-password');
  clearFieldError('error-new-password');
  clearFieldError('error-confirm-password');
  clearFieldError('error-password-form');
}

function setButtonLoading(btn, loadingText) {
  btn.disabled = true;
  btn.dataset.originalText = btn.textContent;
  btn.textContent = loadingText;
}

function restoreButton(btn) {
  btn.disabled = false;
  btn.textContent = btn.dataset.originalText || 'Save';
}

// ---------------------------------------------------------------------------
// Password field show/hide toggles — [data-toggle-password="<input-id>"]
// buttons, each holding an .icon-eye + .icon-eye-off SVG pair already in
// the static HTML. Purely flips input.type and swaps which icon shows —
// no innerHTML, no data from the API involved.
// ---------------------------------------------------------------------------

function initPasswordVisibilityToggles() {
  document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
    const input = document.getElementById(btn.dataset.togglePassword);
    if (!input) return;

    const eyeIcon    = btn.querySelector('.icon-eye');
    const eyeOffIcon = btn.querySelector('.icon-eye-off');

    btn.addEventListener('click', () => {
      const nowShowing = input.type === 'password';
      input.type = nowShowing ? 'text' : 'password';
      eyeIcon?.classList.toggle('hidden', nowShowing);
      eyeOffIcon?.classList.toggle('hidden', !nowShowing);
      btn.setAttribute('aria-label', nowShowing ? 'Hide password' : 'Show password');
    });
  });
}

export function initPasswordForm() {
  const form         = document.getElementById('password-form');
  const currentInput = document.getElementById('current-password');
  const newInput     = document.getElementById('new-password');
  const confirmInput = document.getElementById('confirm-password');
  const submitBtn    = document.getElementById('btn-change-password');

  if (!form) return;

  initPasswordVisibilityToggles();

  const { setViewMode } = initEditToggle('password-card');

  currentInput.addEventListener('input', () => clearFieldError('error-current-password'));
  newInput.addEventListener('input',     () => clearFieldError('error-new-password'));
  confirmInput.addEventListener('input', () => clearFieldError('error-confirm-password'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllPasswordErrors();

    const currentPassword = currentInput.value;
    const newPassword     = newInput.value;
    const confirmPassword = confirmInput.value;

    const { valid, errors } = validateChangePassword({ currentPassword, newPassword, confirmPassword });

    if (!valid) {
      if (errors.currentPassword) setFieldError('error-current-password', errors.currentPassword);
      if (errors.newPassword)     setFieldError('error-new-password',     errors.newPassword);
      if (errors.confirmPassword) setFieldError('error-confirm-password', errors.confirmPassword);
      return;
    }

    setButtonLoading(submitBtn, 'Saving…');

    try {
      const { res, body } = await changePassword(currentPassword, newPassword);

      if (!res.ok || !body.success) {
        const msg = body.message || 'Password could not be changed. Please try again.';
        if (res.status === 400 && msg.toLowerCase().includes('current')) {
          setFieldError('error-current-password', 'Current password is incorrect.');
        } else {
          setFieldError('error-password-form', msg);
        }
        return;
      }

      form.reset();
      showToast('Password updated successfully.', 'success');
      setViewMode();

    } catch {
      setFieldError('error-password-form', 'An unexpected error occurred. Please try again or contact support if the problem persists.');
    } finally {
      restoreButton(submitBtn);
    }
  });
}