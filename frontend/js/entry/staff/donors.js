import { requireAuth }       from '../../core/guards/authGuard.js';
import { requireRole }       from '../../core/guards/roleGuard.js';
import { renderNavbar }      from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }      from '../../layouts/sidebar.js';
import { revealAppShell }    from '../../layouts/appShell.js';
import { getSidebarItems }   from '../../constants/sidebarItems.js';
import { ROLES }             from '../../constants/roles.js';
import { initDonorsPage,
         initModalCloseButtons } from '../../features/donors/donorsUI.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.PRC_STAFF])) return;

  renderNavbar(user, 0);
  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'),    'General');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  revealAppShell();

  initModalCloseButtons();

  // Show Register button in create modal footer only when form step is active
  _wireCreateModalSubmitVisibility();

  await initDonorsPage(user);
}

function _wireCreateModalSubmitVisibility() {
  const registerNewBtn = document.getElementById('create-register-new-btn');
  const submitBtn      = document.getElementById('donor-create-submit');
  const backBtn        = document.getElementById('create-back-btn');

  if (registerNewBtn && submitBtn) {
    registerNewBtn.addEventListener('click', () => {
      submitBtn.style.display = '';
    });
  }

  if (backBtn && submitBtn) {
    backBtn.addEventListener('click', () => {
      submitBtn.style.display = 'none';
    });
  }
}

init();