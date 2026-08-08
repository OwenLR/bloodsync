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

// Order of steps as they appear in the ticket-stepper header — used to
// derive "active" (current) vs "complete" (already passed) state for each
// .ticket-step. Purely presentational; does not affect wizard logic.
const STEP_ORDER = ['step-selection', 'step-fulfillment', 'step-submit'];

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.REQUESTOR])) return;

  renderNavbar(user, 0);
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
  revealAppShell();

  refreshBadge(); // non-blocking, immediately after revealAppShell per Permanent Rules

  // Mobile bottom-sheet toggle for the requisition stub. Guarded with a
  // null check since #stub-peek-handle only renders/matters below the
  // 768px breakpoint — harmless no-op on desktop.
  const stubHandle = document.getElementById('stub-peek-handle');
  if (stubHandle) {
    stubHandle.addEventListener('click', () => {
      const stub = document.getElementById('requisition-stub');
      const expanded = stub.classList.toggle('stub-expanded');
      stubHandle.setAttribute('aria-expanded', String(expanded));
    });
  }

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
// (#step-selection, #step-fulfillment, #step-submit), then syncs the
// ticket-stepper header to match.
function showStep(stepId) {
  document.querySelectorAll('.request-step').forEach((el) => {
    el.style.display = el.id === stepId ? '' : 'none';
  });
  updateStepper(stepId);
}

// Marks the current step's .ticket-step as active and any earlier ones as
// complete, based on STEP_ORDER position. Reads data-step-target off each
// .ticket-step element (set in submitRequest.html) rather than assuming
// DOM order matches STEP_ORDER.
function updateStepper(stepId) {
  const currentIndex = STEP_ORDER.indexOf(stepId);
  document.querySelectorAll('.ticket-step').forEach((el) => {
    const idx = STEP_ORDER.indexOf(el.dataset.stepTarget);
    el.classList.toggle('ticket-step--active', idx === currentIndex);
    el.classList.toggle('ticket-step--complete', idx < currentIndex);
  });
}

init();