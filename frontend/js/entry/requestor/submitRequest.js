import { requireAuth }         from '../../core/guards/authGuard.js';
import { requireRole }         from '../../core/guards/roleGuard.js';
import { renderNavbar }        from '../../layouts/navbar.js';
import { renderSidebar }       from '../../layouts/sidebar.js';
import { revealAppShell }      from '../../layouts/appShell.js';
import { getSidebarItems }     from '../../constants/sidebarItems.js';
import { ROLES }               from '../../constants/roles.js';
import { refreshBadge }        from '../../features/notifications/notificationsUI.js';
import { initSelectionStep }   from '../../features/bloodRequests/bloodRequestSelectionUI.js';
import { initFulfillmentStep } from '../../features/bloodRequests/bloodRequestFulfillmentUI.js';
import { initSubmitStep }      from '../../features/bloodRequests/bloodRequestSubmitUI.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.REQUESTOR])) return;

  renderNavbar(user, 0);
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
  revealAppShell();

  refreshBadge(); // non-blocking, immediately after revealAppShell per Permanent Rules

  showStep('step-selection');

  initSelectionStep((items) => {
    showStep('step-fulfillment');

    initFulfillmentStep(
      items,
      (items, branchId) => {
        showStep('step-submit');
        initSubmitStep(items, branchId, () => showStep('step-fulfillment'));
      },
      () => showStep('step-selection')
    );
  });
}

// Toggles visibility across the three wizard sections in submitRequest.html
// (#step-selection, #step-fulfillment, #step-submit). Mirrors the showStep()
// pattern noted in the Blood Requests key learnings.
function showStep(stepId) {
  document.querySelectorAll('.request-step').forEach((el) => {
    el.style.display = el.id === stepId ? '' : 'none';
  });
}

init();