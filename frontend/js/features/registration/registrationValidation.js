/**
 * registrationValidation.js — Client-side validation for Requestor
 * self-registration. Mirrors backend's validateRequestorRegistration
 * in registrationValidator.js — keep both in sync if rules change.
 *
 * confirmPassword is validated here only — it is never part of the
 * payload sent to the backend (registrationValidator.js has no such field).
 *
 * No API calls, no DOM — pure functions only.
 *
 * Path: frontend/js/features/registration/registrationValidation.js
 */

export function validateRequestorForm(data, confirmPassword) {
  const errors = [];
  const { first_name, last_name, email, password, contact } = data;

  if (!first_name || first_name.trim() === '') errors.push('First name is required.');
  if (!last_name || last_name.trim() === '')   errors.push('Last name is required.');

  if (!email || email.trim() === '') {
    errors.push('Email is required.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Enter a valid email address.');
  }

  if (!password) {
    errors.push('Password is required.');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters.');
  }

  // Client-side only — never sent to the backend
  if (password && password !== confirmPassword) {
    errors.push('Passwords do not match.');
  }

  if (contact && !/^\d{7,15}$/.test(contact)) {
    errors.push('Contact number must be 7 to 15 digits.');
  }

  return errors;
}

// Per contract.md's Validation Rules: contact must be digits only,
// 7–15 digits — strip non-digits before sending.
export function stripNonDigits(value) {
  return (value || '').replace(/\D/g, '');
}