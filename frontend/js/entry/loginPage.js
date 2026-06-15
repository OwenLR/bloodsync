/**
 * loginPage.js — Entry file for index.html (login page).
 *
 * Responsibilities:
 * - Redirect already-authenticated users to their dashboard
 * - Handle login form submission
 * - Display errors via the login-error element
 *
 * Path: frontend/js/entry/loginPage.js
 */

import { login, getCurrentUser, redirectByRole } from '../core/auth.js';
import { showError, clearFeedback }              from '../components/feedback.js';

const ERROR_ID = 'login-error';

async function init() {
  // If already logged in, skip the login page entirely
  const user = await getCurrentUser();
  if (user) {
    redirectByRole(user.role_id);
    return;
  }

  document.getElementById('btn-login')
    .addEventListener('click', handleLogin);

  // Allow Enter key to submit
  document.getElementById('input-password')
    .addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
}

async function handleLogin() {
  const email    = document.getElementById('input-email').value.trim();
  const password = document.getElementById('input-password').value;
  const btn      = document.getElementById('btn-login');

  clearFeedback(ERROR_ID);

  if (!email || !password) {
    showError(ERROR_ID, 'Email and password are required.');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Signing in…';

  try {
    const user = await login(email, password);
    redirectByRole(user.role_id);
  } catch (err) {
    showError(ERROR_ID, err.message || 'Sign in failed. Check your credentials.');
    btn.disabled    = false;
    btn.textContent = 'Sign in';
  }
}

init();