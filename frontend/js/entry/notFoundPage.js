/**
 * notFoundPage.js — Entry file for pages/404.html.
 *
 * Responsibilities:
 * - If the user is authenticated, update the "Back to login" button
 *   to point to their dashboard instead.
 *
 * Path: frontend/js/entry/notFoundPage.js
 */

import { getCurrentUser } from '../core/auth.js';
import { ROLES }          from '../constants/roles.js';
import { ROUTES }         from '../constants/routes.js';

async function init() {
  const user = await getCurrentUser();

  if (user) {
    const destinations = {
      [ROLES.ADMIN]:        ROUTES.ADMIN.DASHBOARD,
      [ROLES.PRC_STAFF]:    ROUTES.STAFF.DASHBOARD,
      [ROLES.VOLUNTEER]:    ROUTES.VOLUNTEER.DASHBOARD,
      [ROLES.PHLEBOTOMIST]: ROUTES.PHLEBOTOMIST.DASHBOARD,
      [ROLES.REQUESTOR]:    ROUTES.REQUESTOR.DASHBOARD,
    };

    const btn  = document.getElementById('btn-home');
    btn.href        = destinations[user.role_id] || ROUTES.LOGIN;
    btn.textContent = 'Go to dashboard';
  }
}

init();