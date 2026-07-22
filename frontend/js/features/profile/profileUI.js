/**
 * profileUI.js — DOM rendering and event handlers shared across Admin /
 * PRC Staff / Requestor Profile pages.
 *
 * Responsibilities:
 *   - renderIdentity()        — read-only identity block (all 3 roles)
 *   - initPasswordForm()      — password change, identical for all 5 roles
 *   - initStaffPhotoForm()    — profile photo upload, PRC Staff only
 *
 * Does NOT call apiFetch directly — uses profileApi.js.
 * Does NOT own business logic — delegates to profileValidation.js.
 *
 * Migrated from features/settings/settingsUI.js.
 */

import { changePassword, updateStaffPhoto } from './profileApi.js';
import { validateChangePassword, validateProfilePhoto } from './profileValidation.js';
import { showToast } from '../../components/toast.js';

// ---------------------------------------------------------------------------
// Identity block — Admin / PRC Staff / Requestor
// ---------------------------------------------------------------------------

/**
 * Fill the read-only identity block on the Profile page.
 * Expects #profile-name and #profile-email to exist in the page's HTML.
 * Optional, only filled if present:
 *   #profile-role-label — plain role name (Admin / PRC Staff / Requestor)
 *   #profile-branch     — PRC Staff only, from user.branch_name
 *   #profile-avatar-wrap / #profile-avatar / #profile-avatar-placeholder
 *                        — PRC Staff only, current photo or initials
 *
 * @param {object} user      — from requireAuth() (GET /api/auth/me shape)
 * @param {string} roleLabel — e.g. 'Admin', 'PRC Staff', 'Requestor'
 */
export function renderIdentity(user, roleLabel) {
  setText('profile-name', buildDisplayName(user));
  setText('profile-email', user.email || '—');
  setText('profile-role-label', roleLabel);

  const branchEl = document.getElementById('profile-branch');
  if (branchEl) {
    setText('profile-branch', user.branch_name || '—');
  }

  renderAvatar(user);
}

function renderAvatar(user) {
  const img         = document.getElementById('profile-avatar');
  const placeholder = document.getElementById('profile-avatar-placeholder');
  if (!img && !placeholder) return; // page doesn't have an avatar block (Admin/Requestor)

  const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
  const isImage = user.profile_img && IMAGE_EXTENSIONS.some(ext => user.profile_img.toLowerCase().includes(ext));

  if (isImage) {
    if (img) {
      img.src = user.profile_img;
      img.classList.remove('field-error-hidden');
    }
    if (placeholder) placeholder.classList.add('field-error-hidden');
  } else {
    if (img) img.classList.add('field-error-hidden');
    if (placeholder) {
      placeholder.textContent = initials(user.first_name, user.last_name);
      placeholder.classList.remove('field-error-hidden');
    }
  }
}

function initials(firstName, lastName) {
  const a = (firstName || '').charAt(0);
  const b = (lastName || '').charAt(0);
  return (a + b).toUpperCase() || '?';
}

function buildDisplayName(user) {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.email || 'User';
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ---------------------------------------------------------------------------
// Password change section — identical for all 5 roles
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

export function initPasswordForm() {
  const form         = document.getElementById('password-form');
  const currentInput = document.getElementById('current-password');
  const newInput     = document.getElementById('new-password');
  const confirmInput = document.getElementById('confirm-password');
  const submitBtn    = document.getElementById('btn-change-password');

  if (!form) return;

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

    } catch {
      setFieldError('error-password-form', 'An unexpected error occurred. Please try again or contact support if the problem persists.');
    } finally {
      restoreButton(submitBtn);
    }
  });
}

// ---------------------------------------------------------------------------
// Profile photo section — PRC Staff only
// ---------------------------------------------------------------------------

export function initStaffPhotoForm() {
  const form        = document.getElementById('photo-form');
  const fileInput   = document.getElementById('profile-img-input');
  const preview     = document.getElementById('photo-preview');
  const previewWrap = document.getElementById('photo-preview-wrap');
  const submitBtn   = document.getElementById('btn-upload-photo');
  const errorEl     = document.getElementById('error-photo-form');

  if (!form) return;

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    errorEl.textContent = '';
    errorEl.classList.add('field-error-hidden');

    if (!file) {
      previewWrap.classList.add('photo-preview-hidden');
      return;
    }

    const { valid, error } = validateProfilePhoto(file);
    if (!valid) {
      errorEl.textContent = error;
      errorEl.classList.remove('field-error-hidden');
      fileInput.value = '';
      previewWrap.classList.add('photo-preview-hidden');
      return;
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        preview.src = ev.target.result;
        previewWrap.classList.remove('photo-preview-hidden');
      };
      reader.readAsDataURL(file);
    } else {
      preview.removeAttribute('src');
      previewWrap.classList.remove('photo-preview-hidden');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = fileInput.files[0];
    errorEl.textContent = '';
    errorEl.classList.add('field-error-hidden');

    const { valid, error } = validateProfilePhoto(file ?? null);
    if (!valid) {
      errorEl.textContent = error;
      errorEl.classList.remove('field-error-hidden');
      return;
    }

    setButtonLoading(submitBtn, 'Uploading…');

    try {
      const { res, body } = await updateStaffPhoto(file);

      if (!res.ok || !body.success) {
        const msg = res.status === 500
          ? 'An unexpected error occurred. Please try again or contact support if the problem persists.'
          : (body.message || 'Photo could not be uploaded. Please try again.');
        errorEl.textContent = msg;
        errorEl.classList.remove('field-error-hidden');
        return;
      }

      // Reflect the new photo immediately in the identity block's avatar,
      // without a full page reload — body.data is { profile_id, user_id,
      // profile_img } per contract.md.
      const img         = document.getElementById('profile-avatar');
      const placeholder = document.getElementById('profile-avatar-placeholder');
      if (img && body.data?.profile_img) {
        img.src = body.data.profile_img;
        img.classList.remove('field-error-hidden');
        if (placeholder) placeholder.classList.add('field-error-hidden');
      }

      showToast('Profile photo updated successfully.', 'success');
      form.reset();
      previewWrap.classList.add('photo-preview-hidden');

    } catch {
      errorEl.textContent = 'An unexpected error occurred. Please try again or contact support if the problem persists.';
      errorEl.classList.remove('field-error-hidden');
    } finally {
      restoreButton(submitBtn);
    }
  });
}