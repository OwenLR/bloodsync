/**
 * settingsUI.js — DOM rendering and event handlers for the Settings feature.
 *
 * Responsibilities:
 *   - Render the settings page sections (password form, photo form)
 *   - Handle form submissions and button states
 *   - Show inline errors and success feedback
 *
 * Does NOT call apiFetch directly — uses settingsApi.js.
 * Does NOT own business logic — delegates to settingsValidation.js.
 */

import { changePassword, updateProfilePhoto } from './settingsApi.js';
import { validateChangePassword, validateProfilePhoto } from './settingsValidation.js';
import { showToast } from '../../components/toast.js';

// ---------------------------------------------------------------------------
// Helpers
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
// Password change section
// ---------------------------------------------------------------------------

export function initPasswordForm() {
  const form            = document.getElementById('password-form');
  const currentInput    = document.getElementById('current-password');
  const newInput        = document.getElementById('new-password');
  const confirmInput    = document.getElementById('confirm-password');
  const submitBtn       = document.getElementById('btn-change-password');

  if (!form) return;

  // Clear field errors on input so feedback is immediate
  currentInput.addEventListener('input', () => clearFieldError('error-current-password'));
  newInput.addEventListener('input',     () => clearFieldError('error-new-password'));
  confirmInput.addEventListener('input', () => clearFieldError('error-confirm-password'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllPasswordErrors();

    const currentPassword = currentInput.value;
    const newPassword     = newInput.value;
    const confirmPassword = confirmInput.value;

    // Client-side validation
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
        // Backend validation failure — map known field errors, fallback to form-level
        const msg = body.message || 'Password could not be changed. Please try again.';

        if (res.status === 400 && msg.toLowerCase().includes('current')) {
          setFieldError('error-current-password', 'Current password is incorrect.');
        } else {
          setFieldError('error-password-form', msg);
        }
        return;
      }

      // Success — clear form and notify
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
// Profile photo section (Admin + PRC Staff only)
// ---------------------------------------------------------------------------

export function initProfilePhotoForm() {
  const form        = document.getElementById('photo-form');
  const fileInput   = document.getElementById('profile-img-input');
  const preview     = document.getElementById('photo-preview');
  const previewWrap = document.getElementById('photo-preview-wrap');
  const submitBtn   = document.getElementById('btn-upload-photo');
  const errorEl     = document.getElementById('error-photo-form');

  if (!form) return;

  // Show preview when file is selected
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

    // Only show image preview for image types (not PDF)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        preview.src = ev.target.result;
        previewWrap.classList.remove('photo-preview-hidden');
      };
      reader.readAsDataURL(file);
    } else {
      // PDF — just show filename instead of image preview
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
      const { res, body } = await updateProfilePhoto(file);

      if (!res.ok || !body.success) {
        const msg = res.status === 500
          ? 'An unexpected error occurred. Please try again or contact support if the problem persists.'
          : (body.message || 'Photo could not be uploaded. Please try again.');
        errorEl.textContent = msg;
        errorEl.classList.remove('field-error-hidden');
        return;
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