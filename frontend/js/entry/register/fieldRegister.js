/**
 * fieldRegister.js — Entry file for pages/register/fieldRole.html.
 * Public page, same pre-auth pattern as requestorRegister.js.
 *
 * Path: frontend/js/entry/register/fieldRegister.js
 */

import { getCurrentUserSilent, redirectByRole } from '../../core/auth.js';
import { initFieldRegisterForm }                from '../../features/registration/fieldRegistrationUI.js';

async function init() {
  const user = await getCurrentUserSilent();
  if (user) {
    redirectByRole(user.role_id);
    return;
  }

  initFieldRegisterForm();
}

init();