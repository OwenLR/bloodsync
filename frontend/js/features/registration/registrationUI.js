/**
 * registrationUI.js — DOM + event handlers for Requestor registration.
 * Never calls apiFetch directly — goes through registrationApi.js.
 *
 * Success flow uses openModal() instead of an inline success message +
 * timed redirect — Requestor accounts are active immediately
 * (registerRequestor() uses userModel.createUser, not createPendingUser),
 * so the modal's copy reflects "ready now", not "pending review".
 *
 * The modal has a single action button, no cancel — closing it any other
 * way (X, backdrop, Escape) just leaves the form disabled behind it,
 * since modal.js has no close-callback hook to force navigation on every
 * dismiss path. See fieldRegistrationUI.js for the pending-approval variant.
 *
 * Path: frontend/js/features/registration/registrationUI.js
 */

import { registerRequestor }                    from './registrationApi.js';
import { validateRequestorForm, stripNonDigits } from './registrationValidation.js';
import { showError, clearFeedback }              from '../../components/feedback.js';
import { openModal }                             from '../../components/modal.js';
import { ROUTES }                                from '../../constants/routes.js';

const ERROR_ID = 'register-error';
const BTN_ID   = 'btn-register';

export function initRequestorRegisterForm() {
  const btn = document.getElementById(BTN_ID);
  if (!btn) return;

  btn.addEventListener('click', handleSubmit);

  document.getElementById('input-confirm-password')
    .addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSubmit();
    });
}

async function handleSubmit() {
  clearFeedback(ERROR_ID);

  const first_name      = document.getElementById('input-first-name').value.trim();
  const last_name       = document.getElementById('input-last-name').value.trim();
  const email           = document.getElementById('input-email').value.trim();
  const password        = document.getElementById('input-password').value;
  const confirmPassword = document.getElementById('input-confirm-password').value;
  const contact         = stripNonDigits(document.getElementById('input-contact').value);

  const formData = {
    first_name,
    last_name,
    email,
    password,
    ...(contact ? { contact } : {}),
  };

  const errors = validateRequestorForm(formData, confirmPassword);
  if (errors.length > 0) {
    showError(ERROR_ID, errors[0]);
    return;
  }

  const btn = document.getElementById(BTN_ID);
  btn.disabled    = true;
  btn.textContent = 'Creating account…';

  try {
    await registerRequestor(formData);
    showSuccessModal();
  } catch (err) {
    showError(ERROR_ID, err.message || 'Registration failed. Please try again.');
    btn.disabled    = false;
    btn.textContent = 'Create account';
  }
}

function showSuccessModal() {
  const body       = document.createElement('p');
  body.textContent =
    'Your account has been created successfully. You can sign in now.';

  openModal('Registration Complete', body, [
    {
      label:     'Go to Sign In',
      className: 'btn-primary',
      onClick:   () => { window.location.href = ROUTES.LOGIN; },
    },
  ]);
}