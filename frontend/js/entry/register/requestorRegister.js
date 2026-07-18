/**
 * requestorRegister.js — Entry file for pages/register/requestor.html.
 *
 * Public page — no requireAuth()/requireRole() guard, since this page IS
 * the pre-auth flow. Uses getCurrentUserSilent(), same rationale as
 * loginPage.js: raw fetch, no refresh attempt, no redirect-loop risk.
 *
 * Path: frontend/js/entry/register/requestorRegister.js
 */

import { getCurrentUserSilent, redirectByRole } from '../../core/auth.js';
import { initRequestorRegisterForm }            from '../../features/registration/registrationUI.js';

async function init() {
  const user = await getCurrentUserSilent();
  if (user) {
    redirectByRole(user.role_id);
    return;
  }

  initRequestorRegisterForm();
}

init();